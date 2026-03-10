import { parse } from 'yaml';

/**
 * Parse a YAML string into a typed object.
 *
 * @param content - Raw YAML string
 * @returns Parsed object cast to type T
 */
export function parseYaml<T>(content: string): T {
  return parse(content) as T;
}
