/**
 * Zod Schemas for OpenAI Structured Outputs
 * Defines exact response formats for all analyzers
 */

import { z } from 'zod';

// ============================================================================
// Fit Map Schemas
// ============================================================================

export const JDSpanSchema = z.object({
  text: z.string(),
  start: z.number(),
  end: z.number(),
});

export const ResumeSpanSchema = z.object({
  text: z.string(),
  section: z.string(),
  index: z.number(),
});

export const OverlapItemSchema = z.object({
  skill: z.string(),
  jdSpan: JDSpanSchema,
  resumeSpan: ResumeSpanSchema,
  confidence: z.number().min(0).max(1),
});

export const UnderEvidencedItemSchema = z.object({
  skill: z.string(),
  resumeSpan: ResumeSpanSchema,
  reason: z.string(),
});

export const GapItemSchema = z.object({
  skill: z.string(),
  jdSpan: JDSpanSchema,
  severity: z.enum(['HIGH', 'MEDIUM', 'LOW']),
});

export const FitMapEnhancementSchema = z.object({
  additionalOverlaps: z.array(OverlapItemSchema),
  additionalGaps: z.array(GapItemSchema),
  underEvidenced: z.array(UnderEvidencedItemSchema),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

// ============================================================================
// Change Advisor Schemas
// ============================================================================

export const SuggestionSchema = z.object({
  targetSection: z.string(),
  currentBullet: z.string(),
  suggestedBullet: z.string().max(200), // ~28 words
  reason: z.string(),
  requiredMetric: z.string().optional(),
  evidenceToAttach: z.string().optional(),
  keywordMirror: z.boolean(),
  confidence: z.number().min(0).max(1),
  jdSpans: z.array(JDSpanSchema),
  resumeSpans: z.array(ResumeSpanSchema),
});

export const ATSWarningSchema = z.object({
  type: z.enum(['table', 'column', 'image', 'textbox', 'formatting', 'contrast']),
  severity: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  location: z.string(),
  description: z.string(),
});

export const ChangeAdvisorResponseSchema = z.object({
  suggestions: z.array(SuggestionSchema).min(6), // PRD requires ≥6
  atsWarnings: z.array(ATSWarningSchema),
});

// ============================================================================
// Interviewer Lens Schemas
// ============================================================================

export const CompetencySchema = z.object({
  name: z.string(),
  description: z.string(),
  whatGoodLooksLike: z.string(),
});

export const InterviewFormatSchema = z.object({
  stage: z.string(),
  format: z.string(),
  duration: z.string().optional(),
});

export const BehaviorCueSchema = z.object({
  cue: z.string(),
  jdPhrases: z.array(z.string()),
  implication: z.string(),
});

export const InterviewerLensResponseSchema = z.object({
  competencies: z.array(CompetencySchema).min(4), // PRD requires ≥4
  likelyFormats: z.array(InterviewFormatSchema).min(2), // PRD requires ≥2
  behaviorCues: z.array(BehaviorCueSchema).min(2), // PRD requires ≥2
});

// ============================================================================
// Prep Kit Schemas
// ============================================================================

export const RubricSchema = z.object({
  level1: z.string(),
  level2: z.string(),
  level3: z.string(),
  level4: z.string(),
});

export const PrepDaySchema = z.object({
  dayNumber: z.number().min(1).max(7),
  gapRef: z.string(),
  companyBehaviorRef: z.string().optional(),
  inputs: z.string(),
  practiceTask: z.string(),
  rubric: RubricSchema,
  expectedArtifact: z.string(),
  timeboxMin: z.number(),
});

export const PrepKitResponseSchema = z.object({
  days: z.array(PrepDaySchema).length(7), // Exactly 7 days
});

// ============================================================================
// Type Exports
// ============================================================================

export type FitMapEnhancement = z.infer<typeof FitMapEnhancementSchema>;
export type ChangeAdvisorResponse = z.infer<typeof ChangeAdvisorResponseSchema>;
export type InterviewerLensResponse = z.infer<typeof InterviewerLensResponseSchema>;
export type PrepKitResponse = z.infer<typeof PrepKitResponseSchema>;
export type Suggestion = z.infer<typeof SuggestionSchema>;
export type ATSWarning = z.infer<typeof ATSWarningSchema>;
export type Competency = z.infer<typeof CompetencySchema>;
export type InterviewFormat = z.infer<typeof InterviewFormatSchema>;
export type BehaviorCue = z.infer<typeof BehaviorCueSchema>;
export type PrepDay = z.infer<typeof PrepDaySchema>;
export type Rubric = z.infer<typeof RubricSchema>;
