/**
 * OpenAI Client with Structured Outputs
 * Low temperature, deterministic, with provenance tracking
 */

import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';

// Validate API key exists
if (!process.env.OPENAI_API_KEY) {
  throw new Error(
    'OPENAI_API_KEY environment variable is not set. Please add it to your .env file.'
  );
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-2024-08-06';
const DEFAULT_TEMPERATURE = 0.1; // Low temp for consistency

export interface OpenAIRequest<T> {
  prompt: string;
  schema: z.ZodType<T>;
  schemaName: string;
  context: {
    jd: string;
    resume: string;
  };
  temperature?: number;
  model?: string;
}

export interface OpenAIResponse<T> {
  data: T;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string;
}

/**
 * Generate structured output from OpenAI with type safety
 */
export async function generateStructuredOutput<T>(
  request: OpenAIRequest<T>
): Promise<OpenAIResponse<T>> {
  const {
    prompt,
    schema,
    schemaName,
    context,
    temperature = DEFAULT_TEMPERATURE,
    model = DEFAULT_MODEL,
  } = request;

  try {
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(prompt, context);

    const completion = await openai.chat.completions.create({
      model,
      temperature,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: zodResponseFormat(schema, schemaName),
    });

    const choice = completion.choices[0];
    const messageContent = choice.message?.content;

    if (!messageContent) {
      throw new Error('No content returned from OpenAI');
    }

    // Parse the JSON response and validate with Zod
    let data: T;
    try {
      const jsonData = JSON.parse(messageContent);
      data = schema.parse(jsonData);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', messageContent);
      throw new Error(`Invalid response format: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

    // Log model version for audit trail
    await logModelUsage(model, completion.usage);

    return {
      data,
      model: completion.model,
      usage: {
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0,
      },
      finishReason: choice.finish_reason,
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    // Preserve the original error for debugging
    throw new Error(
      `Failed to generate structured output from OpenAI: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Build system prompt enforcing PRD requirements
 */
function buildSystemPrompt(): string {
  return `You are a precise resume analyzer for a job application platform.

CRITICAL REQUIREMENTS:
1. Return ONLY structured JSON matching the exact schema provided
2. Base all analysis on EVIDENCE from the JD and resume - cite specific phrases
3. Require METRICS or ARTIFACTS in ≥80% of suggestions
4. Flag clichés and generic language - we want authentic, specific advice
5. Be conservative with confidence scores - only high confidence when evidence is clear
6. For keywords, ONLY mirror when truly essential for ATS - don't over-optimize
7. Keep suggestions to ≤28 words each
8. Focus on "why" - explain reasoning with citations

You are NOT a generic AI wrapper. You are a deterministic analyzer that happens to use AI for structured extraction.`;
}

/**
 * Build user prompt with context
 */
function buildUserPrompt(prompt: string, context: { jd: string; resume: string }): string {
  return `${prompt}

JOB DESCRIPTION:
${context.jd}

RESUME:
${context.resume}

Analyze the above and return structured JSON according to the schema.`;
}

/**
 * Log model usage for audit trail (async, non-blocking)
 */
async function logModelUsage(
  model: string,
  usage: OpenAI.Completions.CompletionUsage | undefined
): Promise<void> {
  // TODO: Implement logging to database or analytics service
  // For now, just console log in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[OpenAI]', {
      model,
      tokens: usage?.total_tokens,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Batch process multiple requests in parallel (for performance)
 */
export async function generateBatch<T>(
  requests: OpenAIRequest<T>[]
): Promise<OpenAIResponse<T>[]> {
  return Promise.all(requests.map(req => generateStructuredOutput(req)));
}

export { openai };
