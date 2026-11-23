import { useState, useEffect, useCallback } from "react";
import {
  BarChart3,
  Thermometer,
  Droplets,
  Wind,
  Gauge,
  RefreshCw,
  Activity,
  AlertTriangle,
} from "lucide-react";
import { useWeather } from "../context/WeatherContext";

const COMPARE_OPTIONS = [
  "Delhi",
  "Mumbai",
  "Kolkata",
  "Chennai",
  "Bengaluru",
  "Hyderabad",
  "Patna",
  "Jaipur",
  "Srinagar",
  "Guwahati",
];

function TemperatureChart({ slots, formatTempValue, tempSymbol }) {
  if (!slots || slots.length < 2) return null;

  const width = 760;
  const height = 220;
  const padX = 38;
  const padY = 28;

  const temps = slots.map((s) => formatTempValue(s.main?.temp));
  const feels = slots.map((s) => formatTempValue(s.main?.feels_like));
  const allVals = [...temps, ...feels].filter((v) => typeof v === "number");
  const minVal = Math.min(...allVals) - 2;
  const maxVal = Math.max(...allVals) + 2;
  const range = Math.max(1, maxVal - minVal);

  const getX = (i) =>
    padX + (i / (slots.length - 1)) * (width - padX * 2);
  const getY = (val) =>
    height - padY - ((val - minVal) / range) * (height - padY * 2);

  const tempPoints = temps
    .map((v, i) => `${getX(i).toFixed(1)},${getY(v).toFixed(1)}`)
    .join(" ");
  const feelsPoints = feels
    .map((v, i) => `${getX(i).toFixed(1)},${getY(v).toFixed(1)}`)
    .join(" ");

  const areaPoints = `${padX},${height - padY} ${tempPoints} ${getX(
    slots.length - 1
  ).toFixed(1)},${height - padY}`;

  return (
    <div className="svg-chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} className="analytics-svg">
        <defs>
          <linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff9d2e" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ff9d2e" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = padY + t * (height - padY * 2);
          const val = Math.round(maxVal - t * range);
          return (
            <g key={t}>
              <line
                x1={padX}
                y1={y}
                x2={width - padX}
                y2={y}
                stroke="#1e2d42"
                strokeDasharray="4 4"
              />
              <text x={4} y={y + 4} fill="#64748b" fontSize="11">
                {val}{tempSymbol}
              </text>
            </g>
          );
        })}

        <polygon points={areaPoints} fill="url(#tempFill)" />

        <polyline
          fill="none"
          stroke="#38bdf8"
          strokeWidth="2"
          strokeDasharray="5 4"
          points={feelsPoints}
        />

        <polyline
          fill="none"
          stroke="#ff9d2e"
          strokeWidth="3"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={tempPoints}
        />

        {slots.map((slot, i) => {
          const x = getX(i);
          const y = getY(temps[i]);
          const label = new Date(slot.dt * 1000).toLocaleTimeString("en-IN", {
            hour: "numeric",
          });
          return (
            <g key={slot.dt}>
              <circle cx={x} cy={y} r="4" fill="#ff9d2e" stroke="#08111f" strokeWidth="1.5" />
              {i % 2 === 0 && (
                <>
                  <text
                    x={x}
                    y={y - 10}
                    textAnchor="middle"
                    fill="#f8fafc"
                    fontSize="11"
                    fontWeight="600"
                  >
                    {temps[i]}{tempSymbol}
                  </text>
                  <text
                    x={x}
                    y={height - 6}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="10"
                  >
                    {label}
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>

      <div className="chart-legend">
        <span><i style={{ background: "#ff9d2e" }} /> Actual Temp</span>
        <span><i style={{ background: "#38bdf8" }} /> Feels Like</span>
      </div>
    </div>
  );
}

function ClimateAnalytics() {
  const {
    apiBaseUrl,
    selectedCity,
    formatTemp,
    formatTempValue,
    tempSymbol,
    formatWind,
  } = useWeather();

  const [forecast, setForecast] = useState([]);
  const [current, setCurrent] = useState(null);
  const [compareCity, setCompareCity] = useState(
    selectedCity.toLowerCase() === "delhi" ? "Mumbai" : "Delhi"
  );
  const [compareWeather, setCompareWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [wRes, fRes, cRes] = await Promise.all([
        fetch(`${apiBaseUrl}/api/weather?city=${encodeURIComponent(selectedCity)}`),
        fetch(`${apiBaseUrl}/api/forecast?city=${encodeURIComponent(selectedCity)}`),
        fetch(`${apiBaseUrl}/api/weather?city=${encodeURIComponent(compareCity)}`),
      ]);

      const wData = await wRes.json();
      const fData = await fRes.json();
      if (!wRes.ok) throw new Error(wData.message || "Failed to load analytics");

      setCurrent(wData);
      setForecast(fRes.ok ? (fData.list || []).slice(0, 12) : []);
      if (cRes.ok) {
        setCompareWeather(await cRes.json());
      } else {
        setCompareWeather(null);
      }
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Backend server is not reachable on port 5000."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, selectedCity, compareCity]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const temps = forecast.map((s) => s.main?.temp ?? 0);
  const avgTemp = temps.length
    ? temps.reduce((a, b) => a + b, 0) / temps.length
    : current?.main?.temp ?? 0;
  const maxTemp = temps.length ? Math.max(...temps) : current?.main?.temp_max ?? 0;
  const minTemp = temps.length ? Math.min(...temps) : current?.main?.temp_min ?? 0;
  const avgHumidity = forecast.length
    ? Math.round(
        forecast.reduce((a, s) => a + (s.main?.humidity ?? 0), 0) /
          forecast.length
      )
    : current?.main?.humidity ?? 0;
  const peakWind = forecast.length
    ? Math.max(...forecast.map((s) => s.wind?.speed ?? 0))
    : current?.wind?.speed ?? 0;

  // Approximate Dew Point (°C)
  const tC = current?.main?.temp ?? 25;
  const rh = current?.main?.humidity ?? 60;
  const dewPointC = tC - (100 - rh) / 5;

  const comfortLabel =
    tC >= 38
      ? "Extreme Heat Stress"
      : tC >= 32 && rh >= 65
      ? "Humid & Muggy"
      : tC <= 12
      ? "Chilly"
      : "Comfortable";

  return (
    <div className="analytics-page">
      <div className="page-header">
        <div>
          <h1>Climate Analytics</h1>
          <p className="page-subtitle">
            36-hour atmospheric trends, humidity distribution, and city comparison for{" "}
            <b>{selectedCity}</b>
          </p>
        </div>

        <button
          type="button"
          className="action-btn"
          onClick={loadAnalytics}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? "spin" : ""} />
          <span>Refresh Data</span>
        </button>
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
          <span>Crunching atmospheric analytics for {selectedCity}...</span>
        </div>
      ) : (
        <>
          {/* KPI ROW */}
          <div className="analytics-kpi-grid">
            <div className="kpi-card">
              <div className="kpi-head">
                <span>36h Avg Temp</span>
                <Thermometer size={18} color="#ff9d2e" />
              </div>
              <strong>{formatTemp(avgTemp)}</strong>
              <small>
                Range: {formatTemp(minTemp)} to {formatTemp(maxTemp)}
              </small>
            </div>

            <div className="kpi-card">
              <div className="kpi-head">
                <span>Avg Humidity</span>
                <Droplets size={18} color="#38bdf8" />
              </div>
              <strong>{avgHumidity}%</strong>
              <small>Dew Point: {formatTemp(dewPointC)}</small>
            </div>

            <div className="kpi-card">
              <div className="kpi-head">
                <span>Peak Wind</span>
                <Wind size={18} color="#34d399" />
              </div>
              <strong>{formatWind(peakWind)}</strong>
              <small>Pressure: {current?.main?.pressure ?? "--"} hPa</small>
            </div>

            <div className="kpi-card">
              <div className="kpi-head">
                <span>Comfort Index</span>
                <Activity size={18} color="#a78bfa" />
              </div>
              <strong>{comfortLabel}</strong>
              <small>Feels like {formatTemp(current?.main?.feels_like)}</small>
            </div>
          </div>

          {/* TEMPERATURE TREND CHART */}
          <section className="section-card">
            <div className="section-card-header">
              <div className="section-title-group">
                <BarChart3 size={18} color="#ff9d2e" />
                <h2>Temperature &amp; Feels-Like Curve (Next 36 Hours)</h2>
              </div>
            </div>
            <TemperatureChart
              slots={forecast}
              formatTempValue={formatTempValue}
              tempSymbol={tempSymbol}
            />
          </section>

          {/* HUMIDITY & RAIN PROBABILITY BARS */}
          <section className="section-card">
            <div className="section-card-header">
              <div className="section-title-group">
                <Droplets size={18} color="#38bdf8" />
                <h2>Humidity &amp; Rain Probability Timeline</h2>
              </div>
            </div>

            <div className="bar-chart-grid">
              {forecast.slice(0, 8).map((slot) => {
                const hum = slot.main?.humidity ?? 0;
                const pop = Math.round((slot.pop ?? 0) * 100);
                return (
                  <div className="bar-col" key={slot.dt}>
                    <div className="bar-tracks">
                      <div
                        className="bar-fill humidity"
                        style={{ height: `${Math.max(8, hum)}%` }}
                        title={`Humidity: ${hum}%`}
                      />
                      <div
                        className="bar-fill rain"
                        style={{ height: `${Math.max(6, pop)}%` }}
                        title={`Rain Chance: ${pop}%`}
                      />
                    </div>
                    <span className="bar-val">{hum}%</span>
                    <span className="bar-label">
                      {new Date(slot.dt * 1000).toLocaleTimeString("en-IN", {
                        hour: "numeric",
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="chart-legend">
              <span><i style={{ background: "#38bdf8" }} /> Humidity %</span>
              <span><i style={{ background: "#a78bfa" }} /> Rain Chance %</span>
            </div>
          </section>

          {/* CITY VS CITY LIVE COMPARISON */}
          {current && compareWeather && (
            <section className="section-card">
              <div className="section-card-header">
                <div className="section-title-group">
                  <Gauge size={18} color="#ff9d2e" />
                  <h2>Live City-vs-City Comparison</h2>
                </div>

                <select
                  className="select-input"
                  value={compareCity}
                  onChange={(e) => setCompareCity(e.target.value)}
                >
                  {COMPARE_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      Compare with {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="compare-table-wrap">
                <table className="compare-table">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th>{current.name}</th>
                      <th>{compareWeather.name}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Temperature</td>
                      <td><b>{formatTemp(current.main?.temp)}</b></td>
                      <td><b>{formatTemp(compareWeather.main?.temp)}</b></td>
                    </tr>
                    <tr>
                      <td>Feels Like</td>
                      <td>{formatTemp(current.main?.feels_like)}</td>
                      <td>{formatTemp(compareWeather.main?.feels_like)}</td>
                    </tr>
                    <tr>
                      <td>Humidity</td>
                      <td>{current.main?.humidity}%</td>
                      <td>{compareWeather.main?.humidity}%</td>
                    </tr>
                    <tr>
                      <td>Wind Speed</td>
                      <td>{formatWind(current.wind?.speed)}</td>
                      <td>{formatWind(compareWeather.wind?.speed)}</td>
                    </tr>
                    <tr>
                      <td>Pressure</td>
                      <td>{current.main?.pressure} hPa</td>
                      <td>{compareWeather.main?.pressure} hPa</td>
                    </tr>
                    <tr>
                      <td>Condition</td>
                      <td style={{ textTransform: "capitalize" }}>
                        {current.weather?.[0]?.description}
                      </td>
                      <td style={{ textTransform: "capitalize" }}>
                        {compareWeather.weather?.[0]?.description}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

export default ClimateAnalytics;
