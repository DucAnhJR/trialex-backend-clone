// Match the supplied category labels, accommodating the singular Disease names
// already present in the trial filter. Do not infer clinical classifications.
export function themePattern(name: string): RegExp {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const compatible = escaped
    .replace(/Diseases\b/g, 'Diseases?')
    .replace(/disease\b/g, 'diseases?');
  return new RegExp(`(^|[\\s,/;])${compatible}(?=$|[\\s,/;])`, 'i');
}
