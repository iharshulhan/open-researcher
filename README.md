<h1 align="center">Open Researcher</h1>

<p align="center">
  <img src="https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExaGJncnpmamlzc3RnMzNpeXNwcGk1Z3kwemd6c2w1ZDdxcGZwdWJwdiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/hhNLykzY76wu7oGFU0/giphy.gif" alt="Open Researcher Demo" width="100%">
</p>

A powerful AI-powered research tool that combines Firecrawl's web scraping capabilities with advanced AI reasoning to help you search, analyze, and understand web content.

## Features

- **AI-Powered Search**: Intelligently search and analyze web content
- **Real-time Web Scraping**: Powered by Firecrawl for accurate, up-to-date information
- **Thinking Display**: See the AI's reasoning process in real-time
- **Smart Citations**: Automatic source tracking and citation generation
- **Split View Interface**: Side-by-side view of chat and search results

## Prerequisites

- Node.js 18+ and npm
- API Keys (at least one AI provider required):
  
  **Option 1: Anthropic Claude (default)**
  - `ANTHROPIC_API_KEY` - For Claude AI functionality
  
  **Option 2: Azure OpenAI (alternative)**
  - `AZURE_OPENAI_ENDPOINT` - Your Azure OpenAI resource endpoint
  - `AZURE_OPENAI_API_KEY` - Your Azure OpenAI API key
  - `AZURE_OPENAI_DEPLOYMENT_NAME` - Your model deployment name
  
  **Web Scraping:**
  - `FIRECRAWL_API_KEY` - For web scraping (can be added via UI)

## Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/mendableai/open-researcher
   cd open-researcher
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   
   Edit `.env.local` and configure your preferred AI provider:
   
   **Option A: Anthropic Claude**
   ```
   ANTHROPIC_API_KEY=your_anthropic_api_key
   AI_PROVIDER=anthropic
   FIRECRAWL_API_KEY=your_firecrawl_api_key  # Optional, can be added via UI
   ```
   
   **Option B: Azure OpenAI**
   ```
   AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/
   AZURE_OPENAI_API_KEY=your_azure_openai_api_key
   AZURE_OPENAI_DEPLOYMENT_NAME=your_deployment_name
   AI_PROVIDER=azure
   FIRECRAWL_API_KEY=your_firecrawl_api_key  # Optional, can be added via UI
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| **AI Provider (choose one)** | | |
| `ANTHROPIC_API_KEY` | Option A | Claude API key for AI functionality |
| `AZURE_OPENAI_ENDPOINT` | Option B | Azure OpenAI resource endpoint |
| `AZURE_OPENAI_API_KEY` | Option B | Azure OpenAI API key |
| `AZURE_OPENAI_DEPLOYMENT_NAME` | Option B | Azure OpenAI model deployment name |
| `AI_PROVIDER` | No* | Preferred provider: 'anthropic' or 'azure' |
| **Web Scraping** | | |
| `FIRECRAWL_API_KEY` | No** | Firecrawl API key for web scraping |

*Auto-detected based on available API keys if not set  
**Can be provided through the UI if not set in environment variables

## Getting API Keys

### AI Providers
- **Anthropic API Key**: Visit [Anthropic Console](https://console.anthropic.com/)
- **Azure OpenAI**: 
  1. Create an Azure OpenAI resource in [Azure Portal](https://portal.azure.com/)
  2. Deploy a model (e.g., GPT-4) 
  3. Get your endpoint, API key, and deployment name from the resource

### Web Scraping
- **Firecrawl API Key**: Visit [Firecrawl](https://www.firecrawl.dev/)

## Usage

1. **Basic Search**: Enter your query in the chat interface
2. **Web Analysis**: The AI will automatically search and analyze relevant web content
3. **Follow-up Questions**: Ask follow-up questions to dive deeper
4. **View Sources**: Click on citations to see source information

## Project Structure

```
open-research/
├── app/
│   ├── api/              # API routes
│   ├── open-researcher/  # Main application page
│   └── layout.tsx        # Root layout
├── components/           # React components
│   ├── ui/              # UI components
│   └── thinking-chat.tsx # Main chat interface
├── lib/                 # Utility functions
└── public/              # Static assets
```

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## Tech Stack

- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **AI Providers:**
  - **Anthropic Claude** - Advanced reasoning and thinking
  - **Azure OpenAI** - GPT-4 and other OpenAI models
- **Firecrawl** - Web scraping
- **Radix UI** - UI components

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with [Firecrawl](https://www.firecrawl.dev/) for powerful web scraping
- AI powered by:
  - [Anthropic's Claude](https://www.anthropic.com/) for advanced reasoning
  - [Azure OpenAI](https://azure.microsoft.com/en-us/products/ai-services/openai-service) for GPT models
- UI components from [Radix UI](https://www.radix-ui.com/) and [shadcn/ui](https://ui.shadcn.com/)