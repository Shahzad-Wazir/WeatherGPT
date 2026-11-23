const express = require("express");
const cors = require("cors");
const axios = require("axios");

require("dotenv").config();

const app = express();

const corsOrigin = (process.env.CORS_ORIGIN || "").trim();
app.use(
  cors({
    origin: corsOrigin ? corsOrigin.split(",").map((s) => s.trim()) : true,
  })
);
app.use(express.json());

const WEATHER_API_KEY = (process.env.WEATHER_API_KEY || "").trim();
const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || "").trim();
const hasOwmKey =
  WEATHER_API_KEY.length > 0 && !WEATHER_API_KEY.includes("your_");

// Simple in-memory cache (TTL: 3 minutes) to keep responses snappy and avoid rate limits
const cache = new Map();
const CACHE_TTL_MS = 3 * 60 * 1000;

function getCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

// Major Indian cities with coordinates for fast GIS Map & Alert scanning
const INDIA_CITIES = [
  { name: "Delhi", state: "Delhi", lat: 28.6139, lon: 77.209 },
  { name: "Mumbai", state: "Maharashtra", lat: 19.076, lon: 72.8777 },
  { name: "Kolkata", state: "West Bengal", lat: 22.5726, lon: 88.3639 },
  { name: "Chennai", state: "Tamil Nadu", lat: 13.0827, lon: 80.2707 },
  { name: "Bengaluru", state: "Karnataka", lat: 12.9716, lon: 77.5946 },
  { name: "Hyderabad", state: "Telangana", lat: 17.385, lon: 78.4867 },
  { name: "Patna", state: "Bihar", lat: 25.5941, lon: 85.1376 },
  { name: "Ranchi", state: "Jharkhand", lat: 23.3441, lon: 85.3096 },
  { name: "Jaipur", state: "Rajasthan", lat: 26.9124, lon: 75.7873 },
  { name: "Ahmedabad", state: "Gujarat", lat: 23.0225, lon: 72.5714 },
  { name: "Pune", state: "Maharashtra", lat: 18.5204, lon: 73.8567 },
  { name: "Lucknow", state: "Uttar Pradesh", lat: 26.8467, lon: 80.9462 },
  { name: "Guwahati", state: "Assam", lat: 26.1445, lon: 91.7362 },
  { name: "Srinagar", state: "Jammu & Kashmir", lat: 34.0837, lon: 74.7973 },
];

// Map WMO weather codes (Open-Meteo) to OpenWeatherMap-compatible metadata
function mapWmoCode(code, isDay = 1) {
  const suffix = isDay ? "d" : "n";
  const table = {
    0: { main: "Clear", description: "clear sky", icon: `01${suffix}` },
    1: { main: "Clear", description: "mainly clear", icon: `01${suffix}` },
    2: { main: "Clouds", description: "partly cloudy", icon: `02${suffix}` },
    3: { main: "Clouds", description: "overcast clouds", icon: `04${suffix}` },
    45: { main: "Fog", description: "foggy", icon: `50${suffix}` },
    48: { main: "Fog", description: "depositing rime fog", icon: `50${suffix}` },
    51: { main: "Drizzle", description: "light drizzle", icon: `09${suffix}` },
    53: { main: "Drizzle", description: "moderate drizzle", icon: `09${suffix}` },
    55: { main: "Drizzle", description: "dense drizzle", icon: `09${suffix}` },
    61: { main: "Rain", description: "slight rain", icon: `10${suffix}` },
    63: { main: "Rain", description: "moderate rain", icon: `10${suffix}` },
    65: { main: "Rain", description: "heavy rain", icon: `10${suffix}` },
    71: { main: "Snow", description: "slight snow fall", icon: `13${suffix}` },
    73: { main: "Snow", description: "moderate snow fall", icon: `13${suffix}` },
    75: { main: "Snow", description: "heavy snow fall", icon: `13${suffix}` },
    80: { main: "Rain", description: "rain showers", icon: `09${suffix}` },
    81: { main: "Rain", description: "moderate rain showers", icon: `09${suffix}` },
    82: { main: "Rain", description: "violent rain showers", icon: `09${suffix}` },
    95: { main: "Thunderstorm", description: "thunderstorm", icon: `11${suffix}` },
    96: { main: "Thunderstorm", description: "thunderstorm with slight hail", icon: `11${suffix}` },
    99: { main: "Thunderstorm", description: "thunderstorm with heavy hail", icon: `11${suffix}` },
  };
  return table[code] || { main: "Clouds", description: "scattered clouds", icon: `03${suffix}` };
}

async function geocodeCity(city) {
  const known = INDIA_CITIES.find(
    (c) => c.name.toLowerCase() === city.trim().toLowerCase()
  );
  if (known) {
    return {
      name: known.name,
      country: "IN",
      state: known.state,
      lat: known.lat,
      lon: known.lon,
    };
  }

  const res = await axios.get("https://geocoding-api.open-meteo.com/v1/search", {
    params: { name: city.trim(), count: 1, language: "en", format: "json" },
    timeout: 8000,
  });

  const place = res.data?.results?.[0];
  if (!place) {
    const err = new Error(`City "${city}" not found. Please check the spelling.`);
    err.status = 404;
    throw err;
  }

  return {
    name: place.name,
    country: place.country_code || "IN",
    state: place.admin1 || "",
    lat: place.latitude,
    lon: place.longitude,
  };
}

async function fetchWeatherOpenMeteo({ city, lat, lon }) {
  let loc;
  if (lat !== undefined && lon !== undefined) {
    loc = {
      name: city || `${Number(lat).toFixed(2)}°N, ${Number(lon).toFixed(2)}°E`,
      country: "IN",
      state: "",
      lat: Number(lat),
      lon: Number(lon),
    };
    // Try reverse lookup from nearest known Indian city if close
    let nearest = null;
    let minDist = Infinity;
    for (const c of INDIA_CITIES) {
      const d = Math.hypot(c.lat - loc.lat, c.lon - loc.lon);
      if (d < minDist) {
        minDist = d;
        nearest = c;
      }
    }
    if (nearest && minDist < 0.6 && !city) {
      loc.name = nearest.name;
      loc.state = nearest.state;
    }
  } else {
    loc = await geocodeCity(city);
  }

  const res = await axios.get("https://api.open-meteo.com/v1/forecast", {
    params: {
      latitude: loc.lat,
      longitude: loc.lon,
      current:
        "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,surface_pressure,wind_speed_10m,wind_direction_10m",
      hourly: "visibility,precipitation_probability",
      daily: "temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max",
      wind_speed_unit: "ms",
      timezone: "auto",
      forecast_days: 2,
    },
    timeout: 10000,
  });

  const cur = res.data.current || {};
  const daily = res.data.daily || {};
  const hourly = res.data.hourly || {};
  const wmo = mapWmoCode(cur.weather_code, cur.is_day);

  const sunriseSec = daily.sunrise?.[0]
    ? Math.floor(new Date(daily.sunrise[0]).getTime() / 1000)
    : null;
  const sunsetSec = daily.sunset?.[0]
    ? Math.floor(new Date(daily.sunset[0]).getTime() / 1000)
    : null;

  const visMeters =
    typeof hourly.visibility?.[0] === "number" ? hourly.visibility[0] : 10000;

  return {
    id: Math.abs(Math.round(loc.lat * 1000) * 1000 + Math.round(loc.lon * 1000)),
    name: loc.name,
    state: loc.state || "",
    coord: { lat: loc.lat, lon: loc.lon },
    weather: [
      {
        id: cur.weather_code || 0,
        main: wmo.main,
        description: wmo.description,
        icon: wmo.icon,
      },
    ],
    main: {
      temp: cur.temperature_2m ?? 25,
      feels_like: cur.apparent_temperature ?? cur.temperature_2m ?? 25,
      temp_min: daily.temperature_2m_min?.[0] ?? (cur.temperature_2m ?? 25) - 3,
      temp_max: daily.temperature_2m_max?.[0] ?? (cur.temperature_2m ?? 25) + 3,
      pressure: Math.round(cur.surface_pressure ?? 1012),
      humidity: Math.round(cur.relative_humidity_2m ?? 60),
    },
    visibility: Math.min(visMeters, 10000),
    wind: {
      speed: Number((cur.wind_speed_10m ?? 2.5).toFixed(2)),
      deg: Math.round(cur.wind_direction_10m ?? 0),
    },
    clouds: { all: Math.round(cur.cloud_cover ?? 0) },
    uv_index: daily.uv_index_max?.[0] ?? null,
    rain_probability: hourly.precipitation_probability?.[0] ?? 0,
    dt: Math.floor(Date.now() / 1000),
    sys: {
      country: loc.country || "IN",
      sunrise: sunriseSec,
      sunset: sunsetSec,
    },
    timezone: res.data.utc_offset_seconds ?? 19800,
    _source: "open-meteo",
  };
}

async function fetchForecastOpenMeteo({ city, lat, lon }) {
  let loc;
  if (lat !== undefined && lon !== undefined) {
    loc = {
      name: city || `${Number(lat).toFixed(2)}°N, ${Number(lon).toFixed(2)}°E`,
      country: "IN",
      lat: Number(lat),
      lon: Number(lon),
    };
  } else {
    loc = await geocodeCity(city);
  }

  const res = await axios.get("https://api.open-meteo.com/v1/forecast", {
    params: {
      latitude: loc.lat,
      longitude: loc.lon,
      hourly:
        "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,weather_code,surface_pressure,cloud_cover,wind_speed_10m,is_day",
      wind_speed_unit: "ms",
      timezone: "auto",
      forecast_days: 5,
    },
    timeout: 10000,
  });

  const h = res.data.hourly || {};
  const times = h.time || [];
  const list = [];

  // Sample every 3 hours to match OpenWeatherMap 5-day / 3-hour forecast schema
  for (let i = 0; i < times.length; i += 3) {
    const dtTxt = times[i].replace("T", " ") + ":00";
    const dt = Math.floor(new Date(times[i]).getTime() / 1000);
    const wmo = mapWmoCode(h.weather_code?.[i], h.is_day?.[i] ?? 1);
    const temp = h.temperature_2m?.[i] ?? 25;

    list.push({
      dt,
      dt_txt: dtTxt,
      main: {
        temp,
        feels_like: h.apparent_temperature?.[i] ?? temp,
        temp_min: temp - 1,
        temp_max: temp + 1,
        pressure: Math.round(h.surface_pressure?.[i] ?? 1012),
        humidity: Math.round(h.relative_humidity_2m?.[i] ?? 60),
      },
      weather: [
        {
          id: h.weather_code?.[i] || 0,
          main: wmo.main,
          description: wmo.description,
          icon: wmo.icon,
        },
      ],
      clouds: { all: Math.round(h.cloud_cover?.[i] ?? 0) },
      wind: { speed: Number((h.wind_speed_10m?.[i] ?? 2).toFixed(2)) },
      pop: Number(((h.precipitation_probability?.[i] ?? 0) / 100).toFixed(2)),
    });
  }

  return {
    city: {
      name: loc.name,
      country: loc.country || "IN",
      coord: { lat: loc.lat, lon: loc.lon },
    },
    list,
    _source: "open-meteo",
  };
}

async function getWeatherData({ city, lat, lon }) {
  const cacheKey =
    lat !== undefined && lon !== undefined
      ? `w:${Number(lat).toFixed(2)},${Number(lon).toFixed(2)}`
      : `w:${(city || "").trim().toLowerCase()}`;

  const cached = getCache(cacheKey);
  if (cached) return cached;

  let data = null;

  if (hasOwmKey) {
    try {
      const params =
        lat !== undefined && lon !== undefined
          ? { lat, lon, appid: WEATHER_API_KEY, units: "metric" }
          : { q: city.trim(), appid: WEATHER_API_KEY, units: "metric" };

      const response = await axios.get(
        "https://api.openweathermap.org/data/2.5/weather",
        { params, timeout: 8000 }
      );
      data = { ...response.data, _source: "openweathermap" };
    } catch (err) {
      const status = err.response?.status;
      if (status === 404) {
        const notFound = new Error(
          err.response?.data?.message || `City "${city}" not found`
        );
        notFound.status = 404;
        throw notFound;
      }
      // On 401/429/network error, fall back to Open-Meteo
      data = await fetchWeatherOpenMeteo({ city, lat, lon });
    }
  } else {
    data = await fetchWeatherOpenMeteo({ city, lat, lon });
  }

  setCache(cacheKey, data);
  return data;
}

async function getForecastData({ city, lat, lon }) {
  const cacheKey =
    lat !== undefined && lon !== undefined
      ? `f:${Number(lat).toFixed(2)},${Number(lon).toFixed(2)}`
      : `f:${(city || "").trim().toLowerCase()}`;

  const cached = getCache(cacheKey);
  if (cached) return cached;

  let data = null;

  if (hasOwmKey) {
    try {
      const params =
        lat !== undefined && lon !== undefined
          ? { lat, lon, appid: WEATHER_API_KEY, units: "metric" }
          : { q: city.trim(), appid: WEATHER_API_KEY, units: "metric" };

      const response = await axios.get(
        "https://api.openweathermap.org/data/2.5/forecast",
        { params, timeout: 8000 }
      );
      data = { ...response.data, _source: "openweathermap" };
    } catch (err) {
      const status = err.response?.status;
      if (status === 404) {
        const notFound = new Error(
          err.response?.data?.message || `City "${city}" not found`
        );
        notFound.status = 404;
        throw notFound;
      }
      data = await fetchForecastOpenMeteo({ city, lat, lon });
    }
  } else {
    data = await fetchForecastOpenMeteo({ city, lat, lon });
  }

  setCache(cacheKey, data);
  return data;
}

function evaluateAlertsForCity(weather) {
  const alerts = [];
  const temp = weather.main?.temp ?? 25;
  const feels = weather.main?.feels_like ?? temp;
  const humidity = weather.main?.humidity ?? 50;
  const windKmh = (weather.wind?.speed ?? 0) * 3.6;
  const visKm = (weather.visibility ?? 10000) / 1000;
  const mainCond = (weather.weather?.[0]?.main || "").toLowerCase();
  const desc = weather.weather?.[0]?.description || "";
  const city = weather.name;
  const now = new Date().toISOString();

  if (temp >= 43 || feels >= 46) {
    alerts.push({
      id: `${city}-severe-heat`,
      city,
      severity: "red",
      category: "Severe Heatwave Warning",
      title: `Extreme Heat Alert in ${city}`,
      description: `Temperature is ${Math.round(temp)}°C (feels like ${Math.round(feels)}°C). High risk of heatstroke and dehydration.`,
      advice: "Avoid outdoor exposure between 11 AM and 4 PM. Stay hydrated with ORS/water and wear light cotton clothing.",
      metric: `${Math.round(temp)}°C`,
      updatedAt: now,
    });
  } else if (temp >= 38 || feels >= 41) {
    alerts.push({
      id: `${city}-heat`,
      city,
      severity: "orange",
      category: "Heatwave Advisory",
      title: `High Temperature Alert in ${city}`,
      description: `Warm conditions at ${Math.round(temp)}°C (feels like ${Math.round(feels)}°C) with ${humidity}% humidity.`,
      advice: "Limit strenuous outdoor work during peak afternoon hours and drink plenty of fluids.",
      metric: `${Math.round(temp)}°C`,
      updatedAt: now,
    });
  }

  if (mainCond.includes("thunderstorm")) {
    alerts.push({
      id: `${city}-storm`,
      city,
      severity: "red",
      category: "Thunderstorm & Lightning",
      title: `Active Thunderstorm in ${city}`,
      description: `Current condition: ${desc} with winds around ${windKmh.toFixed(1)} km/h.`,
      advice: "Stay indoors, unplug sensitive electronics, and avoid open fields or tall trees.",
      metric: `${windKmh.toFixed(0)} km/h`,
      updatedAt: now,
    });
  } else if (mainCond.includes("rain") || mainCond.includes("drizzle")) {
    const isHeavy = desc.includes("heavy") || desc.includes("violent");
    alerts.push({
      id: `${city}-rain`,
      city,
      severity: isHeavy ? "orange" : "yellow",
      category: isHeavy ? "Heavy Rainfall Warning" : "Rain Watch",
      title: `${isHeavy ? "Heavy Rain" : "Rainfall"} Reported in ${city}`,
      description: `Current condition: ${desc}. Humidity is ${humidity}%.`,
      advice: isHeavy
        ? "Watch out for waterlogging in low-lying areas and plan extra commute time."
        : "Carry an umbrella or raincoat and drive cautiously on wet roads.",
      metric: `${humidity}% RH`,
      updatedAt: now,
    });
  }

  if (windKmh >= 40) {
    alerts.push({
      id: `${city}-wind`,
      city,
      severity: "orange",
      category: "High Wind Advisory",
      title: `Strong Gusty Winds in ${city}`,
      description: `Wind speed has reached ${windKmh.toFixed(1)} km/h.`,
      advice: "Secure loose outdoor objects and be cautious on two-wheelers or highways.",
      metric: `${windKmh.toFixed(1)} km/h`,
      updatedAt: now,
    });
  }

  if (visKm <= 1.5 || mainCond.includes("fog") || mainCond.includes("mist")) {
    alerts.push({
      id: `${city}-fog`,
      city,
      severity: visKm <= 0.8 ? "orange" : "yellow",
      category: "Dense Fog / Low Visibility",
      title: `Reduced Visibility in ${city}`,
      description: `Visibility is down to ${visKm.toFixed(1)} km (${desc}).`,
      advice: "Use fog lights while driving, maintain safe distance, and check train/flight schedules.",
      metric: `${visKm.toFixed(1)} km`,
      updatedAt: now,
    });
  }

  if (temp <= 7) {
    alerts.push({
      id: `${city}-cold`,
      city,
      severity: temp <= 3 ? "orange" : "yellow",
      category: "Cold Wave Advisory",
      title: `Cold Conditions in ${city}`,
      description: `Temperature has dropped to ${Math.round(temp)}°C (feels like ${Math.round(feels)}°C).`,
      advice: "Wear layered warm clothing, especially during early morning and late night hours.",
      metric: `${Math.round(temp)}°C`,
      updatedAt: now,
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      id: `${city}-normal`,
      city,
      severity: "green",
      category: "All Clear",
      title: `Normal Weather in ${city}`,
      description: `${Math.round(temp)}°C with ${desc}, ${humidity}% humidity, and ${windKmh.toFixed(1)} km/h wind. No severe hazard active.`,
      advice: "Conditions are favorable for routine outdoor activities and travel.",
      metric: `${Math.round(temp)}°C`,
      updatedAt: now,
    });
  }

  return alerts;
}

function extractCitiesFromPrompt(message, fallbackCity) {
  const lower = message.toLowerCase();
  const found = [];

  // Check known Indian & major world cities first
  const extraCities = [
    "Noida", "Gurgaon", "Gurugram", "Chandigarh", "Bhopal", "Indore",
    "Nagpur", "Surat", "Vadodara", "Kochi", "Thiruvananthapuram", "Goa",
    "Panaji", "Visakhapatnam", "Varanasi", "Kanpur", "Agra", "Amritsar",
    "Shimla", "Manali", "Dehradun", "Darjeeling", "Bhubaneswar", "Raipur",
    "London", "New York", "Tokyo", "Dubai", "Singapore", "Paris", "Sydney",
  ];
  const allKnown = [...INDIA_CITIES.map((c) => c.name), ...extraCities];

  for (const name of allKnown) {
    const regex = new RegExp(`\\b${name.toLowerCase()}\\b`, "i");
    if (regex.test(lower) && !found.includes(name)) {
      found.push(name);
    }
  }

  if (found.length === 0) {
    // Try regex "in <City>" or "for <City>" or "at <City>"
    const match = message.match(
      /\b(?:in|for|at|of|about)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)/
    );
    if (match && match[1]) {
      found.push(match[1].trim());
    }
  }

  if (found.length === 0) {
    found.push(fallbackCity || "Kolkata");
  }

  return found.slice(0, 2);
}

function buildSmartWeatherReply(message, weatherList, forecast) {
  const lower = message.toLowerCase();
  const primary = weatherList[0];
  const temp = Math.round(primary.main.temp);
  const feels = Math.round(primary.main.feels_like);
  const humidity = primary.main.humidity;
  const windKmh = (primary.wind.speed * 3.6).toFixed(1);
  const desc = primary.weather[0].description;
  const visKm = ((primary.visibility ?? 10000) / 1000).toFixed(1);

  // City comparison
  if (weatherList.length >= 2) {
    const [a, b] = weatherList;
    const tA = Math.round(a.main.temp);
    const tB = Math.round(b.main.temp);
    const diff = Math.abs(tA - tB);
    const warmer = tA >= tB ? a.name : b.name;
    return [
      `Live Weather Comparison: ${a.name} vs ${b.name}`,
      `• ${a.name}: ${tA}°C (feels like ${Math.round(a.main.feels_like)}°C), ${a.weather[0].description}, Humidity ${a.main.humidity}%, Wind ${(a.wind.speed * 3.6).toFixed(1)} km/h.`,
      `• ${b.name}: ${tB}°C (feels like ${Math.round(b.main.feels_like)}°C), ${b.weather[0].description}, Humidity ${b.main.humidity}%, Wind ${(b.wind.speed * 3.6).toFixed(1)} km/h.`,
      diff === 0
        ? `Both cities are at the same temperature right now.`
        : `${warmer} is warmer by ${diff}°C right now.`,
    ].join("\n");
  }

  // Umbrella / Rain check
  if (/(rain|umbrella|barish|monsoon|wet|drizzle|storm)/i.test(lower)) {
    const rainSoon = forecast?.list?.slice(0, 8)?.some(
      (i) =>
        (i.pop || 0) >= 0.35 ||
        /rain|drizzle|thunderstorm/i.test(i.weather?.[0]?.main || "")
    );
    const maxPop = Math.round(
      Math.max(
        0,
        ...(forecast?.list?.slice(0, 8)?.map((i) => (i.pop || 0) * 100) || [0])
      )
    );
    return rainSoon || /rain|drizzle|thunderstorm/i.test(primary.weather[0].main)
      ? `Yes, keep an umbrella handy in ${primary.name}! Current sky: ${desc} (${temp}°C), with up to ${maxPop}% rain chance over the next 24 hours and ${humidity}% humidity.`
      : `Rain looks unlikely in ${primary.name} over the next 24 hours. Currently it's ${temp}°C with ${desc} and peak rain probability around ${maxPop}%. You can skip the umbrella for now.`;
  }

  // Outfit / Clothing advice
  if (/(wear|outfit|cloth|kapde|jacket|sweater|dress)/i.test(lower)) {
    let outfit = "comfortable cotton t-shirt and light trousers";
    if (temp >= 34) {
      outfit = "lightweight, breathable cotton clothes, sunglasses, and sunscreen";
    } else if (temp <= 14) {
      outfit = "a warm jacket or sweater with layered innerwear";
    } else if (temp <= 21) {
      outfit = "a light full-sleeve shirt or light jacket, especially for evenings";
    }
    const rainNote = /rain|drizzle/i.test(primary.weather[0].main)
      ? " Also carry a compact umbrella or waterproof footwear."
      : "";
    return `Outfit tip for ${primary.name} (${temp}°C, feels like ${feels}°C, ${desc}): Go with ${outfit}.${rainNote}`;
  }

  // Travel / Commute / Outdoor / Driving
  if (/(travel|trip|drive|commute|safe|outdoor|run|walk|picnic|flight)/i.test(lower)) {
    const hazards = [];
    if (Number(visKm) < 2) hazards.push(`low visibility (${visKm} km)`);
    if (Number(windKmh) > 35) hazards.push(`strong winds (${windKmh} km/h)`);
    if (/thunderstorm|rain/i.test(primary.weather[0].main))
      hazards.push(desc);
    if (temp >= 40) hazards.push(`extreme heat (${temp}°C)`);

    return hazards.length > 0
      ? `Travel caution for ${primary.name}: Watch out for ${hazards.join(", ")}. Current conditions: ${temp}°C, ${desc}, visibility ${visKm} km. Plan buffer time and stay updated on IMD alerts.`
      : `Conditions in ${primary.name} look good for travel and outdoor plans! It's ${temp}°C (${desc}), visibility is ${visKm} km, and winds are mild at ${windKmh} km/h.`;
  }

  // 5-day forecast summary
  if (/(forecast|week|tomorrow|next|days|kal|aage)/i.test(lower) && forecast?.list?.length) {
    const byDay = {};
    for (const item of forecast.list) {
      const dayKey = item.dt_txt.split(" ")[0];
      if (!byDay[dayKey]) byDay[dayKey] = [];
      byDay[dayKey].push(item);
    }
    const lines = Object.entries(byDay)
      .slice(0, 5)
      .map(([day, items]) => {
        const temps = items.map((x) => x.main.temp);
        const min = Math.round(Math.min(...temps));
        const max = Math.round(Math.max(...temps));
        const mid = items[Math.floor(items.length / 2)];
        const label = new Date(day + "T12:00:00").toLocaleDateString("en-IN", {
          weekday: "short",
          day: "numeric",
          month: "short",
        });
        return `• ${label}: ${min}°C – ${max}°C, ${mid.weather[0].description}`;
      });
    return `5-Day Forecast for ${primary.name}:\n${lines.join("\n")}`;
  }

  // Default comprehensive briefing
  return [
    `Live Weather Briefing for ${primary.name}, ${primary.sys?.country || "IN"}:`,
    `• Temperature: ${temp}°C (feels like ${feels}°C) — ${desc}`,
    `• Humidity: ${humidity}% | Wind: ${windKmh} km/h | Visibility: ${visKm} km | Pressure: ${primary.main.pressure} hPa`,
    temp >= 36
      ? `Tip: It's quite warm — stay hydrated and avoid peak afternoon sun.`
      : temp <= 15
      ? `Tip: Cool weather — keep a light jacket handy.`
      : `Tip: Pleasant conditions overall. Ask me about outfits, rain chances, travel safety, or compare two cities!`,
  ].join("\n");
}

// =========================
// ROUTES
// =========================

app.get("/", (req, res) => {
  res.send("WeatherGPT Backend is Running");
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", uptime: Math.round(process.uptime()) });
});

app.get("/api/test", (req, res) => {
  res.json({
    ok: true,
    message: "Frontend and Backend Connected Successfully",
    provider: hasOwmKey ? "OpenWeatherMap (with Open-Meteo fallback)" : "Open-Meteo (Live, No API Key Required)",
    aiProvider: GEMINI_API_KEY ? "Gemini AI + Live Weather" : "WeatherGPT Built-in Live Intelligence",
  });
});

app.get("/api/weather", async (req, res) => {
  try {
    const { city, lat, lon } = req.query;
    if (!city && (lat === undefined || lon === undefined)) {
      return res.status(400).json({ message: "City or coordinates (lat, lon) are required" });
    }
    const data = await getWeatherData({ city, lat, lon });
    res.json(data);
  } catch (error) {
    res.status(error.status || error.response?.status || 500).json({
      message: error.message || "Failed to fetch weather data",
    });
  }
});

app.get("/api/forecast", async (req, res) => {
  try {
    const { city, lat, lon } = req.query;
    if (!city && (lat === undefined || lon === undefined)) {
      return res.status(400).json({ message: "City or coordinates (lat, lon) are required" });
    }
    const data = await getForecastData({ city, lat, lon });
    res.json(data);
  } catch (error) {
    res.status(error.status || error.response?.status || 500).json({
      message: error.message || "Failed to fetch forecast data",
    });
  }
});

app.get("/api/cities-weather", async (req, res) => {
  try {
    const requested = req.query.cities
      ? req.query.cities.split(",").map((c) => c.trim()).filter(Boolean)
      : INDIA_CITIES.map((c) => c.name);

    const results = await Promise.allSettled(
      requested.map((city) => getWeatherData({ city }))
    );

    const valid = results
      .filter((r) => r.status === "fulfilled" && r.value)
      .map((r) => r.value);

    res.json({ cities: valid, total: valid.length });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch cities weather" });
  }
});

app.get("/api/alerts", async (req, res) => {
  try {
    const focusCity = req.query.city?.trim();
    const scanCities = ["Delhi", "Mumbai", "Kolkata", "Chennai", "Bengaluru", "Patna", "Jaipur", "Guwahati", "Srinagar"];
    if (
      focusCity &&
      !scanCities.some((c) => c.toLowerCase() === focusCity.toLowerCase())
    ) {
      scanCities.unshift(focusCity);
    }

    const results = await Promise.allSettled(
      scanCities.map((city) => getWeatherData({ city }))
    );

    const allAlerts = [];
    for (const r of results) {
      if (r.status === "fulfilled" && r.value) {
        allAlerts.push(...evaluateAlertsForCity(r.value));
      }
    }

    const rank = { red: 0, orange: 1, yellow: 2, green: 3 };
    allAlerts.sort((a, b) => rank[a.severity] - rank[b.severity]);

    res.json({
      alerts: allAlerts,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to generate weather alerts" });
  }
});

app.post("/api/ai-chat", async (req, res) => {
  try {
    const { message, city = "Kolkata" } = req.body || {};
    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Message is required" });
    }

    const targetCities = extractCitiesFromPrompt(message, city);
    const weatherResults = await Promise.allSettled(
      targetCities.map((c) => getWeatherData({ city: c }))
    );

    const validWeather = weatherResults
      .filter((r) => r.status === "fulfilled" && r.value)
      .map((r) => r.value);

    if (validWeather.length === 0) {
      return res.json({
        reply: `I couldn't find weather data for "${targetCities.join(", ")}". Try specifying a city name like Delhi, Mumbai, Kolkata, or Patna.`,
        cityContext: null,
      });
    }

    let forecast = null;
    try {
      forecast = await getForecastData({ city: validWeather[0].name });
    } catch {
      forecast = null;
    }

    // Use Gemini API if user configured GEMINI_API_KEY
    if (GEMINI_API_KEY) {
      try {
        const contextStr = JSON.stringify({
          current: validWeather.map((w) => ({
            city: w.name,
            tempC: w.main.temp,
            feelsLikeC: w.main.feels_like,
            humidity: w.main.humidity,
            windKmh: Number((w.wind.speed * 3.6).toFixed(1)),
            condition: w.weather[0].description,
            visibilityKm: (w.visibility ?? 10000) / 1000,
          })),
          upcoming24h: forecast?.list?.slice(0, 8)?.map((f) => ({
            time: f.dt_txt,
            tempC: f.main.temp,
            condition: f.weather[0].description,
            rainChance: Math.round((f.pop || 0) * 100) + "%",
          })),
        });

        const geminiRes = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `You are WeatherGPT, a concise and helpful Indian weather intelligence assistant. Answer the user's question using ONLY this live weather data:\n${contextStr}\n\nUser question: ${message}`,
                  },
                ],
              },
            ],
          },
          { timeout: 12000 }
        );

        const aiText =
          geminiRes.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (aiText) {
          return res.json({
            reply: aiText.trim(),
            cityContext: validWeather[0].name,
            source: "gemini",
          });
        }
      } catch {
        // Fall through to built-in weather intelligence engine
      }
    }

    const reply = buildSmartWeatherReply(message, validWeather, forecast);
    res.json({
      reply,
      cityContext: validWeather[0].name,
      source: "weathergpt-engine",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message || "WeatherGPT AI encountered an error",
    });
  }
});

const PORT = process.env.PORT || 5000;

console.log(
  "Weather Provider:",
  hasOwmKey ? "OpenWeatherMap (+ Open-Meteo fallback)" : "Open-Meteo (No API key needed)"
);
console.log("AI Provider:", GEMINI_API_KEY ? "Gemini AI" : "Built-in WeatherGPT Engine");

app.listen(PORT, () => {
  console.log(`WeatherGPT Backend running on http://localhost:${PORT}`);
});
