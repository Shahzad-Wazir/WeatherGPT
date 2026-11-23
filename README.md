# WeatherGPT — India Weather Intelligence (Deploy-Ready)

Production-ready full-stack weather intelligence app (**React + Vite** frontend, **Node.js + Express** backend) with zero boilerplate or unused dependencies.

## Deploy Guide (Render + Vercel)

### 1. Push to GitHub
Upload this folder (`backend/`, `frontend/`, `render.yaml`, `.gitignore`) to a GitHub repository.

### 2. Deploy Backend on Render
1. Go to **Render → New → Web Service** and connect your GitHub repo.
2. Set **Root Directory** to `backend`.
3. **Build Command:** `npm install`
4. **Start Command:** `npm start`
5. Add Environment Variables (optional):
   - `GEMINI_API_KEY` — Your Google AI Studio key (for Gemini AI responses)
   - `WEATHER_API_KEY` — Optional OpenWeatherMap key (works out-of-the-box with free Open-Meteo if omitted)
   - `CORS_ORIGIN` — Your deployed Vercel URL (or leave empty to allow all origins)
6. Deploy and copy your live Render backend URL (e.g. `https://weathergpt-backend.onrender.com`).

### 3. Deploy Frontend on Vercel
1. Go to **Vercel → Add New Project** and import the same GitHub repo.
2. Set **Root Directory** to `frontend`.
3. Framework Preset: **Vite** (`npm run build`, output `dist`).
4. Add Environment Variable:
   - `VITE_API_URL` = your Render backend URL (no trailing slash, e.g. `https://weathergpt-backend.onrender.com`)
5. Click **Deploy**. `frontend/vercel.json` is already configured so page refreshes on all routes work cleanly.

## Local Development

```bash
# Terminal 1 — Backend
cd backend && npm install && npm start

# Terminal 2 — Frontend
cd frontend && npm install && npm run dev
```
