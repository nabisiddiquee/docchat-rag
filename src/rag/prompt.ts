export interface RetrievedChunk {
  id: string;
  documentId: string;
  title: string;
  index: number;
  content: string;
  score: number;
}

export const SYSTEM_PROMPT =
  'You answer questions using only the numbered context passages provided. ' +
  'Cite the passages you used like [1] or [2][3]. ' +
  'If the context does not contain the answer, say you could not find it in the uploaded documents. ' +
  'Do not invent facts. Keep answers concise.';

/** Build the user message: numbered passages followed by the question. */
export function buildUserPrompt(question: string, chunks: RetrievedChunk[]): string {
  const context = chunks
    .map((c, i) => `[${i + 1}] (${c.title}, part ${c.index + 1})\n${c.content}`)
    .join('\n\n');
  return `Context:\n${context}\n\nQuestion: ${question}`;
}

/** pgvector accepts vectors as a '[x,y,z]' literal. */
export function toVectorLiteral(values: number[]): string {
  if (values.some((v) => !Number.isFinite(v))) throw new Error('Embedding contains a non-finite value');
  return `[${values.join(',')}]`;
}
