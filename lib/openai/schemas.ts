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
  requiredMetric: z.string().nullable().optional(),
  evidenceToAttach: z.string().nullable().optional(),
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
  duration: z.string().nullable().optional(),
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
  companyBehaviorRef: z.string().nullable().optional(),
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
// Personalized Coach Schemas
// ============================================================================

export const WhatTheyMeasureSchema = z.object({
  criterion: z.string(), // e.g., "System Design Skills"
  whyItMatters: z.string(), // Why this matters for THIS role
  yourGaps: z.array(z.string()), // Specific gaps from user's Fit Map
  howToPrepare: z.string(), // Actionable preparation advice
});

export const RecruiterInsightSchema = z.object({
  priority: z.enum(['CRITICAL', 'IMPORTANT', 'NICE_TO_HAVE']),
  requirement: z.string(), // The skill/experience requirement
  jdEvidence: z.array(z.string()), // Phrases from JD that indicate priority
  yourStatus: z.enum(['STRONG_MATCH', 'PARTIAL_MATCH', 'GAP']),
  talkingPoint: z.string().nullable().optional(), // How to address this in interview
});

export const SkillToEmphasizeSchema = z.object({
  skill: z.string(),
  resumeEvidence: z.string(), // Where it appears in resume
  whyRelevant: z.string(), // Why it matters for THIS JD
  storyPrompt: z.string(), // Suggested story to prepare (STAR method)
});

export const PersonalizedCoachSchema = z.object({
  whatTheyMeasure: z.array(WhatTheyMeasureSchema).min(3).max(6),
  recruiterInsights: z.array(RecruiterInsightSchema).min(4).max(8),
  skillsToEmphasize: z.array(SkillToEmphasizeSchema).min(3).max(6),
  gapAddressingStrategy: z.string(), // Overall strategy for addressing gaps
  companyBehaviorContext: z.string().nullable().optional(), // Context from behavioral cues
});

// ============================================================================
// Company Research Schemas
// ============================================================================

export const CultureSignalSchema = z.object({
  signal: z.string(), // e.g., "Ownership mindset"
  evidence: z.array(z.string()), // JD phrases that indicate this
});

export const CompanyResearchSchema = z.object({
  companyName: z.string().nullable(), // null if not mentioned in JD
  companySize: z.enum(['STARTUP', 'SCALEUP', 'ENTERPRISE', 'UNKNOWN']),
  industry: z.string(), // e.g., "Fintech - Payment Processing"
  techStack: z.array(z.string()), // Explicitly mentioned technologies
  cultureSignals: z.array(CultureSignalSchema).min(1).max(5),
  seniority: z.enum(['JUNIOR', 'MID', 'SENIOR', 'STAFF', 'PRINCIPAL', 'UNKNOWN']),
  reasoning: z.string(), // Explain how these were inferred
});

export const RequirementPrioritySchema = z.object({
  priority: z.enum(['CRITICAL', 'IMPORTANT', 'NICE_TO_HAVE']),
  requirement: z.string(), // The skill/experience requirement
  jdEvidence: z.array(z.string()).min(1), // Phrases that indicate priority
  category: z.enum(['TECHNICAL_SKILL', 'EXPERIENCE', 'SOFT_SKILL', 'CERTIFICATION']),
});

export const RecruiterPrioritiesSchema = z.object({
  requirements: z.array(RequirementPrioritySchema).min(5).max(12),
  mustHaveKeywords: z.array(z.string()), // Critical ATS keywords
  niceToHaveKeywords: z.array(z.string()), // Bonus ATS keywords
  overallStrategy: z.string(), // What recruiters are likely looking for
});

// ============================================================================
// Type Exports
// ============================================================================

export type FitMapEnhancement = z.infer<typeof FitMapEnhancementSchema>;
export type ChangeAdvisorResponse = z.infer<typeof ChangeAdvisorResponseSchema>;
export type InterviewerLensResponse = z.infer<typeof InterviewerLensResponseSchema>;
export type PrepKitResponse = z.infer<typeof PrepKitResponseSchema>;
export type PersonalizedCoach = z.infer<typeof PersonalizedCoachSchema>;
export type CompanyResearch = z.infer<typeof CompanyResearchSchema>;
export type RecruiterPriorities = z.infer<typeof RecruiterPrioritiesSchema>;
export type Suggestion = z.infer<typeof SuggestionSchema>;
export type ATSWarning = z.infer<typeof ATSWarningSchema>;
export type Competency = z.infer<typeof CompetencySchema>;
export type InterviewFormat = z.infer<typeof InterviewFormatSchema>;
export type BehaviorCue = z.infer<typeof BehaviorCueSchema>;
export type PrepDay = z.infer<typeof PrepDaySchema>;
export type Rubric = z.infer<typeof RubricSchema>;
export type WhatTheyMeasure = z.infer<typeof WhatTheyMeasureSchema>;
export type RecruiterInsight = z.infer<typeof RecruiterInsightSchema>;
export type SkillToEmphasize = z.infer<typeof SkillToEmphasizeSchema>;
export type CultureSignal = z.infer<typeof CultureSignalSchema>;
export type RequirementPriority = z.infer<typeof RequirementPrioritySchema>;
