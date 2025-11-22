/**
 * Prep Kit Generator
 * Creates 7-day targeted preparation plan
 * PRD: "deep, role & company-aware"
 */

import { generateStructuredOutput } from '../openai';
import { PrepKitResponseSchema, type PrepKitResponse } from '../openai/schemas';
import type { ParsedJD, GapItem, BehaviorCue } from '@/types';
import prisma from '../db/prisma';

export interface PrepKitResult {
  runId: string;
  days: any[];
}

/**
 * Generate 7-day prep plan mapped to top gaps
 */
export async function generatePrepKit(
  runId: string,
  jd: ParsedJD,
  gaps: GapItem[],
  behaviorCues: BehaviorCue[]
): Promise<PrepKitResult> {
  const startTime = Date.now();

  console.log('[PrepKit] Generating 7-day preparation plan...');

  // Select top 7 gaps (prioritize HIGH severity)
  const topGaps = [
    ...gaps.filter(g => g.severity === 'HIGH'),
    ...gaps.filter(g => g.severity === 'MEDIUM'),
    ...gaps.filter(g => g.severity === 'LOW'),
  ].slice(0, 7);

  const response = await generateStructuredOutput<PrepKitResponse>({
    prompt: buildPrepKitPrompt(topGaps, behaviorCues, jd),
    schema: PrepKitResponseSchema,
    schemaName: 'PrepKitResponse',
    context: {
      jd: jd.rawText,
      resume: '', // Not needed for prep plan
    },
  });

  // Save to database
  const prepKit = await prisma.prepKit.create({
    data: {
      jobRunId: runId,
    },
  });

  const savedDays = await Promise.all(
    response.data.days.map((day) =>
      prisma.prepDay.create({
        data: {
          prepKitId: prepKit.id,
          dayNumber: day.dayNumber,
          gapRef: day.gapRef,
          companyBehaviorRef: day.companyBehaviorRef,
          inputs: day.inputs,
          practiceTask: day.practiceTask,
          rubric: day.rubric,
          expectedArtifact: day.expectedArtifact,
          timeboxMin: day.timeboxMin,
        },
      })
    )
  );

  const duration = Date.now() - startTime;
  console.log(`[PrepKit] Generated 7-day plan in ${duration}ms`);

  return {
    runId,
    days: savedDays,
  };
}

/**
 * Build prompt for Prep Kit
 */
function buildPrepKitPrompt(
  gaps: GapItem[],
  behaviorCues: BehaviorCue[],
  jd: ParsedJD
): string {
  const gapsList = gaps.map((g, i) => `${i + 1}. ${g.skill} (${g.severity})`).join('\n');
  const cuesList = behaviorCues.map(c => `- ${c.cue}: ${c.implication}`).join('\n');

  return `You are creating a 7-day interview preparation plan for a candidate. The plan should address their top skill gaps while incorporating company culture context.

TOP SKILL GAPS TO ADDRESS:
${gapsList}

COMPANY BEHAVIOR CONTEXT:
${cuesList}

TASK: Create exactly 7 daily tasks, one per gap (in order of priority).

For each day, provide:

1. **Gap Reference**: Which gap this addresses (e.g., "PostgreSQL", "System Design")

2. **Company Behavior Reference** (optional): Which behavior cue is relevant (e.g., "Ownership mindset", "Regulated environment")

3. **Inputs**: What the candidate needs before starting (docs, tutorials, examples)

4. **Practice Task**: Specific, hands-on exercise (1-2 hours timeboxed)
   Examples:
   - "Design a PostgreSQL schema for a multi-tenant SaaS app with 100K users"
   - "Implement rate limiting in Express.js with Redis backend"
   - "Architect a system to process 10K events/second with exactly-once semantics"

5. **Rubric** (4 levels):
   - Level 1: Minimal/incomplete attempt
   - Level 2: Basic working solution
   - Level 3: Production-quality with best practices
   - Level 4: Exceptional - handles edge cases, optimized, well-tested

6. **Expected Artifact**: What they should create (code repo, diagram, doc)

7. **Timebox (minutes)**: Recommended time limit (60-120 min)

CRITICAL REQUIREMENTS:
- Exactly 7 days (one per gap)
- Tasks must be SPECIFIC and ACTIONABLE
- Include company behavior context where relevant (e.g., if "on-call" is a cue, practice incident response)
- Rubrics must be clear and measurable
- Each task should build interview-ready talking points

EXAMPLE DAY:
{
  "dayNumber": 1,
  "gapRef": "PostgreSQL",
  "companyBehaviorRef": "Regulated environment",
  "inputs": "PostgreSQL docs on ACID, tutorial on transaction isolation levels",
  "practiceTask": "Design a database schema for a HIPAA-compliant patient records system. Implement proper access controls, audit logging, and data encryption.",
  "rubric": {
    "level1": "Basic schema created but missing security features",
    "level2": "Schema with encryption and access controls",
    "level3": "Production-ready with audit logs, row-level security, and compliance docs",
    "level4": "Comprehensive solution with automated compliance checks, performance tuning, and disaster recovery"
  },
  "expectedArtifact": "SQL schema file + security documentation",
  "timeboxMin": 90
}

Return structured JSON with exactly 7 days.`;
}
