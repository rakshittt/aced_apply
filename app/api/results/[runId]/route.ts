/**
 * GET /api/results/[runId]
 * Get complete analysis results for a job run
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params;

    // Fetch job run with all relations
    const jobRun = await prisma.jobRun.findUnique({
      where: { id: runId },
      include: {
        jd: true,
        resume: true,
        fitMap: true,
        changeAdvisor: {
          include: {
            suggestions: true,
          },
        },
        lens: true,
        prepKit: {
          include: {
            days: {
              orderBy: {
                dayNumber: 'asc',
              },
            },
          },
        },
      },
    });

    if (!jobRun) {
      return NextResponse.json(
        { error: 'Job run not found' },
        { status: 404 }
      );
    }

    // Check if expired (30-day retention)
    if (new Date() > jobRun.expiresAt) {
      return NextResponse.json(
        { error: 'Results have expired (30-day retention)' },
        { status: 410 } // 410 Gone
      );
    }

    // Format response
    const response = {
      runId: jobRun.id,
      status: jobRun.status,
      createdAt: jobRun.createdAt,
      ttfi: jobRun.ttfi,
      totalDuration: jobRun.totalDuration,

      jd: {
        title: jobRun.jd.title,
        company: jobRun.jd.company,
        location: jobRun.jd.location,
      },

      fitMap: jobRun.fitMap
        ? {
            overallFit: jobRun.fitMap.overallFit,
            confidence: jobRun.fitMap.confidence,
            overlap: jobRun.fitMap.overlap,
            underEvidenced: jobRun.fitMap.underEvidenced,
            gaps: jobRun.fitMap.gaps,
          }
        : null,

      changeAdvisor: jobRun.changeAdvisor
        ? {
            suggestions: jobRun.changeAdvisor.suggestions.map((s) => ({
              id: s.id,
              targetSection: s.targetSection,
              currentBullet: s.currentBullet,
              suggestedBullet: s.suggestedBullet,
              reason: s.reason,
              requiredMetric: s.requiredMetric,
              evidenceToAttach: s.evidenceToAttach,
              keywordMirror: s.keywordMirror,
              confidence: s.confidence,
              jdSpans: s.jdSpans,
              resumeSpans: s.resumeSpans,
              status: s.status,
            })),
            atsWarnings: jobRun.changeAdvisor.atsWarnings,
          }
        : null,

      lens: jobRun.lens
        ? {
            competencies: jobRun.lens.competencies,
            likelyFormats: jobRun.lens.likelyFormats,
            behaviorCues: jobRun.lens.behaviorCues,
          }
        : null,

      prepKit: jobRun.prepKit
        ? {
            days: jobRun.prepKit.days.map((day) => ({
              dayNumber: day.dayNumber,
              gapRef: day.gapRef,
              companyBehaviorRef: day.companyBehaviorRef,
              inputs: day.inputs,
              practiceTask: day.practiceTask,
              rubric: day.rubric,
              expectedArtifact: day.expectedArtifact,
              timeboxMin: day.timeboxMin,
              completed: day.completed,
              completedAt: day.completedAt,
            })),
          }
        : null,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Results] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch results' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/results/[runId]
 * Self-serve data deletion
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params;

    // Delete job run (CASCADE will delete all related data)
    await prisma.jobRun.delete({
      where: { id: runId },
    });

    return NextResponse.json({
      success: true,
      message: 'Data deleted successfully',
    });
  } catch (error) {
    console.error('[Results] Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete data' },
      { status: 500 }
    );
  }
}
