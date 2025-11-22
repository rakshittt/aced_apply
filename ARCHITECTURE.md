# Architecture Documentation
## JD→Resume Fit Analysis Platform MVP

**Last Updated:** November 2025
**Status:** Phase 1 Complete (Foundation + Core Backend)

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Database Schema](#database-schema)
5. [Core Components](#core-components)
6. [API Endpoints](#api-endpoints)
7. [Data Flow](#data-flow)
8. [Performance Targets](#performance-targets)
9. [Next Steps](#next-steps)

---

## Overview

This platform analyzes the fit between job descriptions and resumes, providing:

1. **Fit Map** - Overlap/gaps analysis with provenance
2. **Change Advisor** - Diff-style resume improvement suggestions
3. **Interviewer Lens** - What interviewers will measure + company behavior
4. **7-Day Prep Kit** - Targeted preparation plan
5. **Interview Coach** - Stage-specific guidance

**Key Principle (from PRD):** "Not an AI wrapper" - deterministic heuristics precede model calls.

---

## Tech Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend** | Next.js App Router | 16.0.3 | SSR, routing, API routes |
| | React | 19.2.0 | UI components |
| | Tailwind CSS | 4.x | Styling |
| | TypeScript | 5.x | Type safety |
| **Backend** | Next.js API Routes | 16.0.3 | REST API endpoints |
| | Prisma ORM | 7.0.0 | Database client |
| | PostgreSQL | - | Primary database |
| **AI** | OpenAI API | gpt-4o-2024-08-06 | Structured outputs |
| | Zod | 4.1.12 | Schema validation |
| **Storage** | AWS S3 | - | Resume PDFs (30-day retention) |
| | KMS | - | Encryption at rest |
| **Parsing** | pdf-parse | 2.4.5 | PDF text extraction |
| | cheerio | 1.1.2 | JD web scraping |
| **Utils** | axios | 1.13.2 | HTTP requests |
| | nanoid | 5.1.6 | ID generation |
| | date-fns | 4.1.0 | Date utilities |

---

## Project Structure

```
aced_apply/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── upload/              # Resume upload endpoint
│   │   │   └── route.ts
│   │   ├── analyze/             # Main analysis endpoint
│   │   │   └── route.ts
│   │   ├── results/[runId]/     # Get/delete results
│   │   │   └── route.ts
│   │   └── coach/[stage]/       # Interview coach cards
│   │       └── route.ts
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Home page (TODO: upload UI)
│   └── globals.css              # Global styles
│
├── lib/                         # Business Logic
│   ├── db/                      # Database
│   │   ├── prisma.ts           # Prisma client singleton
│   │   └── index.ts
│   │
│   ├── parsers/                 # Text extraction
│   │   ├── resume-parser.ts    # PDF → structured resume
│   │   ├── jd-parser.ts        # URL/text → structured JD
│   │   └── index.ts
│   │
│   ├── rules/                   # Deterministic logic
│   │   ├── fit-map-rules.ts    # Keyword extraction, fit scoring
│   │   └── index.ts
│   │
│   ├── openai/                  # AI integration
│   │   ├── client.ts           # OpenAI wrapper with structured outputs
│   │   ├── schemas.ts          # Zod schemas for AI responses
│   │   └── index.ts
│   │
│   ├── analyzers/               # Core analyzers
│   │   ├── fit-map-analyzer.ts          # Rules + AI fit analysis
│   │   ├── change-advisor-analyzer.ts   # Resume suggestions
│   │   ├── interviewer-lens-analyzer.ts # Interview insights
│   │   ├── prep-kit-generator.ts        # 7-day prep plan
│   │   └── index.ts
│   │
│   ├── s3/                      # File storage
│   │   ├── client.ts           # S3 upload/download with KMS
│   │   └── index.ts
│   │
│   └── utils/                   # Utilities
│       └── cn.ts               # Tailwind class merger
│
├── types/                       # TypeScript types
│   └── index.ts                # Shared type definitions
│
├── prisma/                      # Database
│   ├── schema.prisma           # Database schema
│   ├── seed.ts                 # Seed script (CoachCards)
│   └── migrations/             # Migration files
│
├── components/                  # UI Components (TODO)
│   ├── ui/                     # shadcn/ui primitives
│   ├── features/               # Feature components
│   └── layout/                 # Layout components
│
├── .env                         # Environment variables
├── .env.example                # Environment template
├── package.json                # Dependencies
├── tsconfig.json               # TypeScript config
├── prisma.config.ts            # Prisma 7 config
└── prd.txt                     # Product requirements
```

---

## Database Schema

### Core Models

#### **JobRun** (Main entity)
- Links JD + Resume → Analysis results
- Tracks performance metrics (TTFI, total duration)
- 30-day auto-expiration
- Relations: JD, Resume, FitMap, ChangeAdvisor, InterviewerLens, PrepKit

#### **JobDescription**
- Structured JD data (title, company, requirements, etc.)
- Behavior cues inferred from language
- Reusable across multiple runs

#### **Resume**
- S3 key for PDF
- Parsed sections (experience, skills, education)
- Extracted bullets with metadata

### Analysis Results

#### **FitMap**
- Overall fit level (FIT | BORDERLINE | NOT_FIT)
- Confidence score
- Overlap/gaps/under-evidenced arrays with provenance

#### **ChangeAdvisor** + **ChangeAdvisorSuggestion**
- 6+ suggestions with diff-style guidance
- Citations to JD/resume text spans
- ATS warnings
- User feedback (PENDING | ACCEPTED | DISMISSED)

#### **InterviewerLens**
- Competencies (what's measured)
- Likely interview formats
- Company behavior cues with JD citations

#### **PrepKit** + **PrepDay**
- 7 days of prep tasks
- Gap references
- Rubrics (4 levels)
- Progress tracking

#### **CoachCard** (Pre-seeded)
- 7 interview stages
- What's measured, scaffold, failure modes, follow-ups

### Enums

```prisma
enum RunStatus { PROCESSING | COMPLETED | FAILED }
enum FitLevel { FIT | BORDERLINE | NOT_FIT }
enum SuggestionStatus { PENDING | ACCEPTED | DISMISSED }
enum InterviewStage { RECRUITER | TECH_SCREEN | SYSTEM_DESIGN | BEHAVIORAL | HIRING_MANAGER | ONSITE | OFFER }
```

---

## Core Components

### 1. Parsers

#### Resume Parser ([lib/parsers/resume-parser.ts](lib/parsers/resume-parser.ts))
```typescript
parseResume(buffer: Buffer) → ParsedResume
```
- Extracts text from PDF
- Sections: experience, skills, education, projects
- Bullet analysis: metrics, action verbs, word count

#### JD Parser ([lib/parsers/jd-parser.ts](lib/parsers/jd-parser.ts))
```typescript
parseJobDescription({ url?, text? }) → ParsedJD
```
- Fetches from URL or parses text
- Extracts: title, company, requirements, keywords
- Detects behavior cues (ownership, regulated, on-call, etc.)

---

### 2. Rules Engine

#### Fit Map Rules ([lib/rules/fit-map-rules.ts](lib/rules/fit-map-rules.ts))

**Deterministic keyword extraction:**
- Languages (Python, Java, etc.)
- Frameworks (React, Django, etc.)
- Databases, cloud, tools, concepts

**Fit scoring algorithm:**
```typescript
score = (overlaps × 2) - (high_gaps × 3) - (med_gaps × 1.5) - (low_gaps × 0.5)

if score ≥ 10  → FIT
if score ≥ 5   → BORDERLINE
else           → NOT_FIT
```

**LLM assistance trigger:**
- Too few matches (< 3 overlaps + gaps)
- Borderline case
- Confidence < 0.7

---

### 3. OpenAI Integration

#### Client ([lib/openai/client.ts](lib/openai/client.ts))
```typescript
generateStructuredOutput<T>({
  prompt,
  schema: ZodSchema<T>,
  context: { jd, resume }
}) → OpenAIResponse<T>
```

**Configuration:**
- Model: `gpt-4o-2024-08-06`
- Temperature: `0.1` (low for consistency)
- Response format: Structured JSON via Zod schemas
- Logs model version for audit trail

**Schemas ([lib/openai/schemas.ts](lib/openai/schemas.ts)):**
- FitMapEnhancementSchema
- ChangeAdvisorResponseSchema
- InterviewerLensResponseSchema
- PrepKitResponseSchema

---

### 4. Analyzers

#### Fit Map Analyzer ([lib/analyzers/fit-map-analyzer.ts](lib/analyzers/fit-map-analyzer.ts))

**Flow:**
1. Run deterministic rules (keyword matching)
2. Calculate initial fit score
3. **IF** ambiguous → enhance with LLM
4. Save to database

**Output:** Overlap, gaps, under-evidenced items with provenance

---

#### Change Advisor ([lib/analyzers/change-advisor-analyzer.ts](lib/analyzers/change-advisor-analyzer.ts))

**Generates:**
- 6+ suggestions (≤28 words each)
- 80%+ must include metric/artifact prompt
- Diff-style: current bullet → suggested bullet
- ATS warnings (tables, columns, formatting)

**Validation:**
- Word count check
- Confidence threshold
- Metric/artifact requirement

---

#### Interviewer Lens ([lib/analyzers/interviewer-lens-analyzer.ts](lib/analyzers/interviewer-lens-analyzer.ts))

**Based ONLY on JD:**
- 4-6 competencies (what good looks like)
- 2-4 interview formats
- 2-5 behavior cues with JD phrase citations

---

#### Prep Kit Generator ([lib/analyzers/prep-kit-generator.ts](lib/analyzers/prep-kit-generator.ts))

**7-day plan:**
- Each day targets one gap (prioritized by severity)
- Includes: inputs, practice task, 4-level rubric, artifact, timebox
- Company behavior context integrated

---

### 5. S3 Storage

#### S3 Client ([lib/s3/client.ts](lib/s3/client.ts))

**Features:**
- KMS encryption at rest
- Namespaced uploads: `resumes/{userId}/{timestamp}-{id}.pdf`
- Pre-signed URLs for temporary access
- 30-day retention cleanup support

---

## API Endpoints

### POST /api/upload

**Request:**
```typescript
FormData {
  resume: File (PDF, max 5MB)
}
```

**Response:**
```json
{
  "success": true,
  "resumeId": "cm...",
  "s3Key": "resumes/anonymous/...",
  "message": "Resume uploaded and parsed successfully"
}
```

**Flow:**
1. Validate file (PDF, < 5MB)
2. Upload to S3 with KMS encryption
3. Parse PDF → extract text & structure
4. Save to database

---

### POST /api/analyze

**Request:**
```json
{
  "jdUrl": "https://...",  // OR
  "jdText": "...",         // paste directly
  "resumeId": "cm..."
}
```

**Response:**
```json
{
  "success": true,
  "runId": "cm...",
  "status": "COMPLETED",
  "ttfi": 45000,           // ms
  "totalDuration": 120000, // ms
  "metrics": {
    "ttfiMet": true,       // ≤60s
    "fullRunMet": true     // ≤180s
  }
}
```

**Orchestration Flow:**

```
┌─────────────────────────────────────┐
│ 1. Parse JD (fetch/parse)           │ ~5-10s
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│ 2. Create JobRun (PROCESSING)       │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│ 3. PRIORITY 1: Fit Map              │ ~30-45s
│    (deterministic + AI if needed)   │
└──────────────┬──────────────────────┘
               │
               │ TTFI ≤ 60s ✓
               │
┌──────────────▼──────────────────────┐
│ 4. PRIORITY 2: Parallel             │
│    - Change Advisor                 │ ~45-60s
│    - Interviewer Lens               │ ~30-40s
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│ 5. PRIORITY 3: Prep Kit             │ ~60-90s
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│ 6. Update JobRun (COMPLETED)        │
│    Save: ttfi, totalDuration        │
└─────────────────────────────────────┘

FULL RUN ≤ 180s ✓
```

---

### GET /api/results/[runId]

**Response:**
```json
{
  "runId": "cm...",
  "status": "COMPLETED",
  "ttfi": 45000,
  "totalDuration": 120000,
  "jd": { "title": "...", "company": "..." },
  "fitMap": { "overallFit": "FIT", "confidence": 0.85, ... },
  "changeAdvisor": { "suggestions": [...], "atsWarnings": [...] },
  "lens": { "competencies": [...], "likelyFormats": [...], ... },
  "prepKit": { "days": [...] }
}
```

**Also supports:**
- `DELETE /api/results/[runId]` - Self-serve data deletion

---

### GET /api/coach/[stage]

**Stages:** recruiter | tech_screen | system_design | behavioral | hiring_manager | onsite | offer

**Response:**
```json
{
  "stage": "TECH_SCREEN",
  "whatMeasured": ["Coding fundamentals", "Problem-solving", ...],
  "scaffold": "TECHNICAL SCREEN FRAMEWORK:\n...",
  "failureModes": ["Jumping into code without...", ...],
  "followUps": ["How would this scale...", ...]
}
```

---

## Data Flow

### Upload → Analyze → Results

```
┌──────────┐
│  Browser │
└─────┬────┘
      │ POST /api/upload (PDF)
      ▼
┌─────────────┐
│ Upload API  │──┐
└─────┬───────┘  │ 1. S3 upload (KMS encrypted)
      │          │ 2. PDF parse
      │          │ 3. Save Resume record
      │          │
      │ ◄────────┘
      │ { resumeId }
      │
      │ POST /api/analyze { resumeId, jdUrl }
      ▼
┌──────────────┐
│ Analyze API  │──┐
└─────┬────────┘  │ 1. Parse JD
      │           │ 2. Create JobRun
      │           │ 3. Run analyzers (parallel)
      │           │    - FitMap (rules → AI if needed)
      │           │    - ChangeAdvisor
      │           │    - InterviewerLens
      │           │    - PrepKit
      │           │ 4. Save all results
      │ ◄─────────┘
      │ { runId, ttfi, totalDuration }
      │
      │ GET /api/results/[runId]
      ▼
┌──────────────┐
│ Results API  │──► { fitMap, changeAdvisor, lens, prepKit }
└──────────────┘
```

---

## Performance Targets

| Metric | Target | Implementation |
|--------|--------|---------------|
| **TTFI** | ≤ 60s | Fit Map runs first, highest priority |
| **Full Run** | ≤ 180s (P95) | Parallel execution (Promise.allSettled) |
| **Cache JD** | - | TODO: Redis for repeated JDs |
| **Model Calls** | Minimize | Rules first, AI only if ambiguous |

**Current Strategy:**
- FitMap: deterministic rules → 30s, AI enhancement (if needed) → +15s
- ChangeAdvisor + Lens: parallel → ~60s total
- PrepKit: depends on previous results → 60-90s

**Future Optimizations:**
- Cache JD analyses (Redis)
- Edge functions for parsing
- Batch OpenAI calls
- Streaming results as ready

---

## Next Steps

### Phase 2: Frontend UI (Week 4)

**Tasks:**
1. Install shadcn/ui components
2. Build upload flow UI:
   - File upload dropzone
   - JD input (URL or paste)
   - Progress indicator
3. Create Fit Map visualization:
   - Fit badge (FIT/BORDERLINE/NOT_FIT)
   - Overlap/gaps lists
   - Provenance tooltips (show JD/resume citations)
4. Build Change Advisor UI:
   - Diff-style suggestion cards
   - Current → Suggested side-by-side
   - Copy button + Accept/Dismiss actions
   - ATS warnings alerts
5. Create Interviewer Lens view:
   - Competencies grid
   - Interview formats timeline
   - Behavior cues with JD phrase citations
6. Build 7-Day Prep Kit:
   - Calendar/timeline view
   - Expandable day cards
   - Rubric viewer
   - Progress tracking checkboxes
7. Create Interview Coach cards:
   - Stage selector
   - Collapsible sections (scaffold, failure modes, follow-ups)

### Phase 3: Polish & Production (Week 5-6)

**Tasks:**
1. Mobile responsiveness
2. Accessibility (WCAG AA)
   - Keyboard navigation
   - ARIA labels
   - Color contrast
3. Performance optimization
   - Code splitting
   - Image optimization
   - Lighthouse audit (target: ≥90)
4. Security
   - Rate limiting
   - PII redaction in logs
   - Input validation
5. Monitoring
   - Error tracking (Sentry)
   - Analytics (Vercel Analytics)
   - Performance monitoring
6. Testing
   - End-to-end tests
   - Load testing
   - Manual QA with sample JDs
7. Deployment
   - Set up PostgreSQL (Neon, Supabase, or RDS)
   - Configure S3 bucket + KMS
   - Deploy to Vercel
   - Set up environment variables
   - Run migrations + seed data

---

## Environment Variables

See [.env.example](.env.example) for complete list.

**Required:**
```bash
DATABASE_URL="postgresql://..."
OPENAI_API_KEY="sk-..."
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_S3_BUCKET="aced-apply-resumes"
```

**Optional:**
```bash
AWS_KMS_KEY_ID="..."           # For encryption at rest
REDIS_URL="..."                # For caching
RATE_LIMIT_MAX="10"
DATA_RETENTION_DAYS="30"
```

---

## Development Setup

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Generate Prisma client
npm run db:generate

# Push schema to database (or run migrations)
npm run db:push

# Seed coach cards
npm run db:seed

# Start development server
npm run dev
```

**Database:**
- Use `prisma dev` for local PostgreSQL, or
- Connect to cloud database (Neon, Supabase, etc.)

---

## Success Criteria (from PRD)

✅ **Phase 1 Complete:**
- [x] Database schema with all models
- [x] Parsers (resume + JD)
- [x] Rules engine (deterministic fit analysis)
- [x] OpenAI integration (structured outputs)
- [x] All 4 analyzers (FitMap, ChangeAdvisor, Lens, PrepKit)
- [x] API routes (upload, analyze, results, coach)
- [x] CoachCard seed data (7 stages)

⏳ **Phase 2 TODO:**
- [ ] Upload UI
- [ ] Results visualization
- [ ] Mobile responsive
- [ ] Accessibility compliance

⏳ **Phase 3 TODO:**
- [ ] Performance optimization (TTFI ≤ 60s, Full ≤ 180s)
- [ ] Security hardening
- [ ] Production deployment
- [ ] Monitoring & analytics

---

## Architecture Decisions

### Why Deterministic Rules First?
**PRD Requirement:** "Not an AI wrapper - deterministic heuristics precede model calls"

**Benefits:**
- Faster (no API latency for clear cases)
- Cheaper (fewer OpenAI calls)
- More predictable and debuggable
- Transparent provenance (show exactly why)

**Implementation:**
- Keyword extraction via regex patterns
- Scoring algorithm for fit level
- LLM only for ambiguous cases (< 30% of runs)

### Why Next.js App Router?
- SSR for SEO and performance
- Built-in API routes (no separate backend)
- Server Actions for simplified data mutations
- React 19 + TypeScript support
- Vercel deployment optimized

### Why Prisma 7?
- Type-safe database queries
- Auto-generated types sync with schema
- Migration system for version control
- JSON field support for flexible data
- Excellent TypeScript DX

### Why OpenAI Structured Outputs?
- Guaranteed JSON schema compliance
- No need for brittle parsing
- Low temperature for consistency
- Function calling alternative
- Model version logging built-in

---

## Contributing

**Code Standards:**
- TypeScript strict mode
- Functional components (React)
- Server-first API routes
- Error boundaries for client components
- Comprehensive error logging

**Git Workflow:**
- Main branch: production-ready code
- Feature branches for development
- PRs required for main
- Conventional commit messages

---

**Last Updated:** November 2025
**Version:** 1.0.0 (MVP Phase 1)
