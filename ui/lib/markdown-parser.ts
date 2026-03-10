import matter from 'gray-matter';
import type { DocumentFrontmatter } from '@/types/components';

export interface ParsedDocument {
  frontmatter: DocumentFrontmatter;
  content: string;  // Markdown body with frontmatter stripped
}

/**
 * Parse a markdown document, extracting YAML frontmatter and the body.
 *
 * @param raw - Raw markdown string (may or may not include frontmatter)
 * @returns Object with extracted frontmatter and markdown body content
 */
export function parseDocument(raw: string): ParsedDocument {
  const result = matter(raw);
  return {
    frontmatter: result.data as DocumentFrontmatter,
    content: result.content,
  };
}
