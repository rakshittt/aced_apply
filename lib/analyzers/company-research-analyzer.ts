/**
 * Company Research Analyzer
 * Extracts company-specific insights from job description to inform analysis and coaching
 */

import { generateStructuredOutput } from '../openai/client';
import {
  CompanyResearchSchema,
  RecruiterPrioritiesSchema,
  CompanyResearch,
  RecruiterPriorities,
} from '../openai/schemas';

export interface CompanyResearchInput {
  jdText: string;
}

export interface CompanyResearchResult {
  companyInfo: CompanyResearch;
  recruiterPriorities: RecruiterPriorities;
}

/**
 * Analyze company context and recruiter priorities from job description
 */
export async function analyzeCompanyResearch(
  input: CompanyResearchInput
): Promise<CompanyResearchResult> {
  const { jdText } = input;

  // Run both analyses in parallel
  const [companyInfo, recruiterPriorities] = await Promise.all([
    extractCompanyInfo(jdText),
    extractRecruiterPriorities(jdText),
  ]);

  return {
    companyInfo,
    recruiterPriorities,
  };
}

/**
 * Extract company information from JD
 */
async function extractCompanyInfo(jdText: string): Promise<CompanyResearch> {
  const prompt = buildCompanyInfoPrompt();

  const response = await generateStructuredOutput({
    prompt,
    schema: CompanyResearchSchema,
    schemaName: 'CompanyResearch',
    context: {
      jd: jdText,
      resume: '', // Not needed for company research
    },
  });

  return response.data;
}

/**
 * Extract recruiter priorities from JD
 */
async function extractRecruiterPriorities(jdText: string): Promise<RecruiterPriorities> {
  const prompt = buildRecruiterPrioritiesPrompt();

  const response = await generateStructuredOutput({
    prompt,
    schema: RecruiterPrioritiesSchema,
    schemaName: 'RecruiterPriorities',
    context: {
      jd: jdText,
      resume: '', // Not needed for recruiter priorities
    },
  });

  return response.data;
}

function buildCompanyInfoPrompt(): string {
  return `
You are analyzing a job description to extract company context and role characteristics.

## YOUR TASK

Extract the following information from the JD. Base ALL conclusions on explicit evidence in the text.

### 1. COMPANY NAME
- Look for explicit company mentions
- Check headers, footers, "About Us" sections
- Return null if not mentioned

### 2. COMPANY SIZE
Classify as:
- **STARTUP**: < 50 employees, seed/Series A, "early-stage", "founding team"
- **SCALEUP**: 50-500 employees, Series B+, "fast-growing", "scaling"
- **ENTERPRISE**: 500+ employees, "Fortune 500", "global presence", "established"
- **UNKNOWN**: No clear indicators

Signals:
- Startup: "wear many hats", "early-stage", "founding", "seed", "Series A"
- Scaleup: "Series B/C/D", "scaling rapidly", "growth stage", "100-500 employees"
- Enterprise: "Fortune 500", "global company", "1000+ employees", "established leader"

### 3. INDUSTRY
Be specific: "Fintech - Payment Processing" not just "Tech"
Examples:
- "Healthcare - Medical Devices"
- "E-commerce - Fashion Retail"
- "SaaS - Project Management Tools"
- "Fintech - Digital Banking"

### 4. TECH STACK
Only include technologies EXPLICITLY mentioned in JD:
- Programming languages
- Frameworks/libraries
- Databases
- Cloud platforms
- DevOps tools

DO NOT infer tech stack from role type. Only list what's actually written.

### 5. CULTURE SIGNALS
Identify 1-5 cultural characteristics with evidence:

Common signals:
- **Ownership mindset**: "take ownership", "drive initiatives", "end-to-end"
- **Fast-paced**: "move quickly", "fast-paced", "rapid iteration"
- **Collaborative**: "cross-functional", "teamwork", "collaborate"
- **Autonomous**: "self-directed", "independent", "take initiative"
- **Data-driven**: "metrics", "data-driven decisions", "analytics"
- **On-call**: "on-call rotation", "24/7 support", "production incidents"
- **Regulated**: "compliance", "SOX", "HIPAA", "financial regulations"

For each signal, provide EXACT phrases from JD as evidence.

### 6. SENIORITY LEVEL
Infer from:
- **JUNIOR**: "0-2 years", "early career", "junior", "associate"
- **MID**: "2-5 years", "mid-level", "no senior title"
- **SENIOR**: "5+ years", "senior", "lead", "significant experience"
- **STAFF**: "8+ years", "staff", "principal track", "technical leadership"
- **PRINCIPAL**: "10+ years", "principal", "architect", "industry expert"
- **UNKNOWN**: No clear indicators

### 7. REASONING
Explain how you inferred company size, industry, and seniority (2-3 sentences).

---

## CRITICAL REQUIREMENTS

1. **Evidence-based**: Every conclusion must cite specific JD text
2. **No assumptions**: If not mentioned, say UNKNOWN or null
3. **Be specific**: "Fintech - Crypto Exchange" not "Finance"
4. **Culture signals**: Must have at least 1 signal with evidence
5. **Tech stack**: Only explicitly listed technologies

---

## EXAMPLE OUTPUT

**Good:**
\`\`\`json
{
  "companyName": "Stripe",
  "companySize": "SCALEUP",
  "industry": "Fintech - Payment Processing Infrastructure",
  "techStack": ["Ruby", "Go", "PostgreSQL", "Redis", "Kubernetes", "AWS"],
  "cultureSignals": [
    {
      "signal": "Ownership mindset",
      "evidence": ["take end-to-end ownership", "drive projects independently", "own the full lifecycle"]
    },
    {
      "signal": "On-call rotation",
      "evidence": ["participate in on-call rotation", "respond to production incidents"]
    }
  ],
  "seniority": "SENIOR",
  "reasoning": "Company size inferred from 'Series C funded, 200+ employees'. Industry clear from 'payment processing API platform'. Seniority from '5+ years backend experience' and 'senior engineer' title."
}
\`\`\`

**Bad (too vague):**
\`\`\`json
{
  "companyName": null,
  "companySize": "UNKNOWN",
  "industry": "Technology", // Too vague!
  "techStack": ["Python", "Django", "MySQL"], // Assumed, not mentioned
  "cultureSignals": [],  // Missing!
  "seniority": "MID",
  "reasoning": "Seems like a mid-level role." // Not evidence-based!
}
\`\`\`

---

Analyze the JD thoroughly and provide detailed, evidence-based insights.
`.trim();
}

function buildRecruiterPrioritiesPrompt(): string {
  return `
You are analyzing a job description to understand what recruiters prioritize for this role.

## YOUR TASK

Identify and categorize ALL requirements from the JD by priority level.

### PRIORITY CLASSIFICATION

**CRITICAL (Must-Have):**
- Signal words: "Required", "Must have", "X+ years required"
- Essential for role: "Core responsibilities require X"
- Deal-breakers if missing

**IMPORTANT (Strongly Preferred):**
- Signal words: "Preferred", "Strong knowledge of", "Experience with"
- Valuable but not mandatory: "Nice to have Y"
- Competitive advantage

**NICE_TO_HAVE (Bonus):**
- Signal words: "Bonus", "Familiarity with", "Exposure to"
- Optional: "Would be great if you have"
- Differentiators

---

### REQUIREMENT CATEGORIES

Classify each requirement as:
- **TECHNICAL_SKILL**: Programming languages, tools, frameworks
- **EXPERIENCE**: Years in role, industry experience, specific domain knowledge
- **SOFT_SKILL**: Communication, leadership, collaboration
- **CERTIFICATION**: Degrees, certifications, licenses

---

### EXTRACTION PROCESS

1. **Read entire JD** - Don't miss requirements buried in descriptions
2. **Find ALL requirements** - Aim for 5-12 total requirements
3. **Cite evidence** - Include EXACT phrases that indicate priority
4. **Cover all categories** - Include technical + experience + soft skills
5. **Be specific** - "5+ years Python" not just "Python experience"

---

### EXAMPLES

**Good Requirement Entry:**
\`\`\`json
{
  "priority": "CRITICAL",
  "requirement": "5+ years backend development with Python/Django",
  "jdEvidence": [
    "Required: 5+ years of experience in backend development",
    "Must have: Expert-level Python and Django knowledge",
    "Core requirement: Build scalable APIs with Python"
  ],
  "category": "TECHNICAL_SKILL"
}
\`\`\`

**Good Requirement Entry (Soft Skill):**
\`\`\`json
{
  "priority": "IMPORTANT",
  "requirement": "Strong cross-functional communication skills",
  "jdEvidence": [
    "Collaborate with product, design, and engineering teams",
    "Preferred: Experience working in cross-functional environments",
    "Communicate technical concepts to non-technical stakeholders"
  ],
  "category": "SOFT_SKILL"
}
\`\`\`

---

### ATS KEYWORDS

**mustHaveKeywords:**
- Critical technical skills for ATS screening
- Languages, frameworks, tools mentioned as "required"
- Core competencies mentioned multiple times

**niceToHaveKeywords:**
- Bonus skills that improve ranking
- "Preferred" or "nice to have" technologies
- Differentiating qualifications

---

### OVERALL STRATEGY

Provide a 2-3 sentence summary of what recruiters are likely looking for:
- What's the "profile" they want?
- What experience is most valued?
- What would make a candidate stand out?

---

## CRITICAL REQUIREMENTS

1. **Cite evidence**: Every requirement must have 1-3 JD phrases as proof
2. **Be comprehensive**: Extract 5-12 requirements covering all categories
3. **Prioritize correctly**: Use JD language signals to classify priority
4. **ATS keywords**: Identify 3-8 must-have and 3-8 nice-to-have keywords
5. **Strategic summary**: Synthesize what recruiters truly want

---

## EXAMPLE OUTPUT

\`\`\`json
{
  "requirements": [
    {
      "priority": "CRITICAL",
      "requirement": "7+ years distributed systems experience",
      "jdEvidence": ["Required: 7+ years", "Must have: distributed systems expertise"],
      "category": "EXPERIENCE"
    },
    {
      "priority": "CRITICAL",
      "requirement": "Kubernetes and container orchestration",
      "jdEvidence": ["Required: K8s experience", "Deploy and manage containerized services"],
      "category": "TECHNICAL_SKILL"
    },
    {
      "priority": "IMPORTANT",
      "requirement": "Experience with fintech/payment systems",
      "jdEvidence": ["Preferred: fintech background", "Bonus: payment processing knowledge"],
      "category": "EXPERIENCE"
    },
    {
      "priority": "NICE_TO_HAVE",
      "requirement": "Open source contributions",
      "jdEvidence": ["Nice to have: OSS contributions"],
      "category": "EXPERIENCE"
    }
  ],
  "mustHaveKeywords": ["Kubernetes", "Go", "distributed systems", "microservices", "PostgreSQL"],
  "niceToHaveKeywords": ["Kafka", "GraphQL", "Terraform", "fintech"],
  "overallStrategy": "Recruiters want a seasoned backend engineer (7+ years) with deep distributed systems and Kubernetes expertise. Fintech experience is a strong plus. Technical depth in Go and microservices architecture is critical. They value engineers who can own complex systems end-to-end."
}
\`\`\`

---

Analyze the JD comprehensively and extract recruiter priorities with evidence.
`.trim();
}
