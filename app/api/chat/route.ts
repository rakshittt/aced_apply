import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { prisma } from '@/lib/db';

export const maxDuration = 30;

export async function POST(req: Request) {
    let messages, runId;
    try {
        const body = await req.json();
        messages = body.messages;
        runId = body.runId;
    } catch (e) {
        return new Response('Invalid JSON', { status: 400 });
    }

    try {
        if (!runId) {
            console.error('[Chat API] Missing runId');
            return new Response('Missing runId', { status: 400 });
        }

        // Fetch context
        const run = await prisma.jobRun.findUnique({
            where: { id: runId },
            include: {
                jd: {
                    include: {
                        recruiterPriority: true,
                        companyResearch: true,
                    }
                },
                resume: true,
                fitMap: true,
                lens: true,
            },
        });

        if (!run) {
            console.error('[Chat API] Run not found:', runId);
            return new Response('Run not found', { status: 404 });
        }

        // Fetch Global Context & Resume Portfolio
        let globalContext = '';
        let resumePortfolioContext = '';

        if (run.userId) {
            // 1. Fetch Resume Portfolio
            const allResumes = await prisma.resume.findMany({
                where: { userId: run.userId },
                select: { id: true, name: true, isDefault: true, uploadedAt: true }
            });

            if (allResumes.length > 0) {
                const resumeList = allResumes.map(r =>
                    `- ${r.name || 'Untitled Resume'} (Uploaded: ${r.uploadedAt.toLocaleDateString()}) ${r.id === run.resumeId ? '[CURRENTLY USED]' : ''}`
                ).join('\n');
                resumePortfolioContext = `
RESUME PORTFOLIO:
The user has the following resumes available. If the current resume isn't the best fit for this specific JD, recommend switching to a more relevant one.
${resumeList}
`;
            }

            // 2. Fetch Job History (Expanded to 20 for better pattern recognition)
            const pastRuns = await prisma.jobRun.findMany({
                where: {
                    userId: run.userId,
                    id: { not: runId },
                    status: 'COMPLETED',
                },
                orderBy: { createdAt: 'desc' },
                take: 20,
                include: {
                    jd: true,
                    fitMap: true,
                },
            });

            if (pastRuns.length > 0) {
                const history = pastRuns.slice(0, 5).map(r =>
                    `- Role: ${r.jd.title} at ${r.jd.company || 'Unknown'} (Fit: ${r.fitMap?.overallFit})`
                ).join('\n');

                // Aggregate recurring gaps
                const allGaps = pastRuns.flatMap(r => (r.fitMap?.gaps as any[]) || []).map(g => g.skill);
                const gapCounts = allGaps.reduce((acc, gap) => {
                    acc[gap] = (acc[gap] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);
                const recurringGaps = Object.entries(gapCounts)
                    .filter(([_, count]) => (count as number) > 1)
                    .map(([gap]) => gap)
                    .join(', ');

                // Infer User Profile / Intent
                const titles = pastRuns.map(r => r.jd.title);
                // Simple frequency map for titles to guess intent
                // (This is a heuristic, a real implementation might use AI to summarize)

                globalContext = `
GLOBAL CONTEXT (User Profile & History):
- **Recent Activity:**
${history}
- **Recurring Gaps:** ${recurringGaps || 'None detected yet.'}
- **Inferred Goal:** The user is applying for roles like: ${titles.slice(0, 3).join(', ')}.
`;
            }
        }

        // Construct System Prompt
        const systemPrompt = `You are an elite Interview Coach & Career Strategist acting as a "Smart Companion" for the user.
Your goal is to help them land the job of "${run.jd.title}" at "${run.jd.company || 'the company'}", but also to guide their broader strategy.

CURRENT ANALYSIS CONTEXT:
- **Job Description:** ${run.jd.rawText.substring(0, 1000)}...
- **Candidate Resume:** ${run.resume.rawText.substring(0, 1000)}...
- **Fit Score:** ${run.fitMap?.overallFit} (Confidence: ${run.fitMap?.confidence})
- **Hiring Manager Memo:** "${(run.fitMap as any)?.hiringManagerMemo || 'N/A'}"
- **Key Priorities:** ${(run.jd.recruiterPriority?.requirements as any[])?.map((r: any) => r.requirement).join(', ') || 'N/A'}
- **Company Culture:** ${(run.jd.companyResearch?.cultureSignals as any[])?.map((s: any) => s.signal).join(', ') || 'N/A'}

${globalContext}
${resumePortfolioContext}

YOUR MISSION:
1.  **Analyze the Fit:** Use the "Current Analysis Context" to give specific advice on gaps and strengths.
2.  **Strategic Companion:**
    *   If the user has a better resume in their portfolio (e.g., a "Product Manager" resume for a PM role instead of their "General" one), SUGGEST SWITCHING.
    *   If you see recurring gaps across their history, warn them: "I noticed you often lack X. Here is how to fix it once and for all."
    *   Understand their seniority level based on the roles they apply for.
3.  **Mock Interview:** If asked, conduct a tough but fair mock interview based on the JD's "Key Priorities".

TONE:
Professional, insightful, "in your corner" but straight-talking. You are not just a chatbot; you are a career agent.`;

        const result = streamText({
            model: openai('gpt-4o'),
            system: systemPrompt,
            messages,
        });

        return result.toTextStreamResponse();
    } catch (error) {
        console.error('[Chat API] Error:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
}
