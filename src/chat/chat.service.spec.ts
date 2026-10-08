import { ConfigService } from '@nestjs/config';
import { MockProvider } from '../llm/mock.provider';
import { ChatService } from './chat.service';

const config = { get: (_k: string, d: unknown) => d } as unknown as ConfigService;

describe('ChatService', () => {
  it('does not call the LLM when nothing relevant is found', async () => {
    const prisma: any = { $queryRaw: jest.fn().mockResolvedValue([]) };
    const llm = new MockProvider();
    const chatSpy = jest.spyOn(llm, 'chat');
    const res = await new ChatService(prisma, config, llm).ask({ question: 'Anything about refunds?' });
    expect(res.sources).toEqual([]);
    expect(chatSpy).not.toHaveBeenCalled();
  });

  it('filters out weak matches and returns cited sources', async () => {
    const prisma: any = {
      $queryRaw: jest.fn().mockResolvedValue([
        { id: '1', documentId: 'd', title: 'HR', index: 0, content: 'Employees get 18 days of annual leave.', score: 0.82 },
        { id: '2', documentId: 'd', title: 'HR', index: 5, content: 'Unrelated text.', score: 0.05 },
      ]),
    };
    const res = await new ChatService(prisma, config, new MockProvider()).ask({ question: 'How much annual leave?' });
    expect(res.sources).toHaveLength(1);
    expect(res.sources[0]).toMatchObject({ ref: 1, title: 'HR', part: 1, score: 0.82 });
    expect(res.answer).toContain('18 days');
  });
});
