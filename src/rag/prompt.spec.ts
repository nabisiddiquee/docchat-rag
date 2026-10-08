import { buildUserPrompt, toVectorLiteral } from './prompt';

describe('prompt helpers', () => {
  it('numbers passages so the model can cite them', () => {
    const prompt = buildUserPrompt('What is X?', [
      { id: 'a', documentId: 'd', title: 'Policy', index: 0, content: 'X is a thing.', score: 0.9 },
      { id: 'b', documentId: 'd', title: 'Policy', index: 3, content: 'Y is another.', score: 0.8 },
    ]);
    expect(prompt).toContain('[1] (Policy, part 1)\nX is a thing.');
    expect(prompt).toContain('[2] (Policy, part 4)\nY is another.');
    expect(prompt.endsWith('Question: What is X?')).toBe(true);
  });

  it('formats a pgvector literal and rejects bad numbers', () => {
    expect(toVectorLiteral([0.1, -0.2, 3])).toBe('[0.1,-0.2,3]');
    expect(() => toVectorLiteral([NaN])).toThrow();
  });
});
