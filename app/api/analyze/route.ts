/**
 * POST /api/analyze
 * Main analysis endpoint - orchestrates all analyzers with Streaming Response
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

// Helper to send SSE events
const sendEvent = (controller: ReadableStreamDefaultController, event: string, data: any) => {
  const encoder = new TextEncoder();
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  controller.enqueue(encoder.encode(payload));
};

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const db = prisma as GeneratedPrismaClient;

  // Authenticate user first (blocking)
  let user;
  try {
    user = await getAuthenticatedUser();
    const usageCheck = await checkUsageLimit(user.id);
    if (!usageCheck.allowed) {
      throw new UsageLimitError(
        `You have reached your monthly limit of ${usageCheck.limit} analyses.`,
        usageCheck.limit,
        usageCheck.plan
      );
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof UsageLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }

  // Parse body (blocking)
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { jdUrl, jdText, resumeId: providedResumeId } = body;

  if (!jdUrl && !jdText) {
    return NextResponse.json({ error: 'Either jdUrl or jdText is required' }, { status: 400 });
  }

  // Create a TransformStream for the response
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  // Start processing in background
  (async () => {
    // Helper to write to stream
    const write = (event: string, data: any) => {
      const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      writer.write(encoder.encode(payload));
    };

    try {

      write('START', { message: 'Starting analysis...' });

      // Step 1: Parse JD
      write('LOG', { message: 'Parsing job description...' });
      const parsedJD = await parseJobDescription({ url: jdUrl, text: jdText });

      write('JD_PARSED', {
        title: parsedJD.title,
        company: parsedJD.company,
        requirementsCount: parsedJD.requirements.length
      });

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

      // Step 1.5: Analyze company research (parallel start)
      write('LOG', { message: 'Researching company context...' });
      const companyResearchPromise = analyzeCompanyResearch({ jdText: parsedJD.rawText });

      // Step 2: Get resume
      write('LOG', { message: 'Fetching resume...' });
      let resume;
      if (providedResumeId) {
        resume = await db.resume.findFirst({
          where: { id: providedResumeId, userId: user.id },
        });
      } else {
        resume = await db.resume.findFirst({
          where: { userId: user.id, isDefault: true },
        });
      }

      if (!resume) {
        write('ERROR', { message: 'Resume not found' });
        await writer.close();
        return;
      }

      // Create job run
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

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

      write('RUN_CREATED', { runId: jobRun.id });

      // Await company research
      const companyResearchResult = await companyResearchPromise;
      const companyInfo = companyResearchResult.companyInfo;
      const recruiterPriorities = companyResearchResult.recruiterPriorities;

      // Save company research
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

      write('COMPANY_RESEARCHED', {
        company: companyInfo.companyName,
        industry: companyInfo.industry
      });

      // Step 2: Run analyzers
      write('LOG', { message: 'Analyzing fit...' });

      const resumeData = {
        rawText: resume.rawText,
        sections: resume.sections as any,
        bullets: resume.bullets as any,
      };

      // Priority 1: Fit Map
      const fitMapResult = await analyzeFitMap(jobRun.id, parsedJD, resumeData);
      const ttfi = Date.now() - startTime;

      write('FIT_ANALYZED', {
        score: fitMapResult.overallFit,
        confidence: fitMapResult.confidence,
        ttfi
      });

      // Priority 2: Change Advisor & Interviewer Lens
      write('LOG', { message: 'Generating suggestions & interview prep...' });

      const [changeAdvisorResult, lensResult] = await Promise.allSettled([
        analyzeChangeAdvisor(jobRun.id, parsedJD, resumeData, fitMapResult.gaps),
        analyzeInterviewerLens(jobRun.id, parsedJD, {
          companySize: companyResearchResult.companyInfo.companySize,
          industry: companyResearchResult.companyInfo.industry,
          seniority: companyResearchResult.companyInfo.seniority,
          cultureSignals: companyResearchResult.companyInfo.cultureSignals,
        }),
      ]);

      if (changeAdvisorResult.status === 'fulfilled') {
        write('ADVISOR_READY', { count: changeAdvisorResult.value.suggestions.length });
      }

      // Priority 3: Prep Kit
      let behaviorCues = [];
      if (lensResult.status === 'fulfilled') {
        behaviorCues = lensResult.value.behaviorCues;
        write('LENS_READY', { competencies: lensResult.value.competencies.length });
      }

      write('LOG', { message: 'Creating 7-Day Prep Kit...' });
      await generatePrepKit(jobRun.id, parsedJD, fitMapResult.gaps, behaviorCues);

      write('PREP_READY', { days: 7 });

      // Finalize
      const totalDuration = Date.now() - startTime;
      await db.jobRun.update({
        where: { id: jobRun.id },
        data: {
          status: 'COMPLETED',
          ttfi,
          totalDuration,
        },
      });

      await incrementUsageCount(user.id);

      write('COMPLETE', {
        runId: jobRun.id,
        duration: totalDuration
      });

    } catch (error) {
      console.error('[Analyze Stream] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      write('ERROR', { message: errorMessage });
    } finally {
      await writer.close();
    }
  })();

  return new NextResponse(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
