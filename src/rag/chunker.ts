export interface ChunkOptions {
  /** Target maximum characters per chunk. */
  size: number;
  /** Characters repeated from the end of one chunk at the start of the next, so context is not cut mid-thought. */
  overlap: number;
}

/** Collapse whitespace left behind by PDF extraction (hyphenated line breaks, repeated spaces, blank lines). */
export function normalizeText(raw: string): string {
  return raw
    .replace(/-\n(?=[a-z])/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Split into sentence-ish units so chunks end on natural boundaries where possible. */
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Sentence-aware chunking with overlap. Sentences longer than `size` are hard-split.
 */
export function chunkText(raw: string, { size, overlap }: ChunkOptions): string[] {
  if (size <= 0) throw new Error('size must be positive');
  if (overlap < 0 || overlap >= size) throw new Error('overlap must be between 0 and size');

  const units: string[] = [];
  for (const sentence of splitSentences(normalizeText(raw))) {
    if (sentence.length <= size) units.push(sentence);
    else for (let i = 0; i < sentence.length; i += size - overlap) units.push(sentence.slice(i, i + size));
  }

  const chunks: string[] = [];
  let current = '';
  for (const unit of units) {
    if (current && current.length + 1 + unit.length > size) {
      chunks.push(current);
      const tail = current.slice(-overlap);
      const cut = tail.indexOf(' ');
      current = overlap > 0 ? (cut >= 0 ? tail.slice(cut + 1) : tail) : '';
      // Drop the overlap if it would push this unit past the size limit.
      if (current && current.length + 1 + unit.length > size) current = '';
    }
    current = current ? `${current} ${unit}` : unit;
  }
  if (current) chunks.push(current);
  return chunks;
}
