import { NextResponse } from 'next/server';
import { AIClientFactory } from '@/lib/ai-client-factory';

export async function GET() {
  const environmentStatus = {
    FIRECRAWL_API_KEY: !!process.env.FIRECRAWL_API_KEY,
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    AZURE_OPENAI_ENDPOINT: !!process.env.AZURE_OPENAI_ENDPOINT,
    AZURE_OPENAI_API_KEY: !!process.env.AZURE_OPENAI_API_KEY,
    AZURE_OPENAI_DEPLOYMENT_NAME: !!process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
    FIRESTARTER_DISABLE_CREATION_DASHBOARD: process.env.FIRESTARTER_DISABLE_CREATION_DASHBOARD === 'true',
  };

  // Get available AI providers
  const availableProviders = AIClientFactory.getAvailableProviders();
  const currentProvider = AIClientFactory.getCurrentProvider();

  // Add debug info (only in development)
  const debugInfo = process.env.NODE_ENV === 'development' ? {
    anthropicKeyPrefix: process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.substring(0, 10) + '...' : 'NOT SET',
    firecrawlKeyPrefix: process.env.FIRECRAWL_API_KEY ? process.env.FIRECRAWL_API_KEY.substring(0, 10) + '...' : 'NOT SET',
    azureEndpoint: process.env.AZURE_OPENAI_ENDPOINT || 'NOT SET',
    azureKeyPrefix: process.env.AZURE_OPENAI_API_KEY ? process.env.AZURE_OPENAI_API_KEY.substring(0, 10) + '...' : 'NOT SET',
    azureDeployment: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'NOT SET',
    aiProvider: process.env.AI_PROVIDER || 'auto-detect',
    nodeEnv: process.env.NODE_ENV
  } : {};

  return NextResponse.json({ 
    environmentStatus,
    availableProviders,
    currentProvider,
    ...debugInfo
  });
} 