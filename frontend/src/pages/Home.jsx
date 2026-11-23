import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  MapPin,
  Wind,
  Droplets,
  Eye,
  Gauge,
  Sunrise,
  Sunset,
  Cloud,
  LocateFixed,
  Bookmark,
  RefreshCw,
  Thermometer,
  Clock,
  MessageSquare,
  CalendarDays,
  AlertTriangle,
} from "lucide-react";
import { useWeather } from "../context/WeatherContext";
import { WeatherConditionIcon } from "../utils/weatherIcon";

const QUICK_CITIES = ["Kolkata", "Delhi", "Mumbai", "Bengaluru", "Patna", "Chennai"];

function Home() {
  const {
    apiBaseUrl,
    selectedCity,
    setSelectedCity,
    setActiveLocationMeta,
    toggleSavedPlace,
    isCitySaved,
    settings,
    formatTempValue,
    formatTemp,
    tempSymbol,
    formatWind,
  } = useWeather();

  const [searchInput, setSearchInput] = useState(selectedCity);
  const [weather, setWeather] = useState(null);
  const [hourly, setHourly] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchCityWeather = useCallback(
    async (queryParams, displayFallback) => {
      try {
        setLoading(true);
        setError("");

        const qs = new URLSearchParams(queryParams).toString();
        const [wRes, fRes] = await Promise.all([
          fetch(`${apiBaseUrl}/api/weather?${qs}`),
          fetch(`${apiBaseUrl}/api/forecast?${qs}`),
        ]);

        const wData = await wRes.json();
        if (!wRes.ok) {
          throw new Error(wData.message || "Could not fetch weather data");
        }

        setWeather(wData);
        setLastUpdated(new Date());

        const resolvedName = wData.name || displayFallback || selectedCity;
        setSearchInput(resolvedName);
        if (resolvedName && resolvedName !== selectedCity) {
          setSelectedCity(resolvedName);
        }
        setActiveLocationMeta({
          name: resolvedName,
          country: wData.sys?.country || "IN",
          coord: wData.coord || null,
        });

        if (fRes.ok) {
          const fData = await fRes.json();
          setHourly((fData.list || []).slice(0, 8));
        } else {
          setHourly([]);
        }
      } catch (err) {
        setError(
          err.message === "Failed to fetch"
            ? "Cannot reach WeatherGPT backend. Make sure the backend server is running on port 5000."
            : err.message
        );
      } finally {
        setLoading(false);
      }
    },
    [apiBaseUrl, selectedCity, setSelectedCity, setActiveLocationMeta]
  );

  useEffect(() => {
    fetchCityWeather({ city: selectedCity }, selectedCity);
  }, [selectedCity, fetchCityWeather]);

  // Optional auto-refresh from Settings
  useEffect(() => {
    if (!settings.autoRefresh || !settings.refreshInterval) return;
    const ms = Math.max(1, Number(settings.refreshInterval)) * 60 * 1000;
    const id = setInterval(() => {
      fetchCityWeather({ city: selectedCity }, selectedCity);
    }, ms);
    return () => clearInterval(id);
  }, [settings.autoRefresh, settings.refreshInterval, selectedCity, fetchCityWeather]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleaned = searchInput.trim();
    if (!cleaned) return;
    if (cleaned.toLowerCase() === selectedCity.toLowerCase()) {
      fetchCityWeather({ city: cleaned }, cleaned);
    } else {
      setSelectedCity(cleaned);
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        fetchCityWeather(
          { lat: pos.coords.latitude, lon: pos.coords.longitude },
          "My Location"
        );
      },
      () => {
        setLocating(false);
        setError("Location permission denied. Please search for a city manually.");
      },
      { timeout: 10000 }
    );
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "--";
    return new Date(timestamp * 1000).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const saved = weather ? isCitySaved(weather.name) : false;
  const visKm =
    typeof weather?.visibility === "number"
      ? `${(weather.visibility / 1000).toFixed(1)} km`
      : "--";

  return (
    <div className="dashboard-home">
      {/* TOP SEARCH BAR — Always visible even on error */}
      <div className="home-search-row">
        <form className="dashboard-search" onSubmit={handleSubmit}>
          <Search size={19} />
          <input
            type="text"
            placeholder="Search any Indian or global city (e.g., Patna, Delhi, Mumbai)..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button type="submit" className="search-submit-btn">
            Search
          </button>
        </form>

        <button
          type="button"
          className="action-btn"
          onClick={handleUseMyLocation}
          disabled={locating}
          title="Use current GPS location"
        >
          <LocateFixed size={17} />
          <span>{locating ? "Locating..." : "My Location"}</span>
        </button>

        <button
          type="button"
          className="action-btn icon-only"
          onClick={() => fetchCityWeather({ city: selectedCity }, selectedCity)}
          disabled={loading}
          title="Refresh live weather"
        >
          <RefreshCw size={17} className={loading ? "spin" : ""} />
        </button>
      </div>

      {/* QUICK CITY CHIPS */}
      <div className="quick-chips">
        {QUICK_CITIES.map((c) => (
          <button
            key={c}
            type="button"
            className={`chip-btn ${
              selectedCity.toLowerCase() === c.toLowerCase() ? "active" : ""
            }`}
            onClick={() => setSelectedCity(c)}
          >
            {c}
          </button>
        ))}
      </div>

      {/* ERROR BANNER (non-blocking so user can still search) */}
      {error && (
        <div className="error-banner">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading && !weather && (
        <div className="loading">
          <RefreshCw size={24} className="spin" />
          <span>Loading live weather for {selectedCity}...</span>
        </div>
      )}

      {weather && (
        <>
          {/* MAIN WEATHER CARD */}
          <div className="main-weather-card">
            <div className="weather-header">
              <div className="weather-location-title">
                <div className="location-icon">
                  <MapPin size={22} />
                </div>
                <div>
                  <h1>
                    {weather.name}, {weather.sys?.country || "IN"}
                  </h1>
                  <p>
                    {new Date().toLocaleDateString("en-IN", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                    {weather.coord
                      ? ` • ${weather.coord.lat.toFixed(2)}°N, ${weather.coord.lon.toFixed(2)}°E`
                      : ""}
                  </p>
                </div>
              </div>

              <div className="weather-header-actions">
                <button
                  type="button"
                  className={`save-place-btn ${saved ? "saved" : ""}`}
                  onClick={() => toggleSavedPlace(weather.name)}
                >
                  <Bookmark size={16} fill={saved ? "currentColor" : "none"} />
                  <span>{saved ? "Saved" : "Save Place"}</span>
                </button>

                <div className="weather-status">
                  <span className="live-dot"></span>
                  <span>
                    Live{" "}
                    {lastUpdated
                      ? `• ${lastUpdated.toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}`
                      : ""}
                  </span>
                </div>
              </div>
            </div>

            <div className="weather-divider"></div>

            {/* MAIN TEMPERATURE & CONDITION */}
            <div className="weather-main-content">
              <div className="temperature-section">
                <h2>
                  {formatTempValue(weather.main?.temp)}
                  <span>{tempSymbol}</span>
                </h2>
                <p>
                  Feels like <b>{formatTemp(weather.main?.feels_like)}</b>
                  {"  •  "}
                  H: <b>{formatTemp(weather.main?.temp_max)}</b> / L:{" "}
                  <b>{formatTemp(weather.main?.temp_min)}</b>
                </p>
              </div>

              <div className="weather-condition">
                <div className="condition-icon">
                  <WeatherConditionIcon
                    main={weather.weather?.[0]?.main}
                    icon={weather.weather?.[0]?.icon}
                    size={34}
                  />
                </div>
                <div>
                  <h3>{weather.weather?.[0]?.main || "Clear"}</h3>
                  <p style={{ textTransform: "capitalize" }}>
                    {weather.weather?.[0]?.description || "clear sky"}
                  </p>
                </div>
              </div>
            </div>

            {/* 4-METRIC INFO GRID */}
            <div className="weather-info-grid">
              <div className="info-box">
                <div className="info-icon blue">
                  <Droplets size={22} />
                </div>
                <div>
                  <p>Humidity</p>
                  <h3>{weather.main?.humidity ?? "--"}%</h3>
                </div>
              </div>

              <div className="info-box">
                <div className="info-icon green">
                  <Wind size={22} />
                </div>
                <div>
                  <p>Wind Speed</p>
                  <h3>{formatWind(weather.wind?.speed)}</h3>
                </div>
              </div>

              <div className="info-box">
                <div className="info-icon purple">
                  <Cloud size={22} />
                </div>
                <div>
                  <p>Cloud Cover</p>
                  <h3>{weather.clouds?.all ?? 0}%</h3>
                </div>
              </div>

              <div className="info-box">
                <div className="info-icon orange">
                  <Eye size={22} />
                </div>
                <div>
                  <p>Visibility</p>
                  <h3>{visKm}</h3>
                </div>
              </div>
            </div>

            {/* FOOTER DETAILS (No duplicates!) */}
            <div className="weather-footer">
              <div>
                <Gauge size={17} />
                <span>
                  Pressure: <b>{weather.main?.pressure ?? "--"} hPa</b>
                </span>
              </div>

              <div>
                <Thermometer size={17} />
                <span>
                  Range:{" "}
                  <b>
                    {formatTemp(weather.main?.temp_min)} –{" "}
                    {formatTemp(weather.main?.temp_max)}
                  </b>
                </span>
              </div>

              <div>
                <Sunrise size={17} />
                <span>
                  Sunrise: <b>{formatTime(weather.sys?.sunrise)}</b>
                </span>
              </div>

              <div>
                <Sunset size={17} />
                <span>
                  Sunset: <b>{formatTime(weather.sys?.sunset)}</b>
                </span>
              </div>
            </div>
          </div>

          {/* 24-HOUR FORECAST STRIP */}
          {hourly.length > 0 && (
            <section className="section-card">
              <div className="section-card-header">
                <div className="section-title-group">
                  <Clock size={18} color="#ff9d2e" />
                  <h2>Next 24 Hours Forecast</h2>
                </div>
                <div className="section-links">
                  <Link to="/forecast" className="text-link">
                    <CalendarDays size={15} /> 5-Day Forecast
                  </Link>
                  <Link to="/weather-ai" className="text-link">
                    <MessageSquare size={15} /> Ask WeatherGPT AI
                  </Link>
                </div>
              </div>

              <div className="hourly-strip">
                {hourly.map((slot) => (
                  <div className="hourly-item" key={slot.dt}>
                    <span className="hourly-time">
                      {new Date(slot.dt * 1000).toLocaleTimeString("en-IN", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                    <WeatherConditionIcon
                      main={slot.weather?.[0]?.main}
                      icon={slot.weather?.[0]?.icon}
                      size={24}
                    />
                    <strong className="hourly-temp">
                      {formatTemp(slot.main?.temp)}
                    </strong>
                    <span className="hourly-sub">
                      {Math.round((slot.pop || 0) * 100)}% rain
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

export default Home;
