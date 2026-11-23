import { useState, useEffect, useCallback } from "react";
import {
  Search,
  CalendarDays,
  Droplets,
  Wind,
  Umbrella,
  RefreshCw,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { useWeather } from "../context/WeatherContext";
import { WeatherConditionIcon } from "../utils/weatherIcon";

function groupForecastByDay(list) {
  const groups = {};
  for (const item of list) {
    const dateKey = (item.dt_txt || "").split(" ")[0];
    if (!dateKey) continue;
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(item);
  }

  return Object.entries(groups)
    .slice(0, 5)
    .map(([dateKey, slots]) => {
      const temps = slots.map((s) => s.main?.temp ?? 0);
      const minTemp = Math.min(...temps);
      const maxTemp = Math.max(...temps);
      const avgHumidity = Math.round(
        slots.reduce((acc, s) => acc + (s.main?.humidity ?? 0), 0) / slots.length
      );
      const maxWind = Math.max(...slots.map((s) => s.wind?.speed ?? 0));
      const maxPop = Math.round(
        Math.max(...slots.map((s) => (s.pop ?? 0) * 100))
      );
      // Pick midday slot for representative condition
      const rep =
        slots.find((s) => s.dt_txt.includes("12:00:00")) ||
        slots[Math.floor(slots.length / 2)];

      return {
        dateKey,
        minTemp,
        maxTemp,
        avgHumidity,
        maxWind,
        maxPop,
        condition: rep.weather?.[0] || { main: "Clear", description: "clear", icon: "01d" },
        slots,
      };
    });
}

function Forecast() {
  const {
    apiBaseUrl,
    selectedCity,
    setSelectedCity,
    formatTemp,
    formatWind,
  } = useWeather();

  const [cityInput, setCityInput] = useState(selectedCity);
  const [cityTitle, setCityTitle] = useState(selectedCity);
  const [days, setDays] = useState([]);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchForecast = useCallback(
    async (targetCity) => {
      const clean = (targetCity || "").trim();
      if (!clean) return;
      try {
        setLoading(true);
        setError("");

        const res = await fetch(
          `${apiBaseUrl}/api/forecast?city=${encodeURIComponent(clean)}`
        );
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || "Failed to load forecast");
        }

        const grouped = groupForecastByDay(data.list || []);
        setDays(grouped);
        setSelectedDayIndex(0);
        setCityTitle(data.city?.name || clean);
        setCityInput(data.city?.name || clean);
      } catch (err) {
        setError(
          err.message === "Failed to fetch"
            ? "Cannot reach backend server. Ensure backend is running on port 5000."
            : err.message
        );
        setDays([]);
      } finally {
        setLoading(false);
      }
    },
    [apiBaseUrl]
  );

  useEffect(() => {
    fetchForecast(selectedCity);
  }, [selectedCity, fetchForecast]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const clean = cityInput.trim();
    if (!clean) return;
    setSelectedCity(clean);
    fetchForecast(clean);
  };

  const activeDay = days[selectedDayIndex];

  return (
    <div className="forecast-page">
      <div className="page-header">
        <div>
          <h1>Extended 5-Day Forecast</h1>
          <p className="page-subtitle">
            Daily highs/lows and 3-hour interval breakdown for <b>{cityTitle}</b>
          </p>
        </div>

        <form className="forecast-search-form" onSubmit={handleSubmit}>
          <div className="forecast-search">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search city..."
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
            />
          </div>
          <button type="submit" className="primary-btn">
            Search
          </button>
        </form>
      </div>

      {error && (
        <div className="error-banner">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="loading">
          <RefreshCw size={22} className="spin" />
          <span>Loading 5-day forecast...</span>
        </div>
      ) : (
        <>
          <div className="forecast-container">
            {days.map((day, idx) => (
              <button
                type="button"
                key={day.dateKey}
                className={`forecast-card ${
                  idx === selectedDayIndex ? "active" : ""
                }`}
                onClick={() => setSelectedDayIndex(idx)}
              >
                <div className="forecast-card-date">
                  <CalendarDays size={16} color="#ff9d2e" />
                  <span>
                    {idx === 0
                      ? "Today"
                      : new Date(day.dateKey + "T12:00:00").toLocaleDateString(
                          "en-IN",
                          { weekday: "short", day: "numeric", month: "short" }
                        )}
                  </span>
                </div>

                <div className="forecast-card-icon">
                  <WeatherConditionIcon
                    main={day.condition.main}
                    icon={day.condition.icon}
                    size={38}
                  />
                </div>

                <div className="forecast-temps">
                  <strong>{formatTemp(day.maxTemp)}</strong>
                  <span>{formatTemp(day.minTemp)}</span>
                </div>

                <p className="forecast-desc">{day.condition.description}</p>

                <div className="forecast-meta">
                  <span>
                    <Umbrella size={13} /> {day.maxPop}%
                  </span>
                  <span>
                    <Droplets size={13} /> {day.avgHumidity}%
                  </span>
                  <span>
                    <Wind size={13} /> {formatWind(day.maxWind)}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {activeDay && (
            <section className="section-card">
              <div className="section-card-header">
                <div className="section-title-group">
                  <Clock size={18} color="#ff9d2e" />
                  <h2>
                    3-Hour Breakdown —{" "}
                    {new Date(activeDay.dateKey + "T12:00:00").toLocaleDateString(
                      "en-IN",
                      { weekday: "long", day: "numeric", month: "long" }
                    )}
                  </h2>
                </div>
              </div>

              <div className="hourly-strip">
                {activeDay.slots.map((slot) => (
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
                      {Math.round((slot.pop || 0) * 100)}% rain •{" "}
                      {slot.main?.humidity}% RH
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

export default Forecast;
