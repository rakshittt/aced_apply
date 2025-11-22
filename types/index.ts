/**
 * Shared TypeScript types for the application
 */

import {
  JobRun,
  JobDescription,
  Resume,
  FitMap,
  ChangeAdvisor,
  ChangeAdvisorSuggestion,
  InterviewerLens,
  PrepKit,
  PrepDay,
  CoachCard,
  RunStatus,
  FitLevel,
  SuggestionStatus,
  InterviewStage
} from '@prisma/client';

// Re-export Prisma types
export type {
  JobRun,
  JobDescription,
  Resume,
  FitMap,
  ChangeAdvisor,
  ChangeAdvisorSuggestion,
  InterviewerLens,
  PrepKit,
  PrepDay,
  CoachCard,
  RunStatus,
  FitLevel,
  SuggestionStatus,
  InterviewStage
};

// ============================================================================
// JSON Type Definitions (for Prisma Json fields)
// ============================================================================

export interface Competency {
  name: string;
  description: string;
  whatGoodLooksLike: string;
}

export interface InterviewFormat {
  stage: string;
  format: string;
  duration?: string;
}

export interface BehaviorCue {
  cue: string;
  jdPhrases: string[];
  implication: string;
}

export interface JDSpan {
  text: string;
  start: number;
  end: number;
}

export interface ResumeSpan {
  text: string;
  section: string;
  index: number;
}

export interface OverlapItem {
  skill: string;
  jdSpan: JDSpan;
  resumeSpan: ResumeSpan;
  confidence: number;
}

export interface UnderEvidencedItem {
  skill: string;
  resumeSpan: ResumeSpan;
  reason: string;
}

export interface GapItem {
  skill: string;
  jdSpan: JDSpan;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface ATSWarning {
  type: 'table' | 'column' | 'image' | 'textbox' | 'formatting' | 'contrast';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  location: string;
  description: string;
}

export interface Rubric {
  level1: string;
  level2: string;
  level3: string;
  level4: string;
}

export interface BehaviorCues {
  ownership: boolean;
  regulated: boolean;
  onCall: boolean;
  fastPaced: boolean;
  collaborative: boolean;
  autonomous: boolean;
}

export interface ParsedResumeSections {
  experience: ResumeExperienceItem[];
  skills: string[];
  education: EducationItem[];
  projects?: ProjectItem[];
  certifications?: string[];
}

export interface ResumeExperienceItem {
  title: string;
  company: string;
  location?: string;
  startDate: string;
  endDate: string;
  bullets: string[];
}

export interface EducationItem {
  degree: string;
  institution: string;
  graduation: string;
  gpa?: string;
}

export interface ProjectItem {
  name: string;
  description: string;
  technologies: string[];
}

export interface ResumeBullet {
  text: string;
  section: string;
  index: number;
  hasMetric: boolean;
  hasAction: boolean;
  wordCount: number;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface AnalyzeRequest {
  jdUrl?: string;
  jdText?: string;
  resumeFile: File | string; // File in browser, string (S3 key) in server
}

export interface AnalyzeResponse {
  runId: string;
  status: RunStatus;
  ttfi?: number;
  estimatedCompletion?: number;
}

export interface ResultsResponse {
  runId: string;
  overallFit: FitLevel;
  confidence: number;
  fitMap: {
    overlap: OverlapItem[];
    underEvidenced: UnderEvidencedItem[];
    gaps: GapItem[];
  };
  changeAdvisor: {
    suggestions: ChangeAdvisorSuggestion[];
    atsWarnings: ATSWarning[];
  };
  lens: {
    competencies: Competency[];
    likelyFormats: InterviewFormat[];
    behaviorCues: BehaviorCue[];
  };
  prepKit: {
    days: PrepDayWithDetails[];
  };
}

export interface PrepDayWithDetails extends PrepDay {
  rubric: Rubric;
}

export interface CoachResponse extends CoachCard {}

// ============================================================================
// Internal Service Types
// ============================================================================

export interface ParsedJD {
  rawText: string;
  title: string;
  company?: string;
  location?: string;
  requirements: string[];
  responsibilities: string[];
  qualifications: string[];
  keywords: string[];
  behaviorCues: BehaviorCues;
}

export interface ParsedResume {
  rawText: string;
  sections: ParsedResumeSections;
  bullets: ResumeBullet[];
}

export interface S3UploadResult {
  key: string;
  url: string;
  bucket: string;
}

export interface OpenAIStructuredRequest<T> {
  prompt: string;
  schema: any; // Zod schema
  context: {
    jd: string;
    resume: string;
  };
  temperature?: number;
}
