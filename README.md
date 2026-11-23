# WeatherGPT — India Weather Intelligence

**Live Demo:** [https://weather-gpt-omega-three.vercel.app](https://weather-gpt-omega-three.vercel.app/)  
**Repository:** [https://github.com/Shahzad-Wazir/WeatherGPT](https://github.com/Shahzad-Wazir/WeatherGPT)

Full-stack weather intelligence web app built with **React + Vite** (frontend) and **Node.js + Express** (backend).

## Features

- **Live Weather Dashboard:** Real-time weather, dynamic icons, GPS location, Save Place bookmarking, and a 24-hour forecast strip.
- **India GIS Weather Map:** Interactive Leaflet dark map across major Indian cities with click-anywhere coordinate lookup.
- **Extended 5-Day Forecast:** Daily highs/lows, rain probability, and interactive 3-hour breakdowns.
- **IMD Alert Center:** Live hazard scanning, severity filters, Emergency Mode banner, and India disaster helplines.
- **WeatherGPT AI Assistant:** Live-weather-aware AI chat (supports Gemini API + built-in weather engine).
- **Climate Analytics:** 36-hour temperature curves, humidity/rain probability charts, comfort index, and city-vs-city comparison.
- **Saved Places & Settings:** Pinned cities, °C/°F toggle, wind units, auto-refresh, and backend diagnostics.

## Deployment (Render + Vercel)

### Backend (Render)
1. Go to **Render → New → Web Service** and connect `Shahzad-Wazir/WeatherGPT`.
2. Set **Root Directory** to `backend`, **Build Command** to `npm install`, and **Start Command** to `npm start`.
3. Add Environment Variables:
   - `CORS_ORIGIN` = `https://weather-gpt-omega-three.vercel.app`
   - `GEMINI_API_KEY` = your Google AI Studio key (optional)
   - `WEATHER_API_KEY` = your OpenWeatherMap key (optional; defaults to free Open-Meteo)

### Frontend (Vercel)
1. Import `Shahzad-Wazir/WeatherGPT` in **Vercel** with **Root Directory** set to `frontend` (Vite preset).
2. Set Environment Variable `VITE_API_URL` to your deployed Render backend URL (no trailing slash).
3. Live URL: [https://weather-gpt-omega-three.vercel.app](https://weather-gpt-omega-three.vercel.app/)

## Local Development

```bash
# Terminal 1 — Backend
cd backend && npm install && npm start

# Terminal 2 — Frontend
cd frontend && npm install && npm run dev
```
