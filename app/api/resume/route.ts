/**
 * GET /api/resume
 * Get all saved resumes for the authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth/helpers';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getAuthenticatedUser();

    // Fetch all resumes for this user
    const resumes = await prisma.resume.findMany({
      where: {
        userId: user.id,
      },
      select: {
        id: true,
        name: true,
        s3Key: true,
        uploadedAt: true,
        isDefault: true,
        rawText: true,
        sections: true,
      },
      orderBy: {
        uploadedAt: 'desc',
      },
    });

    // Get the default resume
    const defaultResume = resumes.find((r) => r.isDefault);

    return NextResponse.json({
      resumes: resumes.map((r) => ({
        id: r.id,
        name: r.name,
        s3Key: r.s3Key,
        uploadedAt: r.uploadedAt,
        isDefault: r.isDefault,
        // Include first 200 chars of rawText as preview
        preview: r.rawText.substring(0, 200) + '...',
        sections: r.sections,
      })),
      defaultResumeId: defaultResume?.id || null,
      count: resumes.length,
    });
  } catch (error) {
    console.error('[Resume] Error:', error);

    // Handle authentication errors
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to fetch resumes' },
      { status: 500 }
    );
  }
}
