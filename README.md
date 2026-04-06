# AI Model Messenger

A React-based chat interface for interacting with local LLM models via the LM Studio API.

## Overview

This application provides an OpenAI-inspired user interface to:
- **Manage Local Models**: View available models, load/unload them on demand
- **Chat with LLMs**: Send messages to locally hosted AI models with real-time streaming
- **View Response Stats**: Monitor token usage and model performance metrics
- **Markdown Support**: Render rich text output from models including bold, italic, code blocks, and more

## Features

### Model Management
- Fetch list of available models from local LM Studio instance
- Load models with configurable parameters (context length, flash attention)
- Unload currently active model when not needed
- Visual status indicator for loaded models (pulsing green dot)

### Chat Interface
- Modern dark theme UI inspired by OpenAI's ChatGPT
- User and assistant message bubbles with distinct styling
- Auto-scrolling chat history
- **Real-time streaming responses** - see content appear as it's being generated
- **Blinking cursor animation** during response generation for smooth typing effect
- Enter to send, Shift+Enter for new lines

### Streaming Response Features
- Server-Sent Events (SSE) stream from LM Studio API
- `response.output_text.delta` events append text in real-time
- Previous conversation context maintained via response ID tracking
- Markdown rendering on completed messages (code blocks, formatting, etc.)

### Markdown Support
- Render rich text output from models including:
  - **Bold** and *italic* text
  - Blockquotes with accent borders
  - Code blocks with syntax-friendly styling
  - Links, lists, and tables
- Sanitized HTML output to prevent XSS attacks

### Response Display
- Model output text displayed in clean formatting
- Real-time streaming with character-by-character display
- Blinking cursor animation showing content is being generated
- Token usage statistics panel (input/output/total tokens)
- Conversation context maintained via response ID tracking

### Streaming API Details
The app uses the `/v1/responses` endpoint with `stream: true` to receive SSE events:
```
event: response.output_text.delta
data: {"delta": "text content..."}
```

Each delta is appended in real-time, creating a smooth typing experience.

### New Conversation Button
- Clear chat history while keeping the same model loaded
- Start fresh conversations without reloading models

## Animations & Visual Effects

### Streaming Animation
- **Typing cursor blink** - blinking pipe character during response generation
- **Real-time text appending** - smooth content appearance as SSE events arrive
- **Auto-scroll** to follow streaming content at bottom of chat

### General UI Animations
- **Pulse animation** on active model status indicator
- **Modal slide-in** with bounce effect when opening
- **Message fade-in** animations for new messages
- **Loading indicator** with bouncing dots
- **Button hover effects** with ripple-like transitions
- **Smooth scrolling** in chat container

## API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/models` | GET | Fetch list of available models |
| `/api/v1/models/load` | POST | Load a model into memory |
| `/api/v1/models/unload` | POST | Unload current model |
| `/v1/responses` | POST | Send chat messages (streaming) |

### Streaming Request Body example
```json
{
  "model": "yourmodel",
  "instructions": "You are a helpful assistant.",
  "input": "Hello, how are you?",
  "store": true,
  "stream": true,
  "previous_response_id": "resp_abc123"
}
```

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

### Streaming Requirements
To use the streaming feature, ensure:
- LM Studio is running with the `/v1/responses` endpoint available
- A model is loaded and ready to accept requests
- The API URL in `src/App.jsx` points to your LM Studio instance

### Accessing on Local Network

To access the application from other devices on your local network:

1. Make sure your Vite config has `server.host` set to `'0.0.0.0'`
2. The server is already configured for this
3. Find your computer's local IP address (e.g., 192.168.0.105)
4. On other devices, visit: `http://YOUR_IP_ADDRESS:5173`

To find your IP address:
- **Windows**: Run `ipconfig` in Command Prompt and look for "IPv4 Address"
- **macOS/Linux**: Run `ifconfig` or `ip addr` and look for "inet" address

Other devices must be on the same WiFi/LAN network as your computer.

## Responsive Design

The application adapts to different screen sizes:
- **Desktop**: Full-width interface with sidebar-style model management
- **Tablet**: Optimized spacing and larger touch targets
- **Mobile**: Stacked layout with condensed controls and full-width messages