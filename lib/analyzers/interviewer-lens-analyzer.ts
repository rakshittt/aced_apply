/**
 * Interviewer Lens Analyzer
 * Shows what interviewers will measure + company behavior cues
 * PRD: "inferred only from JD"
 */

import { generateStructuredOutput } from '../openai';
import { InterviewerLensResponseSchema, type InterviewerLensResponse } from '../openai/schemas';
import type { ParsedJD } from '@/types';
import prisma from '../db/prisma';

export interface InterviewerLensResult {
  runId: string;
  competencies: any[];
  likelyFormats: any[];
  behaviorCues: any[];
}

/**
 * Analyze what interviewers will measure and company behavior
 */
export async function analyzeInterviewerLens(
  runId: string,
  jd: ParsedJD
): Promise<InterviewerLensResult> {
  const startTime = Date.now();

  console.log('[InterviewerLens] Analyzing interview expectations...');

  const response = await generateStructuredOutput<InterviewerLensResponse>({
    prompt: buildInterviewerLensPrompt(jd),
    schema: InterviewerLensResponseSchema,
    schemaName: 'InterviewerLensResponse',
    context: {
      jd: jd.rawText,
      resume: '', // Not needed for this analysis
    },
  });

  // Save to database
  const lens = await prisma.interviewerLens.create({
    data: {
      jobRunId: runId,
      competencies: response.data.competencies,
      likelyFormats: response.data.likelyFormats,
      behaviorCues: response.data.behaviorCues,
    },
  });

  const duration = Date.now() - startTime;
  console.log(`[InterviewerLens] Analysis completed in ${duration}ms`);

  return {
    runId,
    competencies: response.data.competencies,
    likelyFormats: response.data.likelyFormats,
    behaviorCues: response.data.behaviorCues,
  };
}

/**
 * Build prompt for Interviewer Lens
 */
function buildInterviewerLensPrompt(jd: ParsedJD): string {
  return `You are analyzing what interviewers will measure for this role, based ONLY on the job description.

CRITICAL: All analysis must be derived from the JD text. Do NOT make assumptions based on general industry knowledge.

TASK 1: COMPETENCIES (4-6 items)
Identify what interviewers will evaluate. For each competency:
- Name: e.g., "System Design", "Coding Skills", "Technical Communication"
- Description: What aspect they're measuring
- What good looks like: Specific signals they'll look for

TASK 2: LIKELY INTERVIEW FORMATS (2-4 items)
Based on the role level and requirements, predict interview stages:
- Stage: e.g., "Technical Screen", "System Design", "Behavioral"
- Format: e.g., "Live coding", "Architecture discussion", "STAR questions"
- Duration: Approximate time if inferable

TASK 3: COMPANY BEHAVIOR CUES (2-5 items)
Detect company culture signals from JD language. For each cue:
- Cue: e.g., "Ownership mindset", "Regulated environment", "On-call expectation"
- JD phrases: Array of exact phrases that imply this (CRITICAL - must cite text!)
- Implication: What this means for the candidate

EXAMPLES OF BEHAVIOR CUES:
- "take ownership", "drive initiatives" → Ownership mindset
- "regulated industry", "SOX compliance" → Regulated environment
- "on-call rotation", "24/7 support" → On-call work expected
- "fast-paced", "move quickly" → High-pressure environment
- "cross-functional", "collaborate with" → Collaborative culture
- "independent", "self-directed" → Autonomous work style

Return structured JSON matching the schema.`;
}
