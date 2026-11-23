import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bookmark,
  Plus,
  Trash2,
  MapPin,
  Droplets,
  Wind,
  RefreshCw,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { useWeather } from "../context/WeatherContext";
import { WeatherConditionIcon } from "../utils/weatherIcon";

function SavedPlace() {
  const {
    apiBaseUrl,
    savedPlaces,
    addSavedPlace,
    removeSavedPlace,
    selectedCity,
    setSelectedCity,
    formatTemp,
    formatWind,
  } = useWeather();
  const navigate = useNavigate();

  const [newCity, setNewCity] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [weatherList, setWeatherList] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadSavedWeather = useCallback(async () => {
    if (savedPlaces.length === 0) {
      setWeatherList([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError("");
      const res = await fetch(
        `${apiBaseUrl}/api/cities-weather?cities=${encodeURIComponent(
          savedPlaces.join(",")
        )}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load saved cities");
      setWeatherList(data.cities || []);
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Backend server is not reachable on port 5000."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, savedPlaces]);

  useEffect(() => {
    loadSavedWeather();
  }, [loadSavedWeather]);

  const handleAddCity = async (e) => {
    e.preventDefault();
    const clean = newCity.trim();
    if (!clean) return;
    try {
      setAdding(true);
      setError("");
      const res = await fetch(
        `${apiBaseUrl}/api/weather?city=${encodeURIComponent(clean)}`
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || `City "${clean}" not found`);
      }
      addSavedPlace(data.name || clean);
      setNewCity("");
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleOpenCity = (cityName) => {
    setSelectedCity(cityName);
    navigate("/");
  };

  return (
    <div className="saved-page">
      <div className="page-header">
        <div>
          <h1>Saved Places</h1>
          <p className="page-subtitle">
            Monitor live weather across your pinned cities and switch dashboard location in one click
          </p>
        </div>

        <button
          type="button"
          className="action-btn"
          onClick={loadSavedWeather}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? "spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ADD NEW CITY FORM */}
      <form className="add-city-bar" onSubmit={handleAddCity}>
        <input
          type="text"
          placeholder="Add a city to saved places (e.g., Jaipur, Ranchi, Kochi)..."
          value={newCity}
          onChange={(e) => setNewCity(e.target.value)}
        />
        <button type="submit" className="primary-btn" disabled={adding}>
          <Plus size={17} />
          <span>{adding ? "Checking..." : "Add Place"}</span>
        </button>
      </form>

      {error && (
        <div className="error-banner">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="loading">
          <RefreshCw size={22} className="spin" />
          <span>Loading your saved places...</span>
        </div>
      ) : savedPlaces.length === 0 ? (
        <div className="empty-state">
          <Bookmark size={36} color="#64748b" />
          <h3>No Saved Places Yet</h3>
          <p>Add your favorite cities above to track their live weather here.</p>
        </div>
      ) : (
        <div className="cities-grid">
          {weatherList.map((city) => {
            const isCurrent =
              city.name.toLowerCase() === selectedCity.toLowerCase();
            return (
              <div
                key={city.id || city.name}
                className={`city-weather-card ${isCurrent ? "current-active" : ""}`}
              >
                <div className="city-card-top">
                  <div className="city-card-title">
                    <MapPin size={16} color="#ff9d2e" />
                    <h2>{city.name}</h2>
                    {isCurrent && <span className="active-tag">Active</span>}
                  </div>
                  <button
                    type="button"
                    className="icon-danger-btn"
                    onClick={() => removeSavedPlace(city.name)}
                    title={`Remove ${city.name}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div className="saved-card-mid">
                  <div className="city-card-temp">
                    {formatTemp(city.main?.temp)}
                  </div>
                  <WeatherConditionIcon
                    main={city.weather?.[0]?.main}
                    icon={city.weather?.[0]?.icon}
                    size={36}
                  />
                </div>

                <p className="city-card-desc">
                  {city.weather?.[0]?.description} • Feels like{" "}
                  {formatTemp(city.main?.feels_like)}
                </p>

                <div className="city-card-meta">
                  <span>
                    <Droplets size={13} /> {city.main?.humidity}%
                  </span>
                  <span>
                    <Wind size={13} /> {formatWind(city.wind?.speed)}
                  </span>
                </div>

                <button
                  type="button"
                  className="card-action-btn"
                  onClick={() => handleOpenCity(city.name)}
                >
                  <span>Set as Active Dashboard</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default SavedPlace;
