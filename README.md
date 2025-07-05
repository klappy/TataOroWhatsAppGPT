# TataOroWhatsAppGPT

**Cloudflare Worker webhook handler for Twilio WhatsApp messages, powered by OpenAI's GPT-4o-mini (including Vision and Audio support).**

## Features

- **WhatsApp Integration**: Complete Twilio WhatsApp webhook handling
- **AI-Powered Responses**: OpenAI GPT-4o-mini with vision and audio support
- **Image Processing**: Automatic image upload and analysis for hair consultations
- **Audio Support**: Whisper transcription for voice messages
- **Email Automation**: Consultation summaries sent via Resend
- **Shopify Integration**: Automatic customer creation and product search
- **Session Management**: Cloudflare KV-based conversation state
- **Media Storage**: R2-based image and audio storage with public access
- **Admin Interface**: Web dashboard for session management and monitoring
- **Summary Sharing**: Public consultation summary links
- **Scheduled Tasks**: Automated email delivery and WhatsApp nudges
- **🆕 Booksy Integration**: MCP server for service discovery and booking assistance

## Architecture

This system uses Cloudflare Workers with:

- **Router Worker**: Main entry point and request routing
- **WhatsApp Handler**: Processes incoming messages and media
- **Image Worker**: Handles media upload and delivery
- **Admin Worker**: Provides management interface
- **Summary Worker**: Generates shareable consultation summaries
- **Scheduler Worker**: Handles timeout-based automations
- **🆕 Booksy MCP Worker**: Service discovery and booking assistance

## Quick Start

### Prerequisites

- Cloudflare account with Workers, KV, and R2 access
- Twilio account with WhatsApp Business API
- OpenAI API key
- Resend account for email delivery
- Shopify store (optional)

### Setup

1. **Clone and install**:

   ```bash
   git clone <repository-url>
   cd TataOroWhatsAppGPT
   npm install
   ```

2. **Configure environment**:

   ```bash
   cp .env.example .env
   # Edit .env with your API keys and configuration
   ```

3. **Deploy**:

   ```bash
   wrangler deploy
   ```

4. **Configure Twilio webhook**:
   - Set webhook URL to: `https://your-worker.your-domain.workers.dev/whatsapp/incoming`

## New: Booksy Integration

The system now includes a Model Context Protocol (MCP) server for Tata Oro's booking system:

### Features

- **Service Discovery**: Complete catalog with prices and durations
- **Booking Links**: Direct links to Tata's Booksy page with instructions
- **Smart Recommendations**: Personalized suggestions based on client type
- **Search Functionality**: Find services by keyword
- **Business Information**: Location, specialties, and contact details

### Usage Examples

```
User: "What services does Tata offer?"
Bot: Lists all services with prices and durations

User: "I want to book a curly cut"
Bot: Provides direct booking link with step-by-step instructions

User: "I'm a first-time client"
Bot: Recommends FREE consultation and transformation services
```

### Integration

- **Automatic Detection**: Recognizes booking-related keywords
- **24/7 Availability**: Service information available anytime
- **Consistent Information**: Always up-to-date pricing and details
- **Direct Booking**: Links straight to Tata's Booksy page

## Documentation

- [Development Guide](docs/DEVELOPMENT.md) - Local setup and deployment
- [API Reference](docs/API.md) - Complete endpoint documentation
- [Architecture Overview](docs/ARCHITECTURE.md) - System design and data flows
- [Testing Guide](docs/TESTING.md) - Testing procedures and best practices
- [Troubleshooting](docs/TROUBLESHOOTING.md) - Common issues and solutions
- [Feature: Booksy Integration](docs/features/implemented/FEATURE_8_BOOKSY_MCP_INTEGRATION.md) - Complete integration guide

## Contributing

Please read the [AI Agent Instructions](docs/AGENTS.md) before contributing. This document contains important guidelines for maintaining code quality and avoiding deprecated approaches.

## License

ISC License - see LICENSE file for details.

## Version

Current version: 1.6.0

For detailed changes, see [CHANGELOG.md](CHANGELOG.md).

## Overview

This repository now exposes a **single Cloudflare Worker** with a modular router
(`workers/router.js`). It dispatches incoming requests to pure handler functions:

- `handleWhatsAppRequest` – `/whatsapp/incoming` webhook for Twilio
- `handleImagesRequest` – serves `/images/*` from R2
- `handleAdminRequest` – lightweight dashboard at `/admin`
- `handleSummaryRequest` – read-only summaries under `/summary/*`
- `handleUploadHookRequest` – GitHub webhook `/uploadhook`
- `handleDocSyncRequest` – manual ingestion at `/internal/doc-sync`
- Shared utilities live under `shared/` for GPT, embeddings, chunking and more.

For detailed prompt configuration, see [VIBE_PROMPT.md](docs/issues/05-closed/VIBE_PROMPT.md).

## Development & Deployment

Develop and deploy the router with standard Wrangler commands:

```bash
# Local development
wrangler dev

# Deployment
wrangler deploy
```

## Pre-commit

Install Wrangler (if needed) and run pre-commit hooks:

```bash
npm install -g wrangler
pre-commit run --all-files
```

## Testing

Run unit tests with Node's built-in test runner:

```bash
npm test
```

## Usage

- Configure your Twilio WhatsApp webhook to point to `/whatsapp/incoming` (e.g., `https://<your-domain>/whatsapp/incoming`).
- Trigger document synchronization by POSTing to `/internal/doc-sync` or via a scheduled cron/CLI.
- Point your GitHub webhook to `/uploadhook` to automate updates.
