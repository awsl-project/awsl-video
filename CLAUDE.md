# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AWSL Video is a full-stack video streaming platform with React/Vite frontend and FastAPI backend, deployed as a serverless application on Vercel. Videos are chunked into 10MB pieces and stored on AWSL Telegram Storage.

## Project Structure

```
awsl-video/
├── main.py                           # Vercel serverless entry point
├── requirements.txt                  # Python dependencies
├── vercel.json                       # Vercel deployment configuration
├── .env                              # Backend environment variables (not in git)
│
├── backend/                          # FastAPI backend
│   ├── main.py                       # FastAPI app initialization
│   ├── config.py                     # Pydantic settings (loads .env)
│   ├── database.py                   # SQLAlchemy async engine
│   ├── models.py                     # Database models (Video, Episode, User, etc.)
│   ├── schemas.py                    # Pydantic request/response schemas
│   ├── auth.py                       # JWT authentication utilities
│   ├── oauth_service.py              # GitHub/Linux.do OAuth flow
│   ├── storage.py                    # AWSL Telegram Storage client
│   ├── rate_limiter.py               # Rate limiting decorator
│   ├── routes/
│   │   ├── admin.py                  # Admin APIs (/admin-api/*)
│   │   ├── user.py                   # Video browsing & streaming (/api/videos/*)
│   │   ├── user_profile.py           # User interactions (/api/user/*)
│   │   ├── comments.py               # Comment system (/api/videos/{id}/comments)
│   │   ├── oauth.py                  # OAuth login (/api/oauth/*)
│   │   └── auth.py                   # Admin login (/admin-api/auth/*)
│   └── utils/
│       └── compression.py            # Video compression utilities
│
└── frontend/                         # React + Vite frontend
    ├── package.json                  # Node dependencies & scripts
    ├── vite.config.ts                # Vite build configuration
    ├── tsconfig.json                 # TypeScript configuration
    ├── tailwind.config.ts            # Tailwind CSS v4 config
    ├── .env                          # Development env (API URL)
    ├── .env.prod                     # Production env (empty API URL)
    ├── src/
    │   ├── main.tsx                  # React entry point
    │   ├── App.tsx                   # React Router setup
    │   ├── api.ts                    # Axios client with auth interceptors
    │   ├── pages/
    │   │   ├── HomePage.tsx          # Video grid with filters/search
    │   │   ├── VideoPlayerPage.tsx   # Video player with episodes
    │   │   ├── AdminPage.tsx         # Admin dashboard (video management)
    │   │   ├── LoginPage.tsx         # User OAuth login
    │   │   ├── ProfilePage.tsx       # User profile & history
    │   │   ├── FavoritesPage.tsx     # User favorites
    │   │   └── WatchHistoryPage.tsx  # Watch history
    │   ├── components/
    │   │   ├── Header.tsx            # Navigation bar
    │   │   ├── VideoCard.tsx         # Video thumbnail card
    │   │   ├── VideoComments.tsx     # Nested comment tree
    │   │   ├── VideoInteractions.tsx # Like/favorite/share buttons
    │   │   └── ui/                   # shadcn/ui components
    │   ├── contexts/
    │   │   └── AuthContext.tsx       # User auth context
    │   ├── hooks/
    │   │   └── use-toast.ts          # Toast notification hook
    │   ├── utils/
    │   │   └── errorHandler.ts       # Toast debouncing logic
    │   └── lib/
    │       └── utils.ts              # Utility functions
    └── dist/                         # Build output (generated)
```

## Development Commands

### Initial Setup

**1. Backend Setup:**
```bash
# Create virtual environment (from project root)
python3 -m venv venv

# Install dependencies using venv's pip
./venv/bin/pip install -r requirements.txt
# Windows: venv\Scripts\pip install -r requirements.txt

# Create .env file in project root
# Add required environment variables (see Environment Variables section)
```

**2. Frontend Setup:**
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies (using pnpm recommended)
pnpm install
# or
npm install
```

### Running Development Servers

**Backend (FastAPI):**
```bash
# Method 1: Direct run (from project root)
./venv/bin/python main.py
# Windows: venv\Scripts\python main.py
# Server runs at http://localhost:8000

# Method 2: With hot reload (recommended for development)
./venv/bin/uvicorn main:app --reload --host 0.0.0.0 --port 8000
# Windows: venv\Scripts\uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Access API documentation
# http://localhost:8000/docs (Swagger UI)
# http://localhost:8000/openapi.json (OpenAPI spec)
```

**Frontend (React + Vite):**
```bash
cd frontend

# Development server with hot reload
pnpm dev
# or
npm run dev

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

**Frontend build:**
```bash
cd frontend

# Type check
tsc -b

# Build for production (reads .env.prod)
pnpm build
# or
npm run build

# Output: frontend/dist/
```

**Frontend preview:**
```bash
cd frontend
pnpm preview  # Preview production build locally
```

### Code Quality

**TypeScript type checking:**
```bash
cd frontend
tsc -b
```

**Linting:**
```bash
cd frontend
pnpm lint
# or
npm run lint
```

## Deployment

### Deploy to Vercel (Production)

**Prerequisites:**
1. Vercel account connected to GitHub repository
2. Environment variables configured in Vercel dashboard
3. Code pushed to GitHub

**Deploy command:**
```bash
# IMPORTANT: Run from project root, NOT from frontend/
vercel --prod

# Deployment process:
# 1. Uploads project files
# 2. Builds frontend: cd frontend && pnpm run vercel-build
# 3. Deploys backend: main.py as Python serverless function
# 4. Routes configured per vercel.json
# 5. Returns production URL (e.g., https://v.awsl.icu)
```

**Preview deployment (test before production):**
```bash
vercel
# Deploys to preview URL for testing
```

**Quick commit and deploy workflow:**
```bash
# 1. Stage changes
git add .

# 2. Commit with message
git commit -m "feat: your feature description"

# 3. Push to GitHub
git push

# 4. Deploy to production
vercel --prod
```

### Vercel Environment Variables

Configure these in Vercel dashboard (Settings → Environment Variables):

```bash
# Required
SECRET_KEY=your-secret-key-here
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-admin-password
AWSL_TELEGRAM_STORAGE_URL=https://assets.awsl.icu
AWSL_TELEGRAM_API_TOKEN=your-telegram-token
AWSL_TELEGRAM_CHAT_ID=your-chat-id
DATABASE_URL=postgresql+asyncpg://user:pass@host/db?ssl=require

# Optional (for OAuth)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
LINUXDO_CLIENT_ID=your-linuxdo-client-id
LINUXDO_CLIENT_SECRET=your-linuxdo-client-secret
```

### Deployment Architecture

**Vercel Routes (defined in vercel.json):**
- `/api/*` → `main.py` (User APIs)
- `/admin-api/*` → `main.py` (Admin APIs)
- `/docs` → `main.py` (FastAPI documentation)
- `/*` → `frontend/dist/` (React SPA)

**Build Process:**
1. **Frontend:** `cd frontend && tsc -b && vite build --mode prod`
   - Output: `frontend/dist/`
   - Environment: Uses `.env.prod` (empty VITE_API_BASE_URL for relative paths)

2. **Backend:** Python dependencies installed from `requirements.txt`
   - Entry: `main.py` (imports `backend.main:app`)
   - Runtime: Python 3.12 (specified by Vercel)

**Serverless Functions:**
- Each API route becomes a serverless function
- Cold start time: ~1-2 seconds
- Request timeout: 10 seconds (Vercel limit)

## Architecture

### Request Routing (vercel.json)

```
/api/*       → main.py (User APIs)
/admin-api/* → main.py (Admin APIs, JWT protected)
/docs        → main.py (FastAPI docs)
/*           → frontend/dist/ (React SPA)
```

### Backend Structure

**Entry point:** `main.py` (imports and wraps `backend/main.py:app`)

**Core modules:**
- `backend/config.py` - Pydantic settings (loads from `.env`)
- `backend/database.py` - SQLAlchemy async engine setup
- `backend/models.py` - Database models (Video, Episode, VideoChunk, User, etc.)
- `backend/schemas.py` - Pydantic schemas for request/response validation
- `backend/auth.py` - JWT authentication utilities
- `backend/oauth_service.py` - GitHub/Linux.do OAuth flow
- `backend/storage.py` - AWSL Telegram Storage client
- `backend/rate_limiter.py` - Rate limiting for user actions

**Route modules:**
- `backend/routes/admin.py` - Admin video management (/admin-api/*)
- `backend/routes/user.py` - Public video browsing & streaming (/api/videos/*)
- `backend/routes/user_profile.py` - User interactions (/api/user/*)
- `backend/routes/comments.py` - Comment system (/api/videos/{id}/comments)
- `backend/routes/oauth.py` - OAuth login endpoints (/api/oauth/*)
- `backend/routes/auth.py` - Admin login (/admin-api/auth/*)

### Frontend Structure

**Entry:** `frontend/src/main.tsx` → `App.tsx` (React Router setup)

**Key pages:**
- `pages/HomePage.tsx` - Video grid with filters/search
- `pages/VideoPlayerPage.tsx` - Video player with episode list
- `pages/AdminPage.tsx` - Admin dashboard for video management
- `pages/LoginPage.tsx` - User OAuth login (GitHub/Linux.do)
- `pages/ProfilePage.tsx` - User profile & watch history

**API client:**
- `api.ts` - Centralized Axios client with auth interceptors
- `utils/errorHandler.ts` - Toast debouncing for error messages

**UI components:**
- `components/ui/*` - shadcn/ui components (Dialog, Button, etc.)
- `components/Header.tsx` - Navigation bar
- `components/VideoCard.tsx` - Video thumbnail card
- `components/VideoComments.tsx` - Nested comment tree

### Video Upload Flow

1. **Admin uploads video** in `AdminPage.tsx:handleUploadVideo`
2. **Frontend chunks file** into 10MB pieces
3. **Get upload token** from backend (`/admin-api/upload/token`)
4. **Upload chunks in parallel** (3 concurrent) to AWSL Telegram Storage
5. **Rate limit handling:** Parse "retry after X" from 429/400 errors
   - Infinite retry for rate limits (does not count toward MAX_RETRIES)
   - Exponential backoff for other errors (max 5 retries)
6. **Resumable uploads:** localStorage tracks completed chunks
   - Deterministic uploadId: `${episodeId}_${fileName}_${fileSize}`
   - On retry, skip already-uploaded chunks
7. **Finalize upload** to backend (`/admin-api/episodes/{id}/upload/finalize`)
8. Backend saves chunk metadata to database (VideoChunk model)

**Key implementation:** `AdminPage.tsx:319-577`

### Video Streaming Flow

1. **User requests stream:** `/api/stream/{episode_id}`
2. **Backend queries chunks** from database (sorted by chunk_index)
3. **Parallel chunk download** from Telegram Storage (3 concurrent)
4. **Stream merged chunks** to client with Range request support
5. **Frontend video player** can seek/scrub timeline

**Key implementation:** `backend/routes/user.py:stream_video`

### Authentication & Authorization

**Admin (JWT):**
- Login: POST `/admin-api/auth/login` → JWT token (7 day expiry)
- Token stored in `localStorage` as `admin_token`
- Protected routes use `X-Admin-Authorization: Bearer {token}` header

**User (OAuth):**
- Providers: GitHub, Linux.do
- Flow: OAuth redirect → callback → JWT token
- Token stored in `localStorage` as `user_token`
- Protected routes use `Authorization: Bearer {token}` header

**Middleware:**
- `backend/routes/admin.py:get_current_admin_user` - JWT validation
- `backend/routes/user_profile.py:get_current_user` - User JWT validation
- IP country blocking for CN (451 status code)

### Database Models

**Core entities:**
- `Video` - Video metadata (title, description, category, cover)
- `Episode` - Individual episodes within a video
- `VideoChunk` - 10MB chunks stored on Telegram (episode_id → chunks)
- `User` - OAuth users (GitHub/Linux.do)
- `WatchHistory` - User view history
- `VideoLike`, `VideoFavorite`, `VideoShare` - Social features
- `Comment` - Nested comments (parent_id for replies)

**Database connections:**
- Development: SQLite (`sqlite+aiosqlite:///./videos.db`)
- Production: PostgreSQL (`postgresql+asyncpg://...`)

## Important Patterns

### Rate Limit Retry Strategy

**Speed rate limit errors (429/400 with "retry after X"):**
- Parse retry-after seconds from error message
- Wait exact duration (max 120s) with countdown UI
- **Infinite retry** (use `retry--` to not count toward MAX_RETRIES)
- Display: `速率限制重试 #3`

**Other errors (network, server):**
- Exponential backoff: 1s, 2s, 4s, 8s, 16s
- Maximum 5 retries
- Display: `尝试 3/5`

**Implementation:** `AdminPage.tsx:429-445` (retry-- trick for infinite loop)

### Resumable Upload with localStorage

**Key insight:** Use deterministic uploadId (not timestamp) so same file always resumes:
```typescript
const uploadId = `${episodeId}_${fileName}_${fileSize}`;
const storageKey = `upload_${uploadId}`;
```

**On upload start:**
1. Check localStorage for existing upload state
2. Validate fileName, totalChunks, fileSize match
3. Restore completed chunks array
4. Skip already-uploaded chunks in uploadChunk function

**On chunk success:**
- Immediately save progress to localStorage
- Include: uploadId, episodeId, fileName, fileSize, totalChunks, completedChunks

**On upload complete:**
- Clear localStorage entry

### Error Handling & Toast Debouncing

**Problem:** Multiple simultaneous API failures cause toast spam

**Solution:** `ErrorToastManager` in `utils/errorHandler.ts`
- Debounce identical errors within 3 seconds
- Single network error toast per 5 seconds
- Status-specific messages (401, 403, 404, 429, 500, etc.)

**Usage:** Automatic via axios interceptor in `api.ts`

### API Client Configuration

**Environment-based base URL:**
```typescript
// Development: VITE_API_BASE_URL=http://localhost:8000
// Production: VITE_API_BASE_URL= (empty, uses relative paths)
```

**Dual auth headers:**
- Admin APIs: `X-Admin-Authorization: Bearer {admin_token}`
- User APIs: `Authorization: Bearer {user_token}`

## Environment Variables

**Required for backend (.env in root):**
```bash
SECRET_KEY=random-secret-key
ADMIN_USERNAME=admin
ADMIN_PASSWORD=password
AWSL_TELEGRAM_STORAGE_URL=https://assets.awsl.icu
AWSL_TELEGRAM_API_TOKEN=your-token
AWSL_TELEGRAM_CHAT_ID=your-chat-id
DATABASE_URL=sqlite+aiosqlite:///./videos.db  # or postgresql+asyncpg://...
GITHUB_CLIENT_ID=oauth-app-id
GITHUB_CLIENT_SECRET=oauth-secret
LINUXDO_CLIENT_ID=oauth-app-id
LINUXDO_CLIENT_SECRET=oauth-secret
```

**Frontend (.env files in frontend/):**
- `.env` - Development: `VITE_API_BASE_URL=http://localhost:8000`
- `.env.prod` - Production: `VITE_API_BASE_URL=` (empty)

## Common Issues

**Upload fails with rate limit:**
- Check retry logic preserves `retry--` for infinite retry on rate limits
- Verify parseRetryAfter extracts seconds correctly
- Confirm localStorage persistence saves after each chunk

**Video won't play:**
- Check VideoChunk records exist in database
- Verify Telegram Storage token is valid
- Test chunk download directly: `GET /api/stream/{episode_id}`

**Build fails on Vercel:**
- Ensure `vercel.json` routes are correct
- Check `frontend/package.json` has `vercel-build` script
- Verify Python dependencies in `requirements.txt`

**Database migration SQLite → PostgreSQL:**
1. Update DATABASE_URL in environment variables
2. Restart app (tables auto-create via SQLAlchemy)
3. Manual data migration if needed (use pg_dump/restore)

## Code Conventions

- **Backend:** Use async/await for all I/O operations
- **Frontend:** Centralize API calls in `api.ts`, use TypeScript strict mode
- **Naming:** snake_case (Python), camelCase (TypeScript)
- **Components:** Prefer functional components with hooks
- **State:** Use React hooks (useState, useEffect) over class components
- **Styling:** Tailwind CSS v4 utility classes, avoid inline styles
- **Commits:** Conventional commits with Chinese descriptions for features
