import OpenAI from 'openai';
import { 
  AIClient, 
  AIClientOptions, 
  AIResponse, 
  AIStreamingCallback,
  AIClientMessage,
  AIToolDefinition
} from './ai-client-interface';

export class AzureOpenAIClient extends AIClient {
  private client: OpenAI | null = null;

  constructor(
    private endpoint: string,
    private apiKey: string,
    private deploymentName: string
  ) {
    super();
  }

  private getClient(): OpenAI {
    if (!this.client) {
      if (!this.endpoint || !this.apiKey || !this.deploymentName) {
        throw new Error('Azure OpenAI configuration is incomplete. Please set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, and AZURE_OPENAI_DEPLOYMENT_NAME');
      }
      
      // Configure OpenAI client for Azure
      this.client = new OpenAI({
        apiKey: this.apiKey,
        baseURL: `${this.endpoint}/openai/deployments/${this.deploymentName}`,
        defaultQuery: { 'api-version': '2024-02-15-preview' },
        defaultHeaders: {
          'api-key': this.apiKey,
        },
      });
    }
    return this.client;
  }

  private convertAnthropicToolsToOpenAI(tools?: AIToolDefinition[]) {
    if (!tools) return undefined;
    
    return tools.map(tool => ({
      type: "function" as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.input_schema
      }
    }));
  }

  private convertMessagesToOpenAI(messages: AIClientMessage[]) {
    return messages.map(msg => {
      if (typeof msg.content === 'string') {
        return {
          role: msg.role,
          content: msg.content
        };
      } else {
        // Handle complex content - for now, convert to string
        // In a full implementation, you'd handle images, etc.
        const textContent = msg.content
          .filter(item => item.type === 'text')
          .map(item => item.text || '')
          .join('\n');
        return {
          role: msg.role,
          content: textContent
        };
      }
    });
  }

  async createMessage(options: AIClientOptions): Promise<AIResponse> {
    const client = this.getClient();
    
    const messages = this.convertMessagesToOpenAI(options.messages);
    const tools = this.convertAnthropicToolsToOpenAI(options.tools);

    // Add system message if provided
    if (options.system) {
      messages.unshift({
        role: 'system',
        content: options.system
      });
    }

    try {
      const response = await client.chat.completions.create({
        model: this.deploymentName, // For Azure, this should be the deployment name
        messages: messages,
        max_tokens: options.max_tokens || 8000,
        tools: tools,
        tool_choice: tools ? "auto" : undefined,
        temperature: 0.7,
      });

      // Convert OpenAI response to Anthropic-like format
      const choice = response.choices[0];
      const content: AIResponse['content'] = [];

      if (choice.message.content) {
        content.push({
          type: 'text',
          text: choice.message.content
        });
      }

      if (choice.message.tool_calls) {
        for (const toolCall of choice.message.tool_calls) {
          content.push({
            type: 'tool_use',
            name: toolCall.function.name,
            input: JSON.parse(toolCall.function.arguments),
            id: toolCall.id
          });
        }
      }

      return { content };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('model') || error.message.includes('deployment')) {
          throw new Error(`Azure OpenAI model error: The deployment "${this.deploymentName}" may not be available. Error: ${error.message}`);
        }
        if (error.message.includes('authentication') || error.message.includes('401')) {
          throw new Error(`Azure OpenAI authentication error: Please check your AZURE_OPENAI_API_KEY and endpoint. Error: ${error.message}`);
        }
        if (error.message.includes('quota') || error.message.includes('rate')) {
          throw new Error(`Azure OpenAI quota error: ${error.message}`);
        }
      }
      throw error;
    }
  }

  async createStreamingMessage(
    options: AIClientOptions, 
    onEvent: AIStreamingCallback
  ): Promise<string> {
    // Emit a thinking event to show Azure OpenAI is processing
    onEvent({
      type: 'thinking',
      number: 1,
      content: 'Azure OpenAI is processing your request...'
    });

    const response = await this.createMessage(options);
    
    // Process response and emit events
    let finalResponse = '';
    let toolCallCount = 0;

    for (const block of response.content) {
      if (block.type === 'tool_use') {
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
    return !!(this.endpoint && this.apiKey && this.deploymentName);
  }

  getProviderName(): string {
    return 'Azure OpenAI';
  }

  getDefaultModel(): string {
    return this.deploymentName || 'gpt-4';
  }
}