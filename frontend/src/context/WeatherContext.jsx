import { createContext, useContext, useEffect, useState } from "react";

const WeatherContext = createContext(null);

const STORAGE_KEYS = {
  CITY: "wgpt_selected_city",
  SAVED: "wgpt_saved_places",
  SETTINGS: "wgpt_settings",
  EMERGENCY: "wgpt_emergency_mode",
};

const DEFAULT_SETTINGS = {
  tempUnit: "C", // "C" | "F"
  windUnit: "kmh", // "kmh" | "ms" | "mph"
  defaultCity: "Kolkata",
  autoRefresh: true,
  refreshInterval: 10, // minutes
  alertsEnabled: true,
};

const DEFAULT_SAVED_PLACES = ["Kolkata", "Delhi", "Mumbai", "Bengaluru", "Patna"];

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function WeatherProvider({ children }) {
  const apiBaseUrl = (
    import.meta.env.VITE_API_URL || "http://localhost:5000"
  ).replace(/\/+$/, "");

  const [settings, setSettings] = useState(() => ({
    ...DEFAULT_SETTINGS,
    ...loadJSON(STORAGE_KEYS.SETTINGS, {}),
  }));

  const [selectedCity, setSelectedCity] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CITY);
    return saved || settings.defaultCity || "Kolkata";
  });

  const [activeLocationMeta, setActiveLocationMeta] = useState({
    name: selectedCity,
    country: "IN",
    coord: null,
  });

  const [savedPlaces, setSavedPlaces] = useState(() =>
    loadJSON(STORAGE_KEYS.SAVED, DEFAULT_SAVED_PLACES)
  );

  const [emergencyMode, setEmergencyMode] = useState(() =>
    loadJSON(STORAGE_KEYS.EMERGENCY, false)
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CITY, selectedCity);
    } catch {
      // ignore storage errors
    }
  }, [selectedCity]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SAVED, JSON.stringify(savedPlaces));
    } catch {
      // ignore
    }
  }, [savedPlaces]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.EMERGENCY,
        JSON.stringify(emergencyMode)
      );
    } catch {
      // ignore
    }
  }, [emergencyMode]);

  const updateSettings = (patch) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  };

  const isCitySaved = (cityName) =>
    savedPlaces.some(
      (c) => c.toLowerCase() === (cityName || "").trim().toLowerCase()
    );

  const addSavedPlace = (cityName) => {
    const clean = (cityName || "").trim();
    if (!clean) return;
    setSavedPlaces((prev) => {
      if (prev.some((c) => c.toLowerCase() === clean.toLowerCase())) {
        return prev;
      }
      return [clean, ...prev];
    });
  };

  const removeSavedPlace = (cityName) => {
    setSavedPlaces((prev) =>
      prev.filter(
        (c) => c.toLowerCase() !== (cityName || "").trim().toLowerCase()
      )
    );
  };

  const toggleSavedPlace = (cityName) => {
    if (isCitySaved(cityName)) {
      removeSavedPlace(cityName);
    } else {
      addSavedPlace(cityName);
    }
  };

  const formatTempValue = (celsius) => {
    if (typeof celsius !== "number" || Number.isNaN(celsius)) return "--";
    if (settings.tempUnit === "F") {
      return Math.round((celsius * 9) / 5 + 32);
    }
    return Math.round(celsius);
  };

  const tempSymbol = settings.tempUnit === "F" ? "°F" : "°C";

  const formatTemp = (celsius) => {
    const val = formatTempValue(celsius);
    return val === "--" ? "--" : `${val}${tempSymbol}`;
  };

  const formatWind = (speedMs) => {
    if (typeof speedMs !== "number" || Number.isNaN(speedMs)) return "--";
    if (settings.windUnit === "ms") return `${speedMs.toFixed(1)} m/s`;
    if (settings.windUnit === "mph") return `${(speedMs * 2.237).toFixed(1)} mph`;
    return `${(speedMs * 3.6).toFixed(1)} km/h`;
  };

  const resetAll = () => {
    setSettings(DEFAULT_SETTINGS);
    setSavedPlaces(DEFAULT_SAVED_PLACES);
    setSelectedCity(DEFAULT_SETTINGS.defaultCity);
    setEmergencyMode(false);
  };

  return (
    <WeatherContext.Provider
      value={{
        apiBaseUrl,
        selectedCity,
        setSelectedCity,
        activeLocationMeta,
        setActiveLocationMeta,
        savedPlaces,
        addSavedPlace,
        removeSavedPlace,
        toggleSavedPlace,
        isCitySaved,
        settings,
        updateSettings,
        emergencyMode,
        setEmergencyMode,
        formatTempValue,
        formatTemp,
        tempSymbol,
        formatWind,
        resetAll,
      }}
    >
      {children}
    </WeatherContext.Provider>
  );
}

export function useWeather() {
  const ctx = useContext(WeatherContext);
  if (!ctx) {
    throw new Error("useWeather must be used inside WeatherProvider");
  }
  return ctx;
}
