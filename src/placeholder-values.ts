export type PlaceholderQuote = '"' | "'" | null;

export function getPlaceholderQuote(
  source: string,
  index: number,
  length: number
): PlaceholderQuote {
  const before = source[index - 1];
  const after = source[index + length];

  if (before === '"' && after === '"') {
    return '"';
  }
  if (before === "'" && after === "'") {
    return "'";
  }
  return null;
}

export function formatYamlScalarForQuote(
  value: string,
  quote: PlaceholderQuote
): string {
  if (quote === '"') {
    return value
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\r?\n/g, "\\n");
  }

  if (quote === "'") {
    return value
      .replace(/'/g, "''")
      .replace(/\r?\n/g, " ");
  }

  return value;
}

export function replaceLiteralOccurrences(
  source: string,
  placeholder: string,
  replacement: (quote: PlaceholderQuote) => string
): string {
  if (!placeholder) {
    return source;
  }

  let cursor = 0;
  let output = "";

  while (cursor < source.length) {
    const index = source.indexOf(placeholder, cursor);
    if (index === -1) {
      output += source.slice(cursor);
      break;
    }

    output += source.slice(cursor, index);
    output += replacement(getPlaceholderQuote(source, index, placeholder.length));
    cursor = index + placeholder.length;
  }

  return output;
}
