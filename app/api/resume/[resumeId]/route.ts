/**
 * PATCH /api/resume/[resumeId]
 * Set a resume as the user's default resume
 *
 * DELETE /api/resume/[resumeId]
 * Delete a resume (with ownership verification)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth/helpers';
import { deleteFile } from '@/lib/s3';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ resumeId: string }> }
) {
  try {
    // Authenticate user
    const user = await getAuthenticatedUser();
    const { resumeId } = await params;

    // Verify ownership
    const resume = await prisma.resume.findFirst({
      where: {
        id: resumeId,
        userId: user.id,
      },
    });

    if (!resume) {
      return NextResponse.json(
        { error: 'Resume not found or access denied' },
        { status: 404 }
      );
    }

    // Set this resume as default using transaction
    await prisma.$transaction(async (tx) => {
      // Unset all other default resumes for this user
      await tx.resume.updateMany({
        where: {
          userId: user.id,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });

      // Set this resume as default
      await tx.resume.update({
        where: { id: resumeId },
        data: { isDefault: true },
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Resume set as default',
      resumeId,
    });
  } catch (error) {
    console.error('[Resume] PATCH error:', error);

    // Handle authentication errors
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to update resume' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ resumeId: string }> }
) {
  try {
    // Authenticate user
    const user = await getAuthenticatedUser();
    const { resumeId } = await params;

    // Verify ownership
    const resume = await prisma.resume.findFirst({
      where: {
        id: resumeId,
        userId: user.id,
      },
    });

    if (!resume) {
      return NextResponse.json(
        { error: 'Resume not found or access denied' },
        { status: 404 }
      );
    }

    // Check if this resume is being used in any job runs
    const jobRunsCount = await prisma.jobRun.count({
      where: { resumeId },
    });

    // Delete from S3
    try {
      await deleteFile(resume.s3Key);
      console.log('[Resume] Deleted from S3:', resume.s3Key);
    } catch (s3Error) {
      console.error('[Resume] Failed to delete from S3:', s3Error);
      // Continue with database deletion even if S3 fails
    }

    // Delete from database
    await prisma.resume.delete({
      where: { id: resumeId },
    });

    return NextResponse.json({
      success: true,
      message: 'Resume deleted successfully',
      resumeId,
      hadJobRuns: jobRunsCount > 0,
    });
  } catch (error) {
    console.error('[Resume] DELETE error:', error);

    // Handle authentication errors
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    // Handle foreign key constraint errors
    if (error instanceof Error && error.message.includes('foreign key')) {
      return NextResponse.json(
        {
          error:
            'Cannot delete resume as it is being used in job analyses. Please delete the associated analyses first.',
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete resume' },
      { status: 500 }
    );
  }
}
