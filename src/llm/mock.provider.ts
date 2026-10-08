import { ChatMessage, EMBEDDING_DIMENSIONS, LlmProvider } from './llm.provider';

const STOP_WORDS = new Set(
  'a an and are as at be by for from has have in is it its of on or that the this to was were what when where which who why with how does do'.split(' '),
);

export function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9]+/g)?.filter((t) => t.length > 1 && !STOP_WORDS.has(t)) ?? [];
}

function hash(token: string): number {
  let h = 2166136261;
  for (let i = 0; i < token.length; i++) h = Math.imul(h ^ token.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * Offline provider for local development and tests: hashed bag-of-words embeddings and an
 * extractive "answer" that quotes the best-matching sentence. No API key or network needed.
 */
export class MockProvider implements LlmProvider {
  readonly name = 'mock';

  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((text) => {
      const v = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
      for (const t of tokenize(text)) v[hash(t) % EMBEDDING_DIMENSIONS] += 1;
      const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
      return v.map((x) => x / norm);
    });
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const prompt = messages[messages.length - 1]?.content ?? '';
    const question = prompt.split('Question:').pop() ?? '';
    const qTokens = new Set(tokenize(question));
    const passages = [...prompt.matchAll(/\[(\d+)\] \([^)]*\)\n([\s\S]*?)(?=\n\n\[\d+\] |\n\nQuestion:)/g)];

    let best = { score: 0, sentence: '', ref: 0 };
    for (const [, ref, body] of passages) {
      for (const sentence of body.replace(/\s*\n\s*/g, " ").split(/(?<=[.!?])\s+/)) {
        const score = tokenize(sentence).filter((t) => qTokens.has(t)).length;
        if (score > best.score) best = { score, sentence: sentence.trim(), ref: Number(ref) };
      }
    }
    return best.score === 0
      ? 'I could not find this in the uploaded documents.'
      : `${best.sentence} [${best.ref}]`;
  }
}
