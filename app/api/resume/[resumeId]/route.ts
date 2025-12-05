/**
 * /api/resume/[resumeId]
 * Get, Update, or Delete a specific resume
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth/helpers';
import { sectionsToText } from '@/lib/utils/resume-formatter';
import { extractBullets } from '@/lib/parsers/resume-parser';
import { ParsedResumeSections } from '@/types';

interface RouteParams {
  params: Promise<{
    resumeId: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { resumeId } = await params;
    const user = await getAuthenticatedUser();

    const resume = await prisma.resume.findUnique({
      where: {
        id: resumeId,
        userId: user.id,
      },
    });

    if (!resume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
    }

    return NextResponse.json(resume);
  } catch (error) {
    console.error('[Resume] Error:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch resume' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { resumeId } = await params;
    const user = await getAuthenticatedUser();
    const body = await request.json();
    const { sections, name } = body;

    // Verify ownership
    const existingResume = await prisma.resume.findUnique({
      where: {
        id: resumeId,
        userId: user.id,
      },
    });

    if (!existingResume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
    }

    const updateData: any = {};

    if (name) {
      updateData.name = name;
    }

    if (sections) {
      // 1. Update sections JSON
      updateData.sections = sections;

      // 2. Regenerate raw text
      const rawText = sectionsToText(sections as ParsedResumeSections);
      updateData.rawText = rawText;

      // 3. Regenerate bullets
      const bullets = extractBullets(sections as ParsedResumeSections);
      updateData.bullets = bullets as any; // Cast to any for Prisma Json[]
    }

    const updatedResume = await prisma.resume.update({
      where: {
        id: resumeId,
      },
      data: updateData,
    });

    return NextResponse.json(updatedResume);
  } catch (error) {
    console.error('[Resume Update] Error:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to update resume' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { resumeId } = await params;
    const user = await getAuthenticatedUser();

    // Verify ownership
    const existingResume = await prisma.resume.findUnique({
      where: {
        id: resumeId,
        userId: user.id,
      },
    });

    if (!existingResume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
    }

    await prisma.resume.delete({
      where: {
        id: resumeId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Resume Delete] Error:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to delete resume' }, { status: 500 });
  }
}
