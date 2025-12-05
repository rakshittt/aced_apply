/**
 * Fit Map Analyzer
 * Combines deterministic rules with AI-assisted analysis
 * PRD: "deterministic heuristics precede model calls"
 */

import { generateStructuredOutput } from '../openai';
import { FitMapEnhancementSchema, type FitMapEnhancement } from '../openai/schemas';
import {
  findOverlaps,
  findGaps,
  findUnderEvidenced,
  calculateFit,
  needsLLMAssistance,
} from '../rules/fit-map-rules';
import type { ParsedJD, ParsedResume, FitLevel } from '@/types';
import prisma from '../db/prisma';

export interface FitMapResult {
  runId: string;
  overallFit: FitLevel;
  confidence: number;
  overlap: any[];
  underEvidenced: any[];
  gaps: any[];
}

/**
 * Analyze fit between JD and resume
 * CRITICAL: Uses deterministic rules first, then AI if needed
 */
export async function analyzeFitMap(
  runId: string,
  jd: ParsedJD,
  resume: ParsedResume
): Promise<FitMapResult> {
  const startTime = Date.now();

  // STEP 1: Deterministic analysis using rules
  console.log('[FitMap] Running deterministic analysis...');

  const overlaps = findOverlaps(jd.rawText, resume.rawText);
  const gaps = findGaps(jd.rawText, resume.rawText);
  const underEvidenced = findUnderEvidenced(
    resume.rawText,
    resume.bullets.map(b => b.text)
  );

  // STEP 2: Calculate initial fit using rules
  const initialFit = calculateFit(overlaps, gaps);

  console.log('[FitMap] Initial deterministic result:', {
    overlaps: overlaps.length,
    gaps: gaps.length,
    underEvidenced: underEvidenced.length,
    fit: initialFit.level,
  });

  // STEP 3: Check if we need LLM assistance
  let finalOverlaps = overlaps;
  let finalGaps = gaps;
  let finalUnderEvidenced = underEvidenced;
  let finalFit = initialFit;

  if (needsLLMAssistance(overlaps, gaps)) {
    console.log('[FitMap] Ambiguous case detected, using LLM assistance...');

    try {
      const enhancement = await generateStructuredOutput<FitMapEnhancement>({
        prompt: buildFitMapPrompt(overlaps, gaps, underEvidenced),
        schema: FitMapEnhancementSchema,
        schemaName: 'FitMapEnhancement',
        context: {
          jd: jd.rawText,
          resume: resume.rawText,
        },
      });

      // Merge LLM results with deterministic results
      finalOverlaps = [...overlaps, ...enhancement.data.additionalOverlaps];
      finalGaps = [...gaps, ...enhancement.data.additionalGaps];
      finalUnderEvidenced = [...underEvidenced, ...enhancement.data.underEvidenced];

      // Recalculate fit with enhanced data
      finalFit = calculateFit(finalOverlaps, finalGaps);

      console.log('[FitMap] LLM enhancement added:', {
        additionalOverlaps: enhancement.data.additionalOverlaps.length,
        additionalGaps: enhancement.data.additionalGaps.length,
      });
    } catch (error) {
      console.error('[FitMap] LLM enhancement failed, using deterministic results:', error);
      // Fall back to deterministic results
    }
  }

  // STEP 4: Save to database
  const fitMap = await prisma.fitMap.create({
    data: {
      jobRunId: runId,
      overallFit: finalFit.level,
      confidence: finalFit.confidence,
      overlap: finalOverlaps as any,
      underEvidenced: finalUnderEvidenced as any,
      gaps: finalGaps as any,
    },
  });

  const duration = Date.now() - startTime;
  console.log(`[FitMap] Analysis completed in ${duration}ms`);

  return {
    runId,
    overallFit: finalFit.level,
    confidence: finalFit.confidence,
    overlap: finalOverlaps,
    underEvidenced: finalUnderEvidenced,
    gaps: finalGaps,
  };
}

/**
 * Build prompt for LLM-assisted fit analysis
 */
function buildFitMapPrompt(
  initialOverlaps: any[],
  initialGaps: any[],
  initialUnderEvidenced: any[]
): string {
  return `You are analyzing the fit between a job description and a candidate's resume.

Our deterministic analysis found:
- ${initialOverlaps.length} clear skill overlaps
- ${initialGaps.length} potential gaps
- ${initialUnderEvidenced.length} under-evidenced skills

Your task is to enhance this analysis by finding:
1. Additional skill overlaps that our keyword matching may have missed (e.g., "backend development" matches "server-side programming")
2. **Semantic Matches**: Skills implied by other skills (e.g., "React" implies "JavaScript", "Spring Boot" implies "Java"). List these explicitly.
3. Additional gaps where the JD requires skills not clearly demonstrated in the resume
4. Skills that are mentioned in the resume but lack concrete evidence (metrics, specific projects, etc.)

CRITICAL REQUIREMENTS:
- Only add items with clear evidence - cite specific text spans from both JD and resume
- Be conservative with confidence scores - only use high confidence when evidence is unambiguous
- Focus on substantive skills and qualifications, not superficial keyword matches
- For gaps, consider whether alternative experience might fill the requirement
- For semantic matches, explicitly state what skill implies the match

Additionally, provide the following assessments:
7. "hiringManagerMemo": Write a brutal, honest internal memo from the hiring manager to the recruiter. Explain why they should or should not interview this candidate. Be specific about doubts.
8. "levelAssessment": Determine if the candidate is "MATCH", "UNDER_LEVEL", or "OVER_LEVEL" based on years of experience and scope of past roles vs the JD requirements.
9. "dealBreakers": Identify any specific "knock-out" criteria in the JD that the candidate explicitly fails (e.g., "Must have TS/SCI clearance", "Must be located in SF", "Must have PhD"). If none, return empty array.

Return structured JSON with your enhancements.`;
}
