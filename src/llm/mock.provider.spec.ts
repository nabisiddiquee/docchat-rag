import { buildUserPrompt } from '../rag/prompt';
import { EMBEDDING_DIMENSIONS } from './llm.provider';
import { MockProvider } from './mock.provider';

const cosine = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);

describe('MockProvider', () => {
  const llm = new MockProvider();

  it('returns unit-length vectors of the configured size', async () => {
    const [v] = await llm.embed(['loan repayment schedule']);
    expect(v).toHaveLength(EMBEDDING_DIMENSIONS);
    expect(cosine(v, v)).toBeCloseTo(1, 5);
  });

  it('scores related text higher than unrelated text', async () => {
    const [q, related, other] = await llm.embed(['annual leave policy', 'Employees get 18 days of annual leave.', 'The server runs on port 3000.']);
    expect(cosine(q, related)).toBeGreaterThan(cosine(q, other));
  });

  it('answers by quoting the best passage with a citation', async () => {
    const prompt = buildUserPrompt('How many days of annual leave?', [
      { id: 'a', documentId: 'd', title: 'HR', index: 0, content: 'Office hours are 9 to 6. Employees get 18 days of annual leave.', score: 0.9 },
    ]);
    await expect(llm.chat([{ role: 'user', content: prompt }])).resolves.toBe('Employees get 18 days of annual leave. [1]');
  });
});
