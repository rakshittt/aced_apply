import { ParsedResumeSections } from '@/types';

/**
 * Convert structured resume sections back to plain text
 * This is used when a user edits their resume in the web UI,
 * so we can regenerate the 'rawText' needed for analysis.
 */
export function sectionsToText(sections: ParsedResumeSections): string {
    const parts: string[] = [];

    // 0. Summary
    if (sections.summary) {
        parts.push('SUMMARY');
        parts.push(sections.summary);
        parts.push('');
    }

    // 1. Experience
    if (sections.experience && sections.experience.length > 0) {
        parts.push('EXPERIENCE');
        sections.experience.forEach(exp => {
            parts.push(`${exp.title}`);
            parts.push(`${exp.company} | ${exp.location || ''} | ${exp.startDate} - ${exp.endDate}`);
            if (exp.bullets && exp.bullets.length > 0) {
                exp.bullets.forEach(bullet => {
                    parts.push(`• ${bullet}`);
                });
            }
            parts.push(''); // Empty line between jobs
        });
    }

    // 2. Education
    if (sections.education && sections.education.length > 0) {
        parts.push('EDUCATION');
        sections.education.forEach(edu => {
            parts.push(`${edu.institution}`);
            parts.push(`${edu.degree} | ${edu.graduation}`);
            if (edu.gpa) {
                parts.push(`GPA: ${edu.gpa}`);
            }
            parts.push('');
        });
    }

    // 3. Skills
    if (sections.skills && sections.skills.length > 0) {
        parts.push('SKILLS');
        // Group skills into a comma-separated list to mimic typical resume format
        parts.push(sections.skills.join(', '));
        parts.push('');
    }

    // 4. Projects
    if (sections.projects && sections.projects.length > 0) {
        parts.push('PROJECTS');
        sections.projects.forEach(proj => {
            parts.push(`${proj.name}`);
            parts.push(`${proj.description}`);
            if (proj.technologies && proj.technologies.length > 0) {
                parts.push(`Technologies: ${proj.technologies.join(', ')}`);
            }
            parts.push('');
        });
    }

    // 5. Certifications
    if (sections.certifications && sections.certifications.length > 0) {
        parts.push('CERTIFICATIONS');
        sections.certifications.forEach(cert => {
            parts.push(cert);
        });
        parts.push('');
    }

    // 6. Custom Sections
    if (sections.custom && sections.custom.length > 0) {
        sections.custom.forEach(section => {
            parts.push(section.title.toUpperCase());
            section.items.forEach(item => {
                parts.push(`• ${item}`);
            });
            parts.push('');
        });
    }

    return parts.join('\n');
}
