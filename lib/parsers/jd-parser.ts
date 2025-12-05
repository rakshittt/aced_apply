/**
 * Job Description Parser
 * Fetches and parses job postings from URLs or raw text
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import type { ParsedJD, BehaviorCues } from '@/types';

/**
 * Fetch JD from URL
 */
export async function fetchJDFromURL(url: string): Promise<string> {
  try {
    // Validate URL format
    try {
      new URL(url);
    } catch {
      throw new Error('Invalid URL format');
    }

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AcedApply/1.0)',
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);

    // Remove script and style tags
    $('script, style, nav, header, footer').remove();

    // Try to find the main job description container
    const selectors = [
      '.job-description',
      '#job-description',
      '[class*="description"]',
      '[class*="job-details"]',
      'main',
      'article',
      'body',
    ];

    for (const selector of selectors) {
      const element = $(selector);
      if (element.length && element.text().length > 200) {
        return element.text().trim();
      }
    }

    // Fallback: get all text from body
    return $('body').text().trim();
  } catch (error) {
    console.error('Error fetching JD from URL:', error);
    throw new Error('Failed to fetch job description from URL');
  }
}

/**
 * Parse JD text to extract structured data
 */
export function parseJD(text: string): ParsedJD {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);

  // Extract basic information
  const title = extractTitle(text);
  const company = extractCompany(text);
  const location = extractLocation(text);

  // Extract sections
  const requirements = extractSection(text, [
    'requirements',
    'required qualifications',
    'minimum qualifications',
    'what you need',
  ]);

  const responsibilities = extractSection(text, [
    'responsibilities',
    'what you\'ll do',
    'role description',
    'about the role',
    'your role',
  ]);

  const qualifications = extractSection(text, [
    'qualifications',
    'preferred qualifications',
    'nice to have',
    'bonus points',
    'preferred experience',
  ]);

  // Extract keywords (skills, technologies, tools)
  const keywords = extractKeywords(text);

  // Detect company behavior cues from JD language
  const behaviorCues = detectBehaviorCues(text);

  return {
    rawText: text,
    title,
    company,
    location,
    requirements,
    responsibilities,
    qualifications,
    keywords,
    behaviorCues,
  };
}

/**
 * Main JD parser (handles both URL and text)
 */
export async function parseJobDescription(
  input: { url?: string; text?: string }
): Promise<ParsedJD> {
  let text: string;

  if (input.url) {
    text = await fetchJDFromURL(input.url);
  } else if (input.text) {
    text = input.text;
  } else {
    throw new Error('Either URL or text must be provided');
  }

  return parseJD(text);
}

// ============================================================================
// Helper Functions
// ============================================================================

function extractTitle(text: string): string {
  // Try to find job title patterns
  const patterns = [
    /(?:Job Title|Position|Role):\s*(.+)/i,
    /^(.+?)\s*(?:at|@)\s*/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  // Fallback: take first line that looks like a title
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 5)) {
    if (line.length < 80 && /engineer|developer|manager|analyst|designer/i.test(line)) {
      return line;
    }
  }

  return 'Software Engineer'; // Default fallback
}

function extractCompany(text: string): string | undefined {
  const patterns = [
    /(?:Company|Organization):\s*(.+)/i,
    /at\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return undefined;
}

function extractLocation(text: string): string | undefined {
  // Common location patterns
  const patterns = [
    /Location:\s*(.+)/i,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z]{2})/,
    /Remote|Hybrid|On-site/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }

  return undefined;
}

function extractSection(text: string, headerPatterns: string[]): string[] {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  const items: string[] = [];
  let inSection = false;
  let sectionEndMarkers = [
    'qualifications',
    'requirements',
    'responsibilities',
    'benefits',
    'about',
    'we offer',
    'compensation',
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();

    // Check if we're entering the section
    if (!inSection && headerPatterns.some(pattern => lowerLine.includes(pattern))) {
      inSection = true;
      continue;
    }

    // Check if we're leaving the section
    if (inSection && sectionEndMarkers.some(marker => lowerLine.startsWith(marker))) {
      break;
    }

    // Collect items in the section
    if (inSection) {
      // Check if line is a bullet point or numbered item
      if (/^[-•●○▪▫★✓✔➤➢➣⇒]|\d+\./.test(line) || line.length > 20) {
        const cleanedLine = line.replace(/^[-•●○▪▫★✓✔➤➢➣⇒]|\d+\./, '').trim();
        if (cleanedLine.length > 10) {
          items.push(cleanedLine);
        }
      }
    }
  }

  return items;
}

function extractKeywords(text: string): string[] {
  const keywords = new Set<string>();

  // Common tech keywords
  const techPatterns = [
    // Languages
    /\b(?:JavaScript|TypeScript|Python|Java|C\+\+|C#|Go|Rust|Ruby|PHP|Swift|Kotlin)\b/gi,
    // Frameworks
    /\b(?:React|Vue|Angular|Next\.js|Node\.js|Express|Django|Flask|Spring|Rails)\b/gi,
    // Databases
    /\b(?:PostgreSQL|MySQL|MongoDB|Redis|Elasticsearch|DynamoDB|Cassandra)\b/gi,
    // Cloud
    /\b(?:AWS|Azure|GCP|Docker|Kubernetes|Terraform|CloudFormation)\b/gi,
    // Tools
    /\b(?:Git|GitHub|GitLab|Jenkins|CircleCI|Jira|Confluence)\b/gi,
    // Concepts
    /\b(?:API|REST|GraphQL|microservices|CI\/CD|DevOps|Agile|Scrum)\b/gi,
  ];

  for (const pattern of techPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      keywords.add(match[0]);
    }
  }

  // Experience level
  const experienceMatch = text.match(/(\d+)\+?\s*years?\s+(?:of\s+)?experience/i);
  if (experienceMatch) {
    keywords.add(`${experienceMatch[1]}+ years experience`);
  }

  return Array.from(keywords);
}

/**
 * Detect company behavior cues from JD language
 * Based on PRD requirement: infer from JD only
 */
function detectBehaviorCues(text: string): BehaviorCues {
  const lowerText = text.toLowerCase();

  return {
    ownership: /owner|ownership|autonomy|self-directed|take initiative|drive|lead/i.test(text),
    regulated: /compliance|regulated|audit|sox|hipaa|gdpr|security clearance|financial/i.test(text),
    onCall: /on-call|on call|24\/7|pager|incident response|production support/i.test(text),
    fastPaced: /fast-paced|fast paced|startup|move quickly|rapid|agile|iterate quickly/i.test(text),
    collaborative: /collaborate|collaboration|cross-functional|teamwork|work with|partner with/i.test(text),
    autonomous: /autonomous|independent|self-motivated|work independently|minimal supervision/i.test(text),
  };
}
