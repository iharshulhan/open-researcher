import Anthropic from '@anthropic-ai/sdk';
import { 
  AIClient, 
  AIClientOptions, 
  AIResponse, 
  AIStreamingCallback,
  AIClientMessage
} from './ai-client-interface';

export class AnthropicClient extends AIClient {
  private client: Anthropic | null = null;

  constructor(private apiKey: string) {
    super();
  }

  private getClient(): Anthropic {
    if (!this.client) {
      if (!this.apiKey) {
        throw new Error('ANTHROPIC_API_KEY is not configured');
      }
      this.client = new Anthropic({ apiKey: this.apiKey });
    }
    return this.client;
  }

  async createMessage(options: AIClientOptions): Promise<AIResponse> {
    const client = this.getClient();
    
    const requestParams = {
      model: options.model || this.getDefaultModel(),
      max_tokens: options.max_tokens || 8000,
      system: options.system,
      thinking: options.thinking,
      tools: options.tools,
      messages: options.messages as Array<{ role: string; content: string | Array<{ type: string; [key: string]: unknown }> }>
    };

    try {
      const response = await client.beta.messages.create({
        ...requestParams,
        betas: ["interleaved-thinking-2025-05-14"]
      });

      return response as AIResponse;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('model')) {
          throw new Error(`Model error: The ${requestParams.model} model may not be available in your region or with your API key. Error: ${error.message}`);
        }
        if (error.message.includes('beta')) {
          throw new Error(`Beta feature error: The interleaved-thinking-2025-05-14 beta may not be enabled for your account. Error: ${error.message}`);
        }
        if (error.message.includes('authentication') || error.message.includes('401')) {
          throw new Error(`Authentication error: Please check your ANTHROPIC_API_KEY. Error: ${error.message}`);
        }
      }
      throw error;
    }
  }

  async createStreamingMessage(
    options: AIClientOptions, 
    onEvent: AIStreamingCallback
  ): Promise<string> {
    // For now, reuse the main createMessage logic but with streaming support
    // This is a simplified version - in production you'd want proper streaming
    const response = await this.createMessage(options);
    
    // Process response and emit events
    let finalResponse = '';
    let thinkingCount = 0;
    let toolCallCount = 0;

    for (const block of response.content) {
      if (block.type === 'thinking') {
        thinkingCount++;
        onEvent({
          type: 'thinking',
          number: thinkingCount,
          content: block.thinking || ''
        });
      } else if (block.type === 'tool_use') {
        toolCallCount++;
        onEvent({
          type: 'tool_call',
          number: toolCallCount,
          tool: block.name || '',
          parameters: block.input || {}
        });
      } else if (block.type === 'text') {
        finalResponse = block.text || '';
        onEvent({
          type: 'response',
          content: finalResponse
        });
      }
    }

    return finalResponse;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  getProviderName(): string {
    return 'Anthropic Claude';
  }

  getDefaultModel(): string {
    return 'claude-opus-4-20250514';
  }
}