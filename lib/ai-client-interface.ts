// AI Client Interface for supporting multiple AI providers

export interface AIClientMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | Array<{ type: string; [key: string]: unknown }>;
}

export interface AIToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface AIClientOptions {
  model?: string;
  max_tokens?: number;
  system?: string;
  thinking?: {
    type: 'enabled';
    budget_tokens?: number;
  };
  tools?: AIToolDefinition[];
  messages: AIClientMessage[];
}

export interface AIResponse {
  content: Array<{
    type: string;
    thinking?: string;
    text?: string;
    name?: string;
    input?: Record<string, unknown>;
    id?: string;
  }>;
}

export interface AIStreamingCallback {
  (event: { type: string; [key: string]: unknown }): void;
}

export abstract class AIClient {
  abstract createMessage(options: AIClientOptions): Promise<AIResponse>;
  abstract createStreamingMessage(
    options: AIClientOptions, 
    onEvent: AIStreamingCallback
  ): Promise<string>;
  abstract isAvailable(): boolean;
  abstract getProviderName(): string;
  abstract getDefaultModel(): string;
}

export interface AIProviderConfig {
  anthropic?: {
    apiKey: string;
  };
  azure?: {
    endpoint: string;
    apiKey: string;
    deploymentName: string;
  };
}

export type AIProviderType = 'anthropic' | 'azure';