# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AWSL Video is a full-stack video streaming platform with React/Vite frontend and FastAPI backend, deployed as a serverless application on Vercel. Videos are chunked into 10MB pieces and stored on AWSL Telegram Storage.

## Project Structure

```
awsl-video/
├── main.py              # Vercel entry
├── backend/
│   ├── main.py
│   ├── models.py
│   └── routes/          # API endpoints
│
└── frontend/
    ├── src/
    │   ├── main.tsx
    │   ├── api.ts
    │   └── pages/
    └── vite.config.ts
```

## Development Commands

### Initial Setup

**1. Backend Setup:**
```bash
# Create virtual environment (from project root)
python3 -m venv venv

# Install dependencies using venv's pip
./venv/bin/pip install -r requirements.txt

# Create .env file in project root
# Add required environment variables (see Environment Variables section)
```

**2. Frontend Setup:**
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies (using pnpm recommended)
pnpm install
```

### Running Development Servers

**Backend (FastAPI):**
```bash
# Method 1: Direct run (from project root)
./venv/bin/python main.py
# Server runs at http://localhost:8000

# Method 2: With hot reload (recommended for development)
./venv/bin/uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Access API documentation
# http://localhost:8000/docs (Swagger UI)
# http://localhost:8000/openapi.json (OpenAPI spec)
```

**Frontend (React + Vite):**
```bash
cd frontend

# Development server with hot reload
pnpm dev
# Server runs at http://localhost:5173
```

**Run both concurrently:**
```bash
# Terminal 1: Backend (from project root)
./venv/bin/python main.py

# Terminal 2: Frontend
cd frontend && pnpm dev
```

### Building for Production

```bash
cd frontend
tsc -b && pnpm build
```

## Deployment

### Deploy to Vercel (Production)

**⚠️ MUST deploy from project root (NOT frontend/):**
```bash
cd /path/to/awsl-video  # Ensure at root
vercel --prod
```

**Why?** Root contains `vercel.json` that configures both frontend and backend deployment.

## Architecture

### Request Routing

```
/api/*       → main.py (User APIs)
/admin-api/* → main.py (Admin APIs, JWT protected)
/docs        → main.py (FastAPI docs)
/*           → frontend/dist/ (React SPA)
```

### Authentication

**Admin (JWT):**
- Login: POST `/admin-api/auth/login` → 7 day JWT token
- Header: `X-Admin-Authorization: Bearer {token}`

**User (OAuth):**
- Providers: GitHub, Linux.do
- Header: `Authorization: Bearer {token}`

### Database

`Video`, `Episode`, `VideoChunk`, `User`, `WatchHistory`, `Comment`

## Environment Variables

**Backend:** `.env` in project root (see README.md for full list)
**Frontend:**
- `frontend/.env` - Development (API URL: http://localhost:8000)
- `frontend/.env.prod` - Production (empty API URL for relative paths)
