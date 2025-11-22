/**
 * POST /api/analyze
 * Main analysis endpoint - orchestrates all analyzers
 * Target: TTFI ≤ 60s, Full run ≤ 180s
 */

import { NextRequest, NextResponse } from 'next/server';
import { parseJobDescription } from '@/lib/parsers';
import { prisma } from '@/lib/db';
import {
  analyzeFitMap,
  analyzeChangeAdvisor,
  analyzeInterviewerLens,
  generatePrepKit,
} from '@/lib/analyzers';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { jdUrl, jdText, resumeId } = body;

    if (!resumeId) {
      return NextResponse.json(
        { error: 'Resume ID is required' },
        { status: 400 }
      );
    }

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
    const jd = await prisma.jobDescription.create({
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

    // Get resume from database
    const resume = await prisma.resume.findUnique({
      where: { id: resumeId },
    });

    if (!resume) {
      return NextResponse.json(
        { error: 'Resume not found' },
        { status: 404 }
      );
    }

    // Create job run
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30-day retention

    const jobRun = await prisma.jobRun.create({
      data: {
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
    const [changeAdvisorResult, lensResult] = await Promise.allSettled([
      analyzeChangeAdvisor(jobRun.id, parsedJD, resumeData, fitMapResult.gaps),
      analyzeInterviewerLens(jobRun.id, parsedJD),
    ]);

    // Priority 3: Prep Kit (depends on fit map & lens)
    let prepKitResult;
    if (lensResult.status === 'fulfilled') {
      prepKitResult = await generatePrepKit(
        jobRun.id,
        parsedJD,
        fitMapResult.gaps,
        lensResult.value.behaviorCues
      );
    }

    // Update job run with completion status
    const totalDuration = Date.now() - startTime;
    await prisma.jobRun.update({
      where: { id: jobRun.id },
      data: {
        status: 'COMPLETED',
        ttfi,
        totalDuration,
      },
    });

    console.log(`[Analyze] Full run completed in ${totalDuration}ms (target: ≤180000ms)`);

    return NextResponse.json({
      success: true,
      runId: jobRun.id,
      status: 'COMPLETED',
      ttfi,
      totalDuration,
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
    return NextResponse.json(
      {
        error: 'Analysis failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
