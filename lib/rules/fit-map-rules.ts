/**
 * Deterministic Rules Engine for Fit Map
 * PRD: "Not an AI wrapper - deterministic heuristics precede model calls"
 */

import type { OverlapItem, GapItem, UnderEvidencedItem } from '@/types';

export interface KeywordMatch {
  keyword: string;
  inJD: boolean;
  inResume: boolean;
  jdPositions: number[];
  resumePositions: { section: string; index: number; position: number }[];
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extract keywords from text using deterministic rules
 */
export function extractKeywords(text: string): Set<string> {
  const keywords = new Set<string>();

  // Programming languages
  const languages = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust',
    'Ruby', 'PHP', 'Swift', 'Kotlin', 'Scala', 'R', 'MATLAB', 'SQL',
  ];

  // Frameworks & Libraries
  const frameworks = [
    'React', 'Vue', 'Angular', 'Next.js', 'Node.js', 'Express', 'Django',
    'Flask', 'Spring', 'Rails', 'Laravel', 'ASP.NET', 'FastAPI', 'NestJS',
  ];

  // Databases
  const databases = [
    'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'DynamoDB',
    'Cassandra', 'Oracle', 'SQL Server', 'MariaDB', 'Neo4j', 'Couchbase',
  ];

  // Cloud & DevOps
  const cloudDevOps = [
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'Ansible',
    'Jenkins', 'CircleCI', 'GitLab CI', 'GitHub Actions', 'CloudFormation',
  ];

  // Tools & Platforms
  const tools = [
    'Git', 'GitHub', 'GitLab', 'Jira', 'Confluence', 'Slack', 'Figma',
    'VS Code', 'IntelliJ', 'Postman', 'Grafana', 'Prometheus', 'Datadog',
  ];

  // Concepts & Methodologies
  const concepts = [
    'API', 'REST', 'GraphQL', 'gRPC', 'microservices', 'serverless',
    'CI/CD', 'DevOps', 'Agile', 'Scrum', 'TDD', 'BDD', 'DDD',
    'machine learning', 'deep learning', 'data science', 'analytics',
  ];

  const allKeywords = [
    ...languages,
    ...frameworks,
    ...databases,
    ...cloudDevOps,
    ...tools,
    ...concepts,
  ];

  // Case-insensitive matching
  const lowerText = text.toLowerCase();
  for (const keyword of allKeywords) {
    const escapedKeyword = escapeRegex(keyword.toLowerCase());
    const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'gi');
    if (regex.test(lowerText)) {
      keywords.add(keyword);
    }
  }

  // Extract years of experience
  const experienceMatch = text.match(/(\d+)\+?\s*years?\s+(?:of\s+)?experience/i);
  if (experienceMatch) {
    keywords.add(`${experienceMatch[1]}+ years`);
  }

  return keywords;
}

/**
 * Find overlaps between JD and resume using deterministic keyword matching
 */
export function findOverlaps(jdText: string, resumeText: string): OverlapItem[] {
  const jdKeywords = extractKeywords(jdText);
  const resumeKeywords = extractKeywords(resumeText);

  const overlaps: OverlapItem[] = [];

  for (const keyword of jdKeywords) {
    if (resumeKeywords.has(keyword)) {
      // Find positions in JD
      const escapedKeyword = escapeRegex(keyword);
      const jdRegex = new RegExp(`\\b${escapedKeyword}\\b`, 'gi');
      const jdMatch = jdRegex.exec(jdText);

      // Find positions in resume
      const resumeRegex = new RegExp(`\\b${escapedKeyword}\\b`, 'gi');
      const resumeMatch = resumeRegex.exec(resumeText);

      if (jdMatch && resumeMatch) {
        overlaps.push({
          skill: keyword,
          jdSpan: {
            text: jdMatch[0],
            start: jdMatch.index,
            end: jdMatch.index + jdMatch[0].length,
          },
          resumeSpan: {
            text: resumeMatch[0],
            section: 'skills', // Will be refined by parser
            index: 0,
          },
          confidence: 0.9, // High confidence for exact keyword match
        });
      }
    }
  }

  return overlaps;
}

/**
 * Find gaps (skills in JD but not in resume)
 */
export function findGaps(jdText: string, resumeText: string): GapItem[] {
  const jdKeywords = extractKeywords(jdText);
  const resumeKeywords = extractKeywords(resumeText);

  const gaps: GapItem[] = [];

  for (const keyword of jdKeywords) {
    if (!resumeKeywords.has(keyword)) {
      // Find position in JD
      const escapedKeyword = escapeRegex(keyword);
      const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'gi');
      const match = regex.exec(jdText);

      if (match) {
        // Determine severity based on context
        const severity = determineSeverity(keyword, jdText);

        gaps.push({
          skill: keyword,
          jdSpan: {
            text: match[0],
            start: match.index,
            end: match.index + match[0].length,
          },
          severity,
        });
      }
    }
  }

  return gaps;
}

/**
 * Find under-evidenced skills (mentioned but not demonstrated)
 */
export function findUnderEvidenced(
  resumeText: string,
  resumeBullets: string[]
): UnderEvidencedItem[] {
  const underEvidenced: UnderEvidencedItem[] = [];
  const resumeKeywords = extractKeywords(resumeText);

  for (const keyword of resumeKeywords) {
    // Check if keyword appears in bullets with actual evidence
    const escapedKeyword = escapeRegex(keyword);
    const hasEvidence = resumeBullets.some(bullet => {
      const hasBullet = new RegExp(`\\b${escapedKeyword}\\b`, 'i').test(bullet);
      const hasMetric = /\d+%|\d+x|\$\d+|increased|reduced|improved/i.test(bullet);
      const hasAction = /^(built|created|developed|designed|implemented|led)/i.test(bullet);
      return hasBullet && (hasMetric || hasAction);
    });

    if (!hasEvidence) {
      const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'gi');
      const match = regex.exec(resumeText);

      if (match) {
        underEvidenced.push({
          skill: keyword,
          resumeSpan: {
            text: match[0],
            section: 'skills',
            index: 0,
          },
          reason: 'Mentioned but not demonstrated with metrics or specific accomplishments',
        });
      }
    }
  }

  return underEvidenced;
}

/**
 * Determine gap severity based on JD context
 */
function determineSeverity(
  keyword: string,
  jdText: string
): 'HIGH' | 'MEDIUM' | 'LOW' {
  const context = extractContext(keyword, jdText, 100);

  // High severity if in "required" or "must have" section
  if (/required|must have|essential/i.test(context)) {
    return 'HIGH';
  }

  // Medium severity if in "responsibilities" or mentioned multiple times
  const occurrences = (jdText.match(new RegExp(`\\b${keyword}\\b`, 'gi')) || []).length;
  if (/responsibilities|your role|what you'll do/i.test(context) || occurrences > 2) {
    return 'MEDIUM';
  }

  // Low severity for "nice to have" or single mentions
  return 'LOW';
}

/**
 * Extract context around a keyword
 */
function extractContext(keyword: string, text: string, radius: number): string {
  const regex = new RegExp(`\\b${keyword}\\b`, 'i');
  const match = regex.exec(text);

  if (!match) return '';

  const start = Math.max(0, match.index - radius);
  const end = Math.min(text.length, match.index + match[0].length + radius);

  return text.slice(start, end);
}

/**
 * Calculate overall fit based on overlaps and gaps
 */
export function calculateFit(
  overlaps: OverlapItem[],
  gaps: GapItem[]
): { level: 'FIT' | 'BORDERLINE' | 'NOT_FIT'; confidence: number } {
  const overlapScore = overlaps.length * 2;
  const highGapPenalty = gaps.filter(g => g.severity === 'HIGH').length * 3;
  const mediumGapPenalty = gaps.filter(g => g.severity === 'MEDIUM').length * 1.5;
  const lowGapPenalty = gaps.filter(g => g.severity === 'LOW').length * 0.5;

  const totalScore = overlapScore - highGapPenalty - mediumGapPenalty - lowGapPenalty;

  // Calculate confidence based on clarity of the signal
  const totalItems = overlaps.length + gaps.length;
  const confidence = totalItems > 0 ? Math.min(0.95, 0.5 + (totalItems / 30)) : 0.5;

  if (totalScore >= 10) {
    return { level: 'FIT', confidence };
  } else if (totalScore >= 5) {
    return { level: 'BORDERLINE', confidence };
  } else {
    return { level: 'NOT_FIT', confidence };
  }
}

/**
 * Check if LLM assistance is needed for ambiguous cases
 */
export function needsLLMAssistance(overlaps: OverlapItem[], gaps: GapItem[]): boolean {
  // Use LLM if:
  // 1. Very few clear matches (< 3)
  // 2. Borderline case with mixed signals
  // 3. Many items but low overall confidence

  if (overlaps.length < 3 && gaps.length < 3) {
    return true; // Too few data points
  }

  const fit = calculateFit(overlaps, gaps);
  if (fit.level === 'BORDERLINE') {
    return true; // Ambiguous case
  }

  if (fit.confidence < 0.7) {
    return true; // Low confidence
  }

  return false;
}
