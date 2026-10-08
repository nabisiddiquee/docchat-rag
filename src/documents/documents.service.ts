import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
// pdf-parse's index file runs a debug script on import; the lib entry point does not.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse: (buf: Buffer) => Promise<{ text: string; numpages: number }> = require('pdf-parse/lib/pdf-parse.js');
import { LLM_PROVIDER, LlmProvider } from '../llm/llm.provider';
import { PrismaService } from '../prisma/prisma.service';
import { chunkText } from '../rag/chunker';
import { toVectorLiteral } from '../rag/prompt';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(LLM_PROVIDER) private readonly llm: LlmProvider,
  ) {}

  async ingest(file: Express.Multer.File, title?: string) {
    if (!file) throw new BadRequestException('Attach a PDF in the "file" field');
    if (file.mimetype !== 'application/pdf') throw new BadRequestException('Only PDF files are supported');

    const parsed = await pdfParse(file.buffer).catch(() => {
      throw new BadRequestException('Could not read this PDF');
    });
    const chunks = chunkText(parsed.text, {
      size: Number(this.config.get('CHUNK_SIZE', 900)),
      overlap: Number(this.config.get('CHUNK_OVERLAP', 150)),
    });
    if (chunks.length === 0) throw new BadRequestException('No text found in this PDF (scanned PDFs need OCR first)');

    const started = Date.now();
    const embeddings = await this.llm.embed(chunks);
    const documentId = randomUUID();

    await this.prisma.$transaction(async (tx) => {
      await tx.document.create({
        data: {
          id: documentId,
          title: title?.trim() || file.originalname.replace(/\.pdf$/i, ''),
          fileName: file.originalname,
          pages: parsed.numpages,
          chunkCount: chunks.length,
        },
      });
      for (let i = 0; i < chunks.length; i++) {
        await tx.$executeRaw`
          INSERT INTO "Chunk" ("id", "documentId", "index", "content", "embedding")
          VALUES (${randomUUID()}, ${documentId}, ${i}, ${chunks[i]}, ${toVectorLiteral(embeddings[i])}::vector)`;
      }
    });

    this.logger.log(`Ingested "${file.originalname}": ${parsed.numpages} pages, ${chunks.length} chunks in ${Date.now() - started}ms`);
    return this.findOne(documentId);
  }

  list() {
    return this.prisma.document.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.document.delete({ where: { id } });
    return { deleted: id };
  }
}
