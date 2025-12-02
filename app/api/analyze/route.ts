/**
 * POST /api/analyze
 * Main analysis endpoint - orchestrates all analyzers
 * Target: TTFI ≤ 60s, Full run ≤ 180s
 */

import { NextRequest, NextResponse } from 'next/server';
import { parseJobDescription } from '@/lib/parsers';
import prisma from '@/lib/db/prisma';
import type { PrismaClient as GeneratedPrismaClient } from '.prisma/client';
import {
  analyzeFitMap,
  analyzeChangeAdvisor,
  analyzeInterviewerLens,
  generatePrepKit,
} from '@/lib/analyzers';
import { analyzeCompanyResearch } from '@/lib/analyzers/company-research-analyzer';
import {
  getAuthenticatedUser,
  checkUsageLimit,
  incrementUsageCount,
  UsageLimitError,
} from '@/lib/auth/helpers';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const db = prisma as GeneratedPrismaClient;

  try {
    // Authenticate user
    const user = await getAuthenticatedUser();

    // Check usage limits
    const usageCheck = await checkUsageLimit(user.id);
    if (!usageCheck.allowed) {
      throw new UsageLimitError(
        `You have reached your monthly limit of ${usageCheck.limit} analyses. Please upgrade your plan to continue.`,
        usageCheck.limit,
        usageCheck.plan
      );
    }

    const body = await request.json();
    const { jdUrl, jdText, resumeId: providedResumeId } = body;

    if (!jdUrl && !jdText) {
      return NextResponse.json(
        { error: 'Either jdUrl or jdText is required' },
        { status: 400 }
      );
    }

    // Step 1: Parse JD
    console.log('[Analyze] Parsing job description...');
    const parsedJD = await parseJobDescription({ url: jdUrl, text: jdText });

    // Save JD to database
    const jd = await db.jobDescription.create({
      data: {
        rawText: parsedJD.rawText,
        title: parsedJD.title,
        company: parsedJD.company,
        location: parsedJD.location,
        requirements: parsedJD.requirements,
        responsibilities: parsedJD.responsibilities,
        qualifications: parsedJD.qualifications,
        keywords: parsedJD.keywords,
        behaviorCues: parsedJD.behaviorCues as any,
      },
    });

    // Step 1.5: Analyze company research (runs in parallel with resume fetch)
    console.log('[Analyze] Analyzing company context & recruiter priorities...');
    const companyResearchPromise = analyzeCompanyResearch({ jdText: parsedJD.rawText });

    // Step 2: Get resume - either provided ID or user's default resume
    let resume;
    if (providedResumeId) {
      // Verify ownership if resumeId provided
      resume = await db.resume.findFirst({
        where: {
          id: providedResumeId,
          userId: user.id, // Ownership verification
        },
      });

      if (!resume) {
        return NextResponse.json(
          { error: 'Resume not found or access denied' },
          { status: 404 }
        );
      }
      console.log('[Analyze] Using provided resume:', providedResumeId);
    } else {
      // Use user's default resume
      resume = await db.resume.findFirst({
        where: {
          userId: user.id,
          isDefault: true,
        },
      });

      if (!resume) {
        return NextResponse.json(
          { error: 'No default resume found. Please upload a resume first.' },
          { status: 400 }
        );
      }
      console.log('[Analyze] Using default resume:', resume.id);
    }

    // Create job run
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30-day retention

    const jobRun = await db.jobRun.create({
      data: {
        userId: user.id,
        jdId: jd.id,
        resumeId: resume.id,
        jdUrl: jdUrl || null,
        jdText: parsedJD.rawText,
        resumeS3Key: resume.s3Key,
        resumeText: resume.rawText,
        expiresAt,
        status: 'PROCESSING',
      },
    });

    // Await company research and store results
    const companyResearchResult = await companyResearchPromise;

    const companyInfo = companyResearchResult.companyInfo;
    const recruiterPriorities = companyResearchResult.recruiterPriorities;

    await Promise.all([
      db.companyResearch.create({
        data: {
          jdId: jd.id,
          companyName: companyInfo.companyName ?? null,
          companySize: companyInfo.companySize ?? 'UNKNOWN',
          industry: companyInfo.industry ?? 'Unknown',
          techStack: companyInfo.techStack ?? [],
          cultureSignals: (companyInfo.cultureSignals as any) ?? [],
          seniority: companyInfo.seniority ?? 'UNKNOWN',
          reasoning: companyInfo.reasoning ?? 'No reasoning provided',
        },
      }),
      db.recruiterPriority.create({
        data: {
          jdId: jd.id,
          requirements: (recruiterPriorities.requirements as any) ?? [],
          mustHaveKeywords: recruiterPriorities.mustHaveKeywords ?? [],
          niceToHaveKeywords: recruiterPriorities.niceToHaveKeywords ?? [],
          overallStrategy: recruiterPriorities.overallStrategy ?? 'No strategy extracted',
        },
      }),
    ]);

    console.log('[Analyze] Company research complete');

    // Step 2: Run analyzers in parallel (for TTFI optimization)
    console.log('[Analyze] Running parallel analysis...');

    // Prepare resume data
    const resumeData = {
      rawText: resume.rawText,
      sections: resume.sections as any,
      bullets: resume.bullets as any,
    };

    // Priority 1: Fit Map (needed for TTFI)
    const fitMapPromise = analyzeFitMap(jobRun.id, parsedJD, resumeData);

    // Priority 2: Change Advisor & Interviewer Lens (parallel)
    const fitMapResult = await fitMapPromise;
    const ttfi = Date.now() - startTime;

    console.log(`[Analyze] TTFI: ${ttfi}ms (target: ≤60000ms)`);

    // Continue with remaining analyzers
    console.log('[Analyze] Running Change Advisor and Interview Lens in parallel...');
    const [changeAdvisorResult, lensResult] = await Promise.allSettled([
      analyzeChangeAdvisor(jobRun.id, parsedJD, resumeData, fitMapResult.gaps),
      analyzeInterviewerLens(jobRun.id, parsedJD, {
        companySize: companyResearchResult.companyInfo.companySize,
        industry: companyResearchResult.companyInfo.industry,
        seniority: companyResearchResult.companyInfo.seniority,
        cultureSignals: companyResearchResult.companyInfo.cultureSignals,
      }),
    ]);

    // Check Change Advisor result
    if (changeAdvisorResult.status === 'rejected') {
      console.error('[Analyze] Change Advisor failed:', changeAdvisorResult.reason);
    } else {
      console.log('[Analyze] Change Advisor completed successfully');
    }

    // Check Interview Lens result
    if (lensResult.status === 'rejected') {
      console.error('[Analyze] Interview Lens failed:', lensResult.reason);
    } else {
      console.log('[Analyze] Interview Lens completed successfully');
    }

    // Priority 3: Prep Kit (depends on fit map & lens)
    console.log('[Analyze] Running Prep Kit...');
    let prepKitResult;
    let prepKitSuccess = false;
    try {
      // Use behavior cues from lens if available, otherwise use empty array as fallback
      const behaviorCues = lensResult.status === 'fulfilled'
        ? lensResult.value.behaviorCues
        : [];

      if (lensResult.status === 'rejected') {
        console.warn('[Analyze] Running Prep Kit with empty behavior cues (lens failed)');
      }

      prepKitResult = await generatePrepKit(
        jobRun.id,
        parsedJD,
        fitMapResult.gaps,
        behaviorCues
      );
      prepKitSuccess = true;
      console.log('[Analyze] Prep Kit completed successfully');
    } catch (error) {
      console.error('[Analyze] Prep Kit failed:', error);
      prepKitSuccess = false;
    }

    // Track which analyzers succeeded
    const analyzersCompleted = {
      fitMap: true, // Always succeeds or throws (handled by outer try/catch)
      companyResearch: true, // Already awaited earlier
      changeAdvisor: changeAdvisorResult.status === 'fulfilled',
      interviewerLens: lensResult.status === 'fulfilled',
      prepKit: prepKitSuccess,
    };

    const allSucceeded = Object.values(analyzersCompleted).every(v => v === true);
    const finalStatus = allSucceeded ? 'COMPLETED' : 'COMPLETED'; // Keep as COMPLETED for now, but we know which failed

    // Log completion summary
    console.log('[Analyze] Completion Summary:', {
      status: finalStatus,
      analyzers: analyzersCompleted,
      allSucceeded,
    });

    // Update job run with completion status
    const totalDuration = Date.now() - startTime;
    await db.jobRun.update({
      where: { id: jobRun.id },
      data: {
        status: finalStatus,
        ttfi,
        totalDuration,
      },
    });

    // Increment user's usage count after successful analysis
    await incrementUsageCount(user.id);

    console.log(`[Analyze] Full run completed in ${totalDuration}ms (target: ≤180000ms)`);

    return NextResponse.json({
      success: true,
      runId: jobRun.id,
      status: finalStatus,
      ttfi,
      totalDuration,
      analyzers: analyzersCompleted, // Include analyzer status in response
      metrics: {
        ttfiTarget: 60000,
        ttfiActual: ttfi,
        ttfiMet: ttfi <= 60000,
        fullRunTarget: 180000,
        fullRunActual: totalDuration,
        fullRunMet: totalDuration <= 180000,
      },
    });
  } catch (error) {
    console.error('[Analyze] Error:', error);

    // Handle authentication errors
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    // Handle usage limit errors
    if (error instanceof UsageLimitError) {
      return NextResponse.json(
        {
          error: 'Usage limit reached',
          message: error.message,
          limit: error.limit,
          plan: error.plan,
        },
        { status: 429 } // Too Many Requests
      );
    }

    return NextResponse.json(
      {
        error: 'Analysis failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
