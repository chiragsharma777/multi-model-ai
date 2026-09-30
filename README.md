# Multi Model AI

A full-stack AI chat application that combines a modern React frontend with a FastAPI backend. Users can sign in, create conversations, attach text-based files, and chat with multiple AI models via OpenRouter while storing conversation history in Supabase.

## Features

- User authentication with Supabase
- Chat history and conversation management
- Multi-model AI selection
- Adjustable temperature settings
- Markdown rendering for assistant responses
- File attachment support for `.txt`, `.md`, `.json`, and `.csv` files
- Export chat conversations as `.txt` or `.json`
- FastAPI backend with health and auth endpoints

## Tech Stack

- Frontend: React + Vite + JavaScript
- Backend: Python + FastAPI
- Database/Auth: Supabase
- AI API: OpenRouter
- Styling: CSS, Tailwind-inspired custom UI

## Project Structure

```text
multi-model-ai/
├── Backend/
│   ├── main.py
│   └── requirements.txt
├── my-app/
│   ├── public/
│   ├── src/
│   ├── .gitignore
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   └── README.md
├── .gitignore
└── README.md
```

## Frontend Setup

1. Navigate to the frontend app:

```bash
cd my-app
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

The app will run on a Vite local port (commonly `http://localhost:5173`).

## Backend Setup

1. Navigate to the backend directory:

```bash
cd Backend
```

2. Create a virtual environment:

```bash
python -m venv .venv
source .venv/bin/activate
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Create a `.env` file in the `Backend` folder with the following values:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your_supabase_secret_key
OPENROUTER_API_KEY=your_openrouter_api_key
MODEL_NAME=inclusionai/ling-3.0-flash-fin:free
```

5. Start the API server:

```bash
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000` and the docs at `http://localhost:8000/docs`.

## Environment Notes

- The backend requires Supabase URL and secret key for user auth and conversation storage.
- The app expects a valid OpenRouter API key to generate AI responses.
- CORS is configured for local React development ports such as `5173`, `5174`, `5175`, and `5176`.

## Example Models

The frontend includes several OpenRouter model options, including:

- Ling 3 Flash
- Nemotron 3 Nano Omni
- Laguna S 2.1

## Usage

1. Start both the backend and frontend applications.
2. Sign up or sign in to the application.
3. Open a chat or create a new conversation.
4. Ask a question or attach a supported file.
5. Select a model and optionally adjust the temperature.
6. Export your chat as text or JSON when needed.

## License

This project does not currently include a license file. If you plan to distribute or publish it publicly, consider adding an appropriate open-source license.

## Notes

This repository is a practical AI assistant web app prototype built around Supabase authentication and OpenRouter-powered model access. It is designed for local development and can be extended for production deployment with deployment-specific environment configuration, security hardening, and hosting setup.
