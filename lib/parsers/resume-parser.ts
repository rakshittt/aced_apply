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
 * Uses pdf-parse in either its ESM class API (PDFParse) or legacy default export.
 */
export async function parsePDFToText(buffer: Buffer): Promise<string> {
  try {
    // Import pdfjs-dist to configure worker options
    const pdfjsLib: any = await import('pdfjs-dist/legacy/build/pdf.mjs');

    // Configure PDF.js to use the bundled worker file
    // This prevents the "No GlobalWorkerOptions.workerSrc" error
    if (pdfjsLib?.GlobalWorkerOptions) {
      // In Node.js environment, we can disable the worker or use the legacy build
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/legacy/build/pdf.worker.mjs';
    }

    const pdfModule: any = await import('pdf-parse');

    // Preferred ESM class API
    const ParserClass = pdfModule?.PDFParse;
    if (typeof ParserClass === 'function') {
      const parser = new ParserClass({ data: buffer });
      const result = await parser.getText();
      return (result?.text || '').toString().trim();
    }

    // Legacy default export (CommonJS style)
    const pdfParseFn =
      typeof pdfModule?.default === 'function'
        ? pdfModule.default
        : typeof pdfModule === 'function'
          ? pdfModule
          : undefined;

    if (typeof pdfParseFn === 'function') {
      const result = await pdfParseFn(buffer);
      return (result?.text || '').toString().trim();
    }

    throw new Error('Unsupported pdf-parse export shape');
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
    summary: /^(professional\s+)?summary|profile|objective|about(\s+me)?/i,
    experience: /^(work\s+)?experience|employment|professional\s+experience|career\s+history/i,
    education: /^education|academic(\s+background)?/i,
    skills: /^(technical\s+)?skills|competencies|technologies|core\s+competencies/i,
    projects: /^projects|personal\s+projects|key\s+projects/i,
    certifications: /^certifications?|licenses?|awards?|honors?/i,
  };

  const sections: ParsedResumeSections = {
    summary: '',
    experience: [],
    skills: [],
    education: [],
    projects: [],
    certifications: [],
    custom: [],
  };

  let currentSection: string | null = null;
  let currentCustomTitle: string | null = null;

  // Temp holders
  let currentExperience: ResumeExperienceItem | null = null;
  let currentEducation: EducationItem | null = null;
  let currentProject: ProjectItem | null = null;
  let bullets: string[] = [];
  let customItems: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if this is a section header
    let foundSection = false;

    // 1. Check standard headers
    for (const [sectionName, pattern] of Object.entries(sectionHeaders)) {
      if (pattern.test(line) && line.length < 50) { // Headers are usually short
        // Save previous section data
        saveCurrentSection();

        currentSection = sectionName;
        currentCustomTitle = null;
        foundSection = true;
        break;
      }
    }

    // 2. Check for potential custom headers (capitalized, short, not a bullet)
    if (!foundSection && !currentSection && isLikelyHeader(line)) {
      // Treat as custom section if we haven't found a standard one yet, or if we are switching context
      // But be careful not to break inside an existing section unless it's clearly a new header
      // For now, let's only detect custom headers if they are very distinct
    }

    if (foundSection) continue;

    // Helper to save data before switching
    function saveCurrentSection() {
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
      } else if (currentSection === 'custom' && currentCustomTitle) {
        sections.custom!.push({ title: currentCustomTitle, items: [...customItems] });
        customItems = [];
        currentCustomTitle = null;
      }
    }

    // Process content based on current section
    if (currentSection === 'summary') {
      sections.summary += (sections.summary ? '\n' : '') + line;
    } else if (currentSection === 'experience') {
      // Check if line looks like a job title (usually bold or capitalized)
      // OR if it contains a date range, which often indicates a header line
      const hasDate = extractDates(line).length > 0;

      if ((isLikelyJobTitle(line) || (hasDate && line.length < 100)) && !currentExperience) {
        if ((currentExperience) && bullets.length > 0) {
          (currentExperience as ResumeExperienceItem).bullets = [...bullets];
          sections.experience.push(currentExperience as ResumeExperienceItem);
          bullets = [];
        }

        // Try to split by common separators if on one line
        // e.g. "Senior Engineer | Acme Corp | 2020 - Present"
        const parts = line.split(/[|•]/).map(p => p.trim());

        let title = line;
        let company = lines[i + 1] || '';
        let dateStr = lines.slice(i, i + 3).join(' '); // Search next few lines for dates

        if (parts.length >= 3) {
          title = parts[0];
          company = parts[1];
          dateStr = parts[2]; // Use the part that likely has the date
        } else if (parts.length === 2) {
          // Ambiguous: "Title | Company" or "Company | Title" or "Title | Date"
          if (extractDates(parts[1]).length > 0) {
            title = parts[0];
            dateStr = parts[1];
          } else {
            title = parts[0];
            company = parts[1];
          }
        }

        currentExperience = {
          title: title,
          company: company,
          location: extractLocation(lines.slice(i, i + 3).join(' ')),
          startDate: extractDates(dateStr)[0] || '',
          endDate: extractDates(dateStr)[1] || 'Present',
          bullets: [],
        };
      } else if (isBulletPoint(line)) {
        bullets.push(cleanBullet(line));
      } else if (currentExperience) {
        // Append to description if it's not a bullet but part of the job
        // For simplicity, treat as bullet if it looks like content
        if (line.length > 5) bullets.push(line);
      }
    } else if (currentSection === 'education') {
      // Simple education parsing
      if (line.match(/bachelor|master|phd|b\.s\.|m\.s\.|b\.a\.|m\.a\.|diploma|certificate/i)) {
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
        .split(/[,|;•]/)
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
    } else if (currentSection === 'custom') {
      customItems.push(line);
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
  if (currentCustomTitle && customItems.length > 0) {
    sections.custom!.push({ title: currentCustomTitle, items: customItems });
  }

  return sections;
}

function isLikelyHeader(line: string): boolean {
  return line.length < 40 && /^[A-Z][A-Z\s]+$/.test(line) && !isBulletPoint(line);
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

  const jobKeywords = /engineer|developer|manager|analyst|designer|consultant|specialist|lead|senior|junior|intern|vp|director|chief|head|founder|co-founder|architect|administrator|coordinator|associate/i;
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
  // Extract date ranges (e.g., "Jan 2020 - Present", "2019 - 2021", "01/2020 - 02/2022")
  const datePattern = /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{1,2}\/\d{2,4}|\d{4})\s*[-–—]\s*(?:Present|Current|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|\d{1,2}\/\d{2,4}|\d{4})/i;
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
  // Relaxed check: allow slightly longer lines, but ensure it's not a bullet
  return line.length < 100 && line.length > 3 && !isBulletPoint(line) && !line.includes('http');
}

function extractTechnologies(text: string): string[] {
  // Extract technologies in parentheses or after keywords
  const match = text.match(/(?:Technologies?|Built with|Stack):?\s*([^.]+)/i);
  if (match) {
    return match[1].split(/[,|;]/).map(t => t.trim());
  }
  return [];
}
