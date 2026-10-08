import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLM_PROVIDER, LlmProvider } from '../llm/llm.provider';
import { PrismaService } from '../prisma/prisma.service';
import { buildUserPrompt, RetrievedChunk, SYSTEM_PROMPT, toVectorLiteral } from '../rag/prompt';
import { AskDto } from './dto';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(LLM_PROVIDER) private readonly llm: LlmProvider,
  ) {}

  /** Cosine-similarity search over chunk embeddings with pgvector's <=> operator. */
  async retrieve(question: string, topK: number, documentId?: string): Promise<RetrievedChunk[]> {
    const [embedding] = await this.llm.embed([question]);
    const vector = toVectorLiteral(embedding);
    const minScore = Number(this.config.get('MIN_SIMILARITY', 0.2));

    const rows = await this.prisma.$queryRaw<RetrievedChunk[]>`
      SELECT c."id", c."documentId", d."title", c."index", c."content",
             1 - (c."embedding" <=> ${vector}::vector) AS "score"
      FROM "Chunk" c
      JOIN "Document" d ON d."id" = c."documentId"
      WHERE c."embedding" IS NOT NULL
        AND (${documentId ?? null}::text IS NULL OR c."documentId" = ${documentId ?? null}::text)
      ORDER BY c."embedding" <=> ${vector}::vector
      LIMIT ${topK}`;

    return rows.map((r) => ({ ...r, score: Number(r.score) })).filter((r) => r.score >= minScore);
  }

  async ask(dto: AskDto) {
    const started = Date.now();
    const chunks = await this.retrieve(dto.question, dto.topK ?? 5, dto.documentId);
    if (chunks.length === 0) {
      return { answer: 'I could not find anything relevant in the uploaded documents.', sources: [], tookMs: Date.now() - started };
    }

    const answer = await this.llm.chat([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(dto.question, chunks) },
    ]);

    return {
      answer,
      sources: chunks.map((c, i) => ({
        ref: i + 1,
        documentId: c.documentId,
        title: c.title,
        part: c.index + 1,
        score: Math.round(c.score * 1000) / 1000,
        snippet: c.content.length > 240 ? `${c.content.slice(0, 240)}…` : c.content,
      })),
      provider: this.llm.name,
      tookMs: Date.now() - started,
    };
  }
}
