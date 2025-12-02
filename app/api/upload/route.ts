/**
 * POST /api/upload
 * Upload resume file to S3 and return S3 key
 */

import { NextRequest, NextResponse } from 'next/server';
import { uploadResume } from '@/lib/s3';
import { parseResume } from '@/lib/parsers';
import { prisma } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth/helpers';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getAuthenticatedUser();

    const formData = await request.formData();
    const file = formData.get('resume') as File;
    const name = formData.get('name') as string | null; // Optional resume name

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are supported' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to S3
    console.log('[Upload] Uploading resume to S3...');
    const s3Result = await uploadResume(buffer, user.id);

    // Parse resume
    console.log('[Upload] Parsing resume...');
    const parsedResume = await parseResume(buffer);

    // Save to database with user ownership and default status
    // Use transaction to ensure atomicity
    const resume = await prisma.$transaction(async (tx) => {
      // Unset any existing default resume for this user
      await tx.resume.updateMany({
        where: {
          userId: user.id,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });

      // Create new resume as default
      return tx.resume.create({
        data: {
          userId: user.id,
          name: name || null, // Use provided name or null
          s3Key: s3Result.key,
          rawText: parsedResume.rawText,
          sections: parsedResume.sections as any,
          bullets: parsedResume.bullets as any,
          isDefault: true,
        },
      });
    });

    return NextResponse.json({
      success: true,
      resumeId: resume.id,
      s3Key: s3Result.key,
      message: 'Resume uploaded and parsed successfully',
    });
  } catch (error) {
    console.error('[Upload] Error:', error);

    // Handle authentication errors
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to upload resume' },
      { status: 500 }
    );
  }
}
