# AI Model Messenger

A React-based chat interface for interacting with local LLM models via the LM Studio API.

## Overview

This application provides an OpenAI-inspired user interface to:
- **Manage Local Models**: View available models, load/unload them on demand
- **Chat with LLMs**: Send messages to locally hosted AI models
- **View Response Stats**: Monitor token usage and model performance metrics

## Features

### Model Management
- Fetch list of available models from local LM Studio instance
- Load models with configurable parameters (context length, flash attention)
- Unload currently active model when not needed
- Visual status indicator for loaded models

### Chat Interface
- Modern dark theme UI inspired by OpenAI's ChatGPT
- User and assistant message bubbles
- Auto-scrolling chat history
- Loading state indicator while model generates response
- Enter to send, Shift+Enter for new lines

### Response Display
- Model output text displayed in clean formatting
- Token usage statistics panel (input/output/total tokens)
- Conversation context maintained via response ID tracking

## API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/models` | GET | Fetch list of available models |
| `/api/v1/models/load` | POST | Load a model into memory |
| `/api/v1/models/unload` | POST | Unload current model |
| `/v1/responses` | POST | Send chat messages |

## Configuration

By default, the app connects to LM Studio at `http://192.168.0.105:1234`. Update the `API_BASE_URL` constant in `src/App.jsx` if your instance is hosted elsewhere.

## Requirements

- LM Studio running with local models available
- Node.js 18+ for development

## Installation & Run

```bash
npm install
npm run dev
```

Access the app at http://localhost:5173/ (or port shown in terminal).