export const LLM_PROVIDER = Symbol('LLM_PROVIDER');

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmProvider {
  readonly name: string;
  /** Returns one embedding (length = EMBEDDING_DIMENSIONS) per input text. */
  embed(texts: string[]): Promise<number[][]>;
  chat(messages: ChatMessage[]): Promise<string>;
}

export const EMBEDDING_DIMENSIONS = 1536;
