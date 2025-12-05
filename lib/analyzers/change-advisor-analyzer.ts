/**
 * Change Advisor Analyzer
 * Generates precise, diff-style resume improvement suggestions
 * PRD: "never edits files - advice only"
 */

import { generateStructuredOutput } from '../openai';
import { ChangeAdvisorResponseSchema, type ChangeAdvisorResponse } from '../openai/schemas';
import type { ParsedJD, ParsedResume, GapItem } from '@/types';
import prisma from '../db/prisma';

export interface ChangeAdvisorResult {
  runId: string;
  suggestions: any[];
  atsWarnings: any[];
}

/**
 * Generate resume change suggestions based on JD fit
 */
export async function analyzeChangeAdvisor(
  runId: string,
  jd: ParsedJD,
  resume: ParsedResume,
  gaps: GapItem[]
): Promise<ChangeAdvisorResult> {
  const startTime = Date.now();

  console.log('[ChangeAdvisor] Generating suggestions...');

  // Generate AI-powered suggestions
  const response = await generateStructuredOutput<ChangeAdvisorResponse>({
    prompt: buildChangeAdvisorPrompt(gaps),
    schema: ChangeAdvisorResponseSchema,
    schemaName: 'ChangeAdvisorResponse',
    context: {
      jd: jd.rawText,
      resume: resume.rawText,
    },
  });

  // Validate suggestions meet PRD requirements
  const validatedSuggestions = validateSuggestions(response.data.suggestions);

  // Detect ATS warnings from resume structure
  const atsWarnings = detectATSWarnings(resume.rawText);
  const allWarnings = [...response.data.atsWarnings, ...atsWarnings];

  // Save to database
  const advisor = await prisma.changeAdvisor.create({
    data: {
      jobRunId: runId,
      atsWarnings: allWarnings,
    },
  });

  // Save individual suggestions
  const savedSuggestions = await Promise.all(
    validatedSuggestions.map((suggestion) =>
      prisma.changeAdvisorSuggestion.create({
        data: {
          advisorId: advisor.id,
          targetSection: suggestion.targetSection,
          currentBullet: suggestion.currentBullet,
          suggestedBullet: suggestion.suggestedBullet,
          reason: suggestion.reason,
          requiredMetric: suggestion.requiredMetric,
          evidenceToAttach: suggestion.evidenceToAttach,
          keywordMirror: suggestion.keywordMirror,
          confidence: suggestion.confidence,
          jdSpans: suggestion.jdSpans,
          resumeSpans: suggestion.resumeSpans,
        },
      })
    )
  );

  const duration = Date.now() - startTime;
  console.log(`[ChangeAdvisor] Generated ${savedSuggestions.length} suggestions in ${duration}ms`);

  return {
    runId,
    suggestions: savedSuggestions,
    atsWarnings: allWarnings,
  };
}

/**
 * Build prompt for Change Advisor
 */
function buildChangeAdvisorPrompt(gaps: GapItem[]): string {
  const topGaps = gaps
    .filter(g => g.severity === 'HIGH' || g.severity === 'MEDIUM')
    .slice(0, 10)
    .map(g => g.skill)
    .join(', ');

  return `You are a resume improvement advisor. Generate specific, actionable suggestions to improve this resume's fit for the job.

KEY GAPS TO ADDRESS:
${topGaps}

CRITICAL REQUIREMENTS:
1. Generate AT LEAST 6 suggestions (PRD requirement)
2. Each suggestion MUST be ≤28 words
3. At least 80% of suggestions must include a METRIC or ARTIFACT prompt
4. Provide diff-style guidance: show current bullet → suggested bullet
5. Cite specific JD and resume text spans as evidence
6. Flag any clichés or generic language
7. Only mirror keywords when truly essential for ATS (keywordMirror flag)
8. Focus on EVIDENCE - metrics, outcomes, specific technologies
9. Each suggestion needs a clear REASON referencing JD requirements

SUGGESTION TYPES:
- Add missing skills from gaps (with evidence prompt)
- Quantify Impact: Transform qualitative statements into quantitative ones (e.g., "Improved performance" -> "Reduced latency by 40%")
- Strengthen weak bullets (action verbs + outcomes)
- Add relevant keywords for ATS (sparingly!)
- Improve specificity (technologies, scale, impact)

TONE CHECK:
- Avoid passive voice (e.g., "was responsible for")
- Avoid weak verbs (e.g., "helped", "worked on")
- Use strong action verbs (e.g., "Architected", "Deployed", "Optimized")

ATS WARNINGS:
Also identify any ATS-hostile formatting:
- Tables, columns, text boxes
- Images, graphics, charts
- Inconsistent headings
- Low-contrast text
- Over-designed PDFs

BS DETECTOR (ANTI-FLUFF):
Identify "zero-calorie" words and clichés that weaken the resume. Populate 'fluffWords' with these.
- Examples: "passionate", "seasoned", "visionary", "go-getter", "synergy", "thought leader"
- Any adjective that is not backed by a metric is suspect.
- Flag vague phrases like "responsible for", "participated in", "helped with".

Return structured JSON with suggestions, warnings, and fluff words.`;
}

/**
 * Validate suggestions meet PRD requirements
 */
function validateSuggestions(suggestions: any[]): any[] {
  const validated = suggestions.filter(s => {
    // Must be ≤28 words
    const wordCount = s.suggestedBullet.split(/\s+/).length;
    if (wordCount > 28) {
      console.warn(`[ChangeAdvisor] Suggestion too long (${wordCount} words), skipping`);
      return false;
    }

    // Must have confidence score
    if (!s.confidence || s.confidence < 0.3) {
      console.warn('[ChangeAdvisor] Suggestion has low confidence, skipping');
      return false;
    }

    return true;
  });

  // Check 80% metric/artifact requirement
  const withMetricOrArtifact = validated.filter(
    s => s.requiredMetric || s.evidenceToAttach
  ).length;
  const percentage = (withMetricOrArtifact / validated.length) * 100;

  if (percentage < 80) {
    console.warn(
      `[ChangeAdvisor] Only ${percentage.toFixed(0)}% of suggestions have metrics/artifacts (PRD requires 80%)`
    );
  }

  return validated;
}

/**
 * Detect ATS warnings from resume structure
 */
function detectATSWarnings(resumeText: string): any[] {
  const warnings: any[] = [];

  // Check for tables (common ATS issue)
  if (resumeText.includes('│') || resumeText.includes('┌') || resumeText.includes('├')) {
    warnings.push({
      type: 'table',
      severity: 'HIGH',
      location: 'Document structure',
      description: 'Resume contains table formatting which may not parse correctly in ATS',
    });
  }

  // Check for multiple columns (heuristic: very short lines)
  const lines = resumeText.split('\n');
  const shortLines = lines.filter(l => l.trim().length > 0 && l.trim().length < 40);
  if (shortLines.length > lines.length * 0.5) {
    warnings.push({
      type: 'column',
      severity: 'MEDIUM',
      location: 'Document layout',
      description: 'Resume may use multi-column layout which can cause ATS parsing issues',
    });
  }

  // Check for inconsistent headings (heuristic: mixed case patterns)
  const headings = resumeText.match(/^[A-Z][A-Z\s]+$/gm) || [];
  if (headings.length > 0) {
    const allCaps = headings.filter(h => h === h.toUpperCase()).length;
    const titleCase = headings.length - allCaps;
    if (allCaps > 0 && titleCase > 0) {
      warnings.push({
        type: 'formatting',
        severity: 'LOW',
        location: 'Section headings',
        description: 'Inconsistent heading styles (mix of ALL CAPS and Title Case)',
      });
    }
  }

  return warnings;
}
