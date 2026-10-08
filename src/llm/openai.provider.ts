import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { ChatMessage, EMBEDDING_DIMENSIONS, LlmProvider } from './llm.provider';

interface OpenAiOptions {
  apiKey: string;
  baseUrl: string;
  chatModel: string;
  embeddingModel: string;
}

/** Works with OpenAI and any OpenAI-compatible endpoint (Azure OpenAI, Groq, Ollama, etc.). */
export class OpenAiProvider implements LlmProvider {
  readonly name = 'openai';
  private readonly logger = new Logger(OpenAiProvider.name);

  constructor(private readonly opts: OpenAiOptions) {}

  async embed(texts: string[]): Promise<number[][]> {
    const batchSize = 64;
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += batchSize) {
      const res = await this.post<{ data: { index: number; embedding: number[] }[] }>('/embeddings', {
        model: this.opts.embeddingModel,
        input: texts.slice(i, i + batchSize),
        dimensions: EMBEDDING_DIMENSIONS,
      });
      out.push(...res.data.sort((a, b) => a.index - b.index).map((d) => d.embedding));
    }
    return out;
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const res = await this.post<{ choices: { message: { content: string } }[] }>('/chat/completions', {
      model: this.opts.chatModel,
      messages,
      temperature: 0.1,
    });
    return res.choices[0]?.message?.content?.trim() ?? '';
  }

  private async post<T>(path: string, body: unknown, attempt = 1): Promise<T> {
    const res = await fetch(`${this.opts.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${this.opts.apiKey}` },
      body: JSON.stringify(body),
    });
    if ((res.status === 429 || res.status >= 500) && attempt < 3) {
      const wait = 500 * 2 ** attempt;
      this.logger.warn(`LLM API ${res.status}, retrying in ${wait}ms`);
      await new Promise((r) => setTimeout(r, wait));
      return this.post<T>(path, body, attempt + 1);
    }
    if (!res.ok) {
      this.logger.error(`LLM API ${res.status}: ${(await res.text()).slice(0, 300)}`);
      throw new ServiceUnavailableException('The language model service returned an error');
    }
    return (await res.json()) as T;
  }
}
