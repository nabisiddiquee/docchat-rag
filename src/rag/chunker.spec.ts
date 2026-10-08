import { chunkText, normalizeText } from './chunker';

describe('normalizeText', () => {
  it('joins hyphenated line breaks and collapses spaces', () => {
    expect(normalizeText('distri-\nbution   of  data\n\n\n\nnext')).toBe('distribution of data\n\nnext');
  });
});

describe('chunkText', () => {
  const text = Array.from({ length: 40 }, (_, i) => `Sentence number ${i} talks about topic ${i % 5}.`).join(' ');

  it('keeps every chunk within the size limit', () => {
    const chunks = chunkText(text, { size: 200, overlap: 40 });
    expect(chunks.length).toBeGreaterThan(5);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(200);
  });

  it('carries overlap from one chunk into the next', () => {
    const [first, second] = chunkText(text, { size: 200, overlap: 60 });
    const lastWords = first.split(' ').slice(-3).join(' ');
    expect(second.startsWith(lastWords) || second.includes(lastWords)).toBe(true);
  });

  it('hard-splits a single very long sentence', () => {
    const chunks = chunkText('x'.repeat(1000), { size: 300, overlap: 50 });
    expect(chunks.every((c) => c.length <= 300)).toBe(true);
  });

  it('validates options', () => {
    expect(() => chunkText('abc', { size: 100, overlap: 100 })).toThrow();
    expect(() => chunkText('abc', { size: 0, overlap: 0 })).toThrow();
  });

  it('returns nothing for empty input', () => {
    expect(chunkText('   \n  ', { size: 100, overlap: 10 })).toEqual([]);
  });
});
