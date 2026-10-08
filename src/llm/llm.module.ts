import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLM_PROVIDER, LlmProvider } from './llm.provider';
import { MockProvider } from './mock.provider';
import { OpenAiProvider } from './openai.provider';

@Global()
@Module({
  providers: [
    {
      provide: LLM_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): LlmProvider => {
        const provider = config.get<string>('LLM_PROVIDER', 'openai');
        const logger = new Logger('LlmModule');
        if (provider === 'mock') {
          logger.warn('Using the offline mock LLM provider (no API calls)');
          return new MockProvider();
        }
        return new OpenAiProvider({
          apiKey: config.getOrThrow<string>('OPENAI_API_KEY'),
          baseUrl: config.get<string>('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
          chatModel: config.get<string>('CHAT_MODEL', 'gpt-4o-mini'),
          embeddingModel: config.get<string>('EMBEDDING_MODEL', 'text-embedding-3-small'),
        });
      },
    },
  ],
  exports: [LLM_PROVIDER],
})
export class LlmModule {}
