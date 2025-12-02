/**
 * Personalized Coach Analyzer
 * Generates interview coaching personalized to user's gaps, JD requirements, and resume strengths
 */

import { generateStructuredOutput } from '../openai/client';
import { PersonalizedCoachSchema, PersonalizedCoach } from '../openai/schemas';

export interface PersonalizedCoachInput {
  interviewStage: string;
  jdText: string;
  resumeText: string;
  gaps: Array<{ skill: string; severity: string }>;
  overlaps: Array<{ skill: string }>;
  behaviorCues: Array<{ cue: string; implication: string }>;
}

export interface PersonalizedCoachResult {
  whatTheyMeasure: PersonalizedCoach['whatTheyMeasure'];
  recruiterInsights: PersonalizedCoach['recruiterInsights'];
  skillsToEmphasize: PersonalizedCoach['skillsToEmphasize'];
  gapAddressingStrategy: string;
  companyBehaviorContext?: string;
}

/**
 * Generate personalized interview coaching based on user's specific gaps and strengths
 */
export async function generatePersonalizedCoach(
  input: PersonalizedCoachInput
): Promise<PersonalizedCoachResult> {
  const { interviewStage, jdText, resumeText, gaps, overlaps, behaviorCues } = input;

  // Build AI prompt
  const prompt = buildCoachPrompt(interviewStage, gaps, overlaps, behaviorCues);

  // Generate personalized coaching
  const response = await generateStructuredOutput({
    prompt,
    schema: PersonalizedCoachSchema,
    schemaName: 'PersonalizedCoach',
    context: {
      jd: jdText,
      resume: resumeText,
    },
  });

  return {
    ...response.data,
    companyBehaviorContext: response.data.companyBehaviorContext ?? undefined,
  };
}

function buildCoachPrompt(
  stage: string,
  gaps: Array<{ skill: string; severity: string }>,
  overlaps: Array<{ skill: string }>,
  behaviorCues: Array<{ cue: string; implication: string }>
): string {
  return `
You are an expert interview coach generating personalized guidance for a ${stage} interview stage.

## CANDIDATE'S SITUATION

**SKILL GAPS (Missing from Resume):**
${gaps.map((g, i) => `${i + 1}. ${g.skill} (${g.severity} priority)`).join('\n')}

**SKILL STRENGTHS (Resume Matches JD):**
${overlaps.map((o, i) => `${i + 1}. ${o.skill}`).join('\n')}

**COMPANY BEHAVIORAL EXPECTATIONS:**
${behaviorCues.map((b, i) => `${i + 1}. ${b.cue} - ${b.implication}`).join('\n')}

---

## YOUR TASK

Generate **personalized interview coaching** that helps this specific candidate prepare for THIS specific role.

### 1. WHAT THEY'LL MEASURE (3-6 items)

For each criterion:
- **criterion**: The skill/competency they'll evaluate (e.g., "System Design", "API Development")
- **whyItMatters**: Why this matters for THIS specific role (cite JD evidence)
- **yourGaps**: List the candidate's specific gaps related to this criterion (from SKILL GAPS above)
- **howToPrepare**: Actionable preparation advice tailored to their gaps

CRITICAL: Focus on criteria where the candidate HAS GAPS. Don't waste time on strengths.

### 2. RECRUITER INSIGHTS (4-8 items)

Analyze the JD to infer what recruiters prioritize for THIS role:

For each insight:
- **priority**: CRITICAL (must-have), IMPORTANT (strongly preferred), or NICE_TO_HAVE
- **requirement**: The skill/experience requirement
- **jdEvidence**: Exact phrases from JD that indicate this priority (cite liberally!)
- **yourStatus**: STRONG_MATCH, PARTIAL_MATCH, or GAP (based on candidate's resume)
- **talkingPoint** (optional): If GAP or PARTIAL_MATCH, suggest how to address this in interview

CRITICAL REQUIREMENTS:
- Identify priority by JD signals:
  - "Required", "Must have", "X+ years" → CRITICAL
  - "Preferred", "Strong knowledge", "Experience with" → IMPORTANT
  - "Nice to have", "Familiarity with", "Bonus" → NICE_TO_HAVE
- For each item, cite SPECIFIC JD phrases that indicate priority
- For gaps, provide a talking point that frames the gap positively

### 3. SKILLS TO EMPHASIZE (3-6 items)

Identify the candidate's resume strengths that are MOST relevant to this JD:

For each skill:
- **skill**: The skill from their resume
- **resumeEvidence**: WHERE in resume this appears (be specific)
- **whyRelevant**: WHY this matters for THIS JD (cite JD requirements)
- **storyPrompt**: Suggest a STAR-method story to prepare about this skill

CRITICAL: Only include skills from SKILL STRENGTHS list that are clearly relevant to JD.

### 4. GAP ADDRESSING STRATEGY (1 paragraph)

Provide an overall strategy for how the candidate should handle their gaps in the interview:
- Frame gaps as growth opportunities
- Emphasize transferable skills
- Suggest how to pivot conversations to strengths
- Reference company behavioral expectations

### 5. COMPANY BEHAVIOR CONTEXT (optional, 1-2 sentences)

If there are notable company behavioral cues (e.g., "on-call rotation", "fast-paced", "ownership mindset"),
briefly explain what this means for interview preparation and how to demonstrate alignment.

---

## EXAMPLE OUTPUT QUALITY

**Good "What They'll Measure" entry:**
- criterion: "Distributed Systems Design"
- whyItMatters: "JD requires 'designing scalable microservices architectures' and 'handling high-throughput data pipelines'"
- yourGaps: ["Kafka/RabbitMQ", "Service mesh patterns", "Circuit breaker design"]
- howToPrepare: "Focus on studying event-driven architecture patterns. Review Kafka basics and prepare to discuss any async messaging you've done (even if not Kafka). Study the Retry/Circuit Breaker pattern with concrete examples."

**Good "Recruiter Insight" entry:**
- priority: CRITICAL
- requirement: "5+ years backend development with Python"
- jdEvidence: ["Required: 5+ years", "Must have: Python expertise", "Core technologies: Python, Django"]
- yourStatus: STRONG_MATCH
- talkingPoint: N/A (no talking point needed for strong matches)

**Good "Skill to Emphasize" entry:**
- skill: "RESTful API Development"
- resumeEvidence: "Mentioned in 3 job bullets: 'Built REST API serving 100K requests/day', 'Designed API gateway'"
- whyRelevant: "JD requires 'design and implement RESTful APIs' and 'API versioning strategies'"
- storyPrompt: "Prepare STAR story about the 100K req/day API: What was the Situation? What Task did you own? What Actions did you take (caching, rate limiting)? What were the Results (latency, uptime)?"

---

## CRITICAL REQUIREMENTS

1. **Be SPECIFIC to this candidate** - Reference their exact gaps and strengths
2. **Cite JD evidence** - Always point to specific JD phrases
3. **Provide ACTIONABLE advice** - No generic platitudes
4. **Focus on GAPS** - Help them prepare for areas they're weak in
5. **Leverage STRENGTHS** - Show them what to emphasize from their resume
6. **Company CONTEXT** - Incorporate behavioral cues where relevant

DO NOT provide generic interview advice. This must be personalized to THIS candidate for THIS role.
`.trim();
}
