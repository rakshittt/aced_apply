/**
 * Resume Parser
 * Extracts text and structure from PDF resumes
 */

import type {
  ParsedResume,
  ParsedResumeSections,
  ResumeBullet,
  ResumeExperienceItem,
  EducationItem,
  ProjectItem
} from '@/types';

/**
 * Parse PDF buffer to extract text
 * Using pdf-parse which works in Node.js/serverless when externalized
 */
export async function parsePDFToText(buffer: Buffer): Promise<string> {
  try {
    // Dynamic import for pdf-parse (configured as external package in next.config.ts)
    const pdfModule: any = await import('pdf-parse');

    // Debug: Log module structure
    console.log('[PDF Parser] Module keys:', Object.keys(pdfModule));
    console.log('[PDF Parser] Has default?', 'default' in pdfModule);
    console.log('[PDF Parser] Default type:', typeof pdfModule.default);
    console.log('[PDF Parser] Module type:', typeof pdfModule);

    // Handle different export patterns (CJS default vs named exports)
    let pdfParse: any;
    if (typeof pdfModule.default === 'function') {
      pdfParse = pdfModule.default;
      console.log('[PDF Parser] Using default export');
    } else if (typeof pdfModule === 'function') {
      pdfParse = pdfModule;
      console.log('[PDF Parser] Using module as function');
    } else if (pdfModule.PDFParser && typeof pdfModule.PDFParser === 'function') {
      pdfParse = pdfModule.PDFParser;
      console.log('[PDF Parser] Using PDFParser export');
    } else {
      // Last resort: try to find any function in the module
      const keys = Object.keys(pdfModule);
      const funcKey = keys.find(key => typeof pdfModule[key] === 'function');
      if (funcKey) {
        pdfParse = pdfModule[funcKey];
        console.log('[PDF Parser] Using found function:', funcKey);
      } else {
        console.error('[PDF Parser] Module structure:', pdfModule);
        throw new Error('Could not find pdf-parse function in module');
      }
    }

    // Parse the PDF buffer
    const data = await pdfParse(buffer);

    return data.text.trim();
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to parse resume PDF');
  }
}

/**
 * Extract sections from resume text using heuristics
 */
export function extractSections(text: string): ParsedResumeSections {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);

  // Common section headers (case-insensitive)
  const sectionHeaders = {
    experience: /^(work\s+)?experience|employment|professional\s+experience/i,
    education: /^education|academic/i,
    skills: /^(technical\s+)?skills|competencies|technologies/i,
    projects: /^projects|personal\s+projects/i,
    certifications: /^certifications?|licenses?/i,
  };

  const sections: ParsedResumeSections = {
    experience: [],
    skills: [],
    education: [],
    projects: [],
    certifications: [],
  };

  let currentSection: string | null = null;
  let currentExperience: Partial<ResumeExperienceItem> | null = null;
  let currentEducation: Partial<EducationItem> | null = null;
  let currentProject: Partial<ProjectItem> | null = null;
  let bullets: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if this is a section header
    let foundSection = false;
    for (const [sectionName, pattern] of Object.entries(sectionHeaders)) {
      if (pattern.test(line)) {
        // Save previous section data
        if (currentSection === 'experience' && currentExperience) {
          currentExperience.bullets = [...bullets];
          sections.experience.push(currentExperience as ResumeExperienceItem);
          currentExperience = null;
          bullets = [];
        } else if (currentSection === 'education' && currentEducation) {
          sections.education.push(currentEducation as EducationItem);
          currentEducation = null;
        } else if (currentSection === 'projects' && currentProject) {
          sections.projects!.push(currentProject as ProjectItem);
          currentProject = null;
        }

        currentSection = sectionName;
        foundSection = true;
        break;
      }
    }

    if (foundSection) continue;

    // Process content based on current section
    if (currentSection === 'experience') {
      // Check if line looks like a job title (usually bold or capitalized)
      if (isLikelyJobTitle(line) && !currentExperience) {
        if (currentExperience && bullets.length > 0) {
          currentExperience.bullets = [...bullets];
          sections.experience.push(currentExperience as ResumeExperienceItem);
          bullets = [];
        }

        currentExperience = {
          title: line,
          company: lines[i + 1] || '',
          location: extractLocation(lines.slice(i, i + 3).join(' ')),
          startDate: extractDates(lines.slice(i, i + 3).join(' '))[0] || '',
          endDate: extractDates(lines.slice(i, i + 3).join(' '))[1] || 'Present',
          bullets: [],
        };
      } else if (isBulletPoint(line)) {
        bullets.push(cleanBullet(line));
      }
    } else if (currentSection === 'education') {
      // Simple education parsing
      if (line.match(/bachelor|master|phd|b\.s\.|m\.s\.|b\.a\.|m\.a\./i)) {
        if (currentEducation) {
          sections.education.push(currentEducation as EducationItem);
        }
        currentEducation = {
          degree: line,
          institution: lines[i + 1] || '',
          graduation: extractYear(lines.slice(i, i + 3).join(' ')) || '',
          gpa: extractGPA(lines.slice(i, i + 3).join(' ')),
        };
      }
    } else if (currentSection === 'skills') {
      // Extract skills (comma or pipe separated)
      const skillsText = line.replace(/^(Technical\s+)?Skills?:?\s*/i, '');
      const extractedSkills = skillsText
        .split(/[,|;]/)
        .map(s => s.trim())
        .filter(s => s.length > 0 && s.length < 50);
      sections.skills.push(...extractedSkills);
    } else if (currentSection === 'projects') {
      if (isLikelyProjectName(line)) {
        if (currentProject) {
          sections.projects!.push(currentProject as ProjectItem);
        }
        currentProject = {
          name: line,
          description: lines[i + 1] || '',
          technologies: extractTechnologies(lines.slice(i, i + 3).join(' ')),
        };
      }
    } else if (currentSection === 'certifications') {
      sections.certifications!.push(line);
    }
  }

  // Save final items
  if (currentExperience && bullets.length > 0) {
    currentExperience.bullets = bullets;
    sections.experience.push(currentExperience as ResumeExperienceItem);
  }
  if (currentEducation) {
    sections.education.push(currentEducation as EducationItem);
  }
  if (currentProject) {
    sections.projects!.push(currentProject as ProjectItem);
  }

  return sections;
}

/**
 * Extract all bullets from resume with metadata
 */
export function extractBullets(sections: ParsedResumeSections): ResumeBullet[] {
  const bullets: ResumeBullet[] = [];

  sections.experience.forEach((exp: ResumeExperienceItem, expIndex) => {
    exp.bullets.forEach((bullet, bulletIndex) => {
      bullets.push({
        text: bullet,
        section: 'experience',
        index: bulletIndex,
        hasMetric: hasMetric(bullet),
        hasAction: hasActionVerb(bullet),
        wordCount: bullet.split(/\s+/).length,
      });
    });
  });

  return bullets;
}

/**
 * Main resume parser
 */
export async function parseResume(buffer: Buffer): Promise<ParsedResume> {
  const rawText = await parsePDFToText(buffer);
  const sections = extractSections(rawText);
  const bullets = extractBullets(sections);

  return {
    rawText,
    sections,
    bullets,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function isLikelyJobTitle(line: string): boolean {
  // Job titles are usually short (< 100 chars) and may contain keywords
  if (line.length > 100) return false;

  const jobKeywords = /engineer|developer|manager|analyst|designer|consultant|specialist|lead|senior|junior|intern/i;
  return jobKeywords.test(line);
}

function isBulletPoint(line: string): boolean {
  // Check if line starts with bullet point markers
  return /^[-•●○▪▫★✓✔➤➢➣⇒]|\d+\.|^\*/.test(line);
}

function cleanBullet(line: string): string {
  // Remove bullet point markers
  return line.replace(/^[-•●○▪▫★✓✔➤➢➣⇒]|\d+\.|\*\s*/, '').trim();
}

function hasMetric(text: string): boolean {
  // Check if text contains numbers/percentages
  return /\d+%|\d+x|\$\d+|increased by \d+|reduced by \d+|improved \d+/i.test(text);
}

function hasActionVerb(text: string): boolean {
  const actionVerbs = /^(built|created|developed|designed|implemented|led|managed|improved|increased|reduced|optimized|architected|launched|delivered|achieved|collaborated|analyzed|automated|migrated|scaled|deployed)/i;
  return actionVerbs.test(text);
}

function extractLocation(text: string): string | undefined {
  // Simple location extraction (City, State)
  const match = text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z]{2})/);
  return match ? match[0] : undefined;
}

function extractDates(text: string): [string?, string?] {
  // Extract date ranges (e.g., "Jan 2020 - Present", "2019 - 2021")
  const datePattern = /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{4})\s*\d{2,4}\s*[-–—]\s*(?:Present|Current|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{4})\s*\d{0,4}/i;
  const match = text.match(datePattern);

  if (match) {
    const [startDate, endDate] = match[0].split(/[-–—]/).map(d => d.trim());
    return [startDate, endDate];
  }

  return [];
}

function extractYear(text: string): string | undefined {
  const match = text.match(/\b(20\d{2}|19\d{2})\b/);
  return match ? match[0] : undefined;
}

function extractGPA(text: string): string | undefined {
  const match = text.match(/GPA:?\s*([\d.]+)/i);
  return match ? match[1] : undefined;
}

function isLikelyProjectName(line: string): boolean {
  // Project names are usually short and may be in title case
  return line.length < 80 && line.length > 3 && !isBulletPoint(line);
}

function extractTechnologies(text: string): string[] {
  // Extract technologies in parentheses or after keywords
  const match = text.match(/(?:Technologies?|Built with|Stack):?\s*([^.]+)/i);
  if (match) {
    return match[1].split(/[,|;]/).map(t => t.trim());
  }
  return [];
}
