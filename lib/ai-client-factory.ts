import { AIClient, AIProviderType } from './ai-client-interface';
import { AnthropicClient } from './anthropic-client';
import { AzureOpenAIClient } from './azure-openai-client';

export class AIClientFactory {
  private static anthropicClient: AnthropicClient | null = null;
  private static azureClient: AzureOpenAIClient | null = null;

  static getClient(preferredProvider?: AIProviderType): AIClient {
    // Determine which provider to use
    const provider = preferredProvider || this.detectAvailableProvider();
    
    switch (provider) {
      case 'azure':
        return this.getAzureClient();
      case 'anthropic':
        return this.getAnthropicClient();
      default:
        throw new Error('No AI provider is configured. Please set either ANTHROPIC_API_KEY or Azure OpenAI environment variables.');
    }
  }

  private static detectAvailableProvider(): AIProviderType {
    // Check environment variable preference first
    const envProvider = process.env.AI_PROVIDER as AIProviderType;
    if (envProvider && (envProvider === 'anthropic' || envProvider === 'azure')) {
      // Validate that the preferred provider is actually configured
      if (envProvider === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
        return 'anthropic';
      }
      if (envProvider === 'azure' && this.isAzureConfigured()) {
        return 'azure';
      }
    }

    // Auto-detect based on available configuration
    if (this.isAzureConfigured()) {
      return 'azure';
    }
    if (process.env.ANTHROPIC_API_KEY) {
      return 'anthropic';
    }

    // Default fallback
    throw new Error('No AI provider is configured. Please set either ANTHROPIC_API_KEY or Azure OpenAI environment variables.');
  }

  private static isAzureConfigured(): boolean {
    return !!(
      process.env.AZURE_OPENAI_ENDPOINT &&
      process.env.AZURE_OPENAI_API_KEY &&
      process.env.AZURE_OPENAI_DEPLOYMENT_NAME
    );
  }

  private static getAnthropicClient(): AnthropicClient {
    if (!this.anthropicClient) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY environment variable is not set');
      }
      this.anthropicClient = new AnthropicClient(apiKey);
    }
    return this.anthropicClient;
  }

  private static getAzureClient(): AzureOpenAIClient {
    if (!this.azureClient) {
      const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
      const apiKey = process.env.AZURE_OPENAI_API_KEY;
      const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;

      if (!endpoint || !apiKey || !deploymentName) {
        throw new Error('Azure OpenAI configuration is incomplete. Please set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, and AZURE_OPENAI_DEPLOYMENT_NAME');
      }
      this.azureClient = new AzureOpenAIClient(endpoint, apiKey, deploymentName);
    }
    return this.azureClient;
  }

  static getAvailableProviders(): Array<{ type: AIProviderType; name: string; available: boolean }> {
    const providers = [
      {
        type: 'anthropic' as AIProviderType,
        name: 'Anthropic Claude',
        available: !!process.env.ANTHROPIC_API_KEY
      },
      {
        type: 'azure' as AIProviderType,
        name: 'Azure OpenAI',
        available: this.isAzureConfigured()
      }
    ];

    return providers;
  }

  static getCurrentProvider(): { type: AIProviderType; name: string } | null {
    try {
      const client = this.getClient();
      return {
        type: this.detectAvailableProvider(),
        name: client.getProviderName()
      };
    } catch {
      return null;
    }
  }

  // Reset clients (useful for testing or when config changes)
  static reset(): void {
    this.anthropicClient = null;
    this.azureClient = null;
  }
}