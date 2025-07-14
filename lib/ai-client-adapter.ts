// Simple adapter to use the AI client factory while preserving existing Anthropic logic
import Anthropic from '@anthropic-ai/sdk';
import { AIClientFactory } from './ai-client-factory';

// Wrapper function that provides Anthropic-compatible interface
export function getAnthropicCompatibleClient(): Anthropic {
  const aiClient = AIClientFactory.getClient();
  
  // If we're using Anthropic, return the actual client
  if (aiClient.getProviderName().includes('Anthropic')) {
    // Get the actual Anthropic client from the factory
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    return new Anthropic({ apiKey });
  }
  
  // For Azure OpenAI, we'll need to create a compatibility wrapper
  // For now, throw an error indicating the advanced streaming features need Anthropic
  throw new Error('Advanced streaming features with interleaved thinking are currently only available with Anthropic Claude. Please set ANTHROPIC_API_KEY or use the basic research functions.');
}

// Simple research function that works with any provider
export async function performSimpleResearch(query: string): Promise<string> {
  const aiClient = AIClientFactory.getClient();
  
  const systemPrompt = `You are a research assistant with access to web search and scraping tools. Provide clear, accurate research based on the query.`;
  
  const messages = [{
    role: "user" as const,
    content: query
  }];
  
  const response = await aiClient.createMessage({
    model: aiClient.getDefaultModel(),
    max_tokens: 8000,
    system: systemPrompt,
    messages: messages
  });
  
  // Extract text response
  const textBlock = response.content.find(block => block.type === 'text');
  return textBlock?.text || 'No response generated';
}