import { useState } from "react";
import {
  Settings as SettingsIcon,
  Thermometer,
  Wind,
  MapPin,
  RefreshCw,
  ShieldAlert,
  Wifi,
  WifiOff,
  RotateCcw,
  Check,
} from "lucide-react";
import { useWeather } from "../context/WeatherContext";

function Setting() {
  const {
    apiBaseUrl,
    settings,
    updateSettings,
    setSelectedCity,
    emergencyMode,
    setEmergencyMode,
    resetAll,
  } = useWeather();

  const [defaultCityInput, setDefaultCityInput] = useState(
    settings.defaultCity || "Kolkata"
  );
  const [savedNotice, setSavedNotice] = useState("");
  const [apiStatus, setApiStatus] = useState(null);
  const [testingApi, setTestingApi] = useState(false);

  const showToast = (msg) => {
    setSavedNotice(msg);
    setTimeout(() => setSavedNotice(""), 2500);
  };

  const handleSaveDefaultCity = (e) => {
    e.preventDefault();
    const clean = defaultCityInput.trim();
    if (!clean) return;
    updateSettings({ defaultCity: clean });
    setSelectedCity(clean);
    showToast(`Default city updated to ${clean}`);
  };

  const handleTestBackend = async () => {
    try {
      setTestingApi(true);
      setApiStatus(null);
      const res = await fetch(`${apiBaseUrl}/api/test`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Connection failed");
      setApiStatus({
        ok: true,
        message: data.message,
        provider: data.provider,
        aiProvider: data.aiProvider,
      });
    } catch {
      setApiStatus({
        ok: false,
        message: `Could not reach backend at ${apiBaseUrl}. Run "npm start" inside backend/.`,
      });
    } finally {
      setTestingApi(false);
    }
  };

  const handleReset = () => {
    resetAll();
    setDefaultCityInput("Kolkata");
    showToast("All settings and saved places restored to defaults");
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p className="page-subtitle">
            Customize units, default city, refresh schedule, and test your backend connection
          </p>
        </div>

        {savedNotice && (
          <div className="toast-pill">
            <Check size={15} /> {savedNotice}
          </div>
        )}
      </div>

      <div className="settings-grid">
        {/* UNITS CARD */}
        <section className="section-card">
          <div className="section-title-group" style={{ marginBottom: 18 }}>
            <Thermometer size={18} color="#ff9d2e" />
            <h2>Measurement Units</h2>
          </div>

          <div className="setting-row">
            <div>
              <strong>Temperature Unit</strong>
              <p>Applies across Home, Map, Forecast, Analytics, and Saved Places</p>
            </div>
            <div className="segmented-control">
              <button
                type="button"
                className={settings.tempUnit === "C" ? "active" : ""}
                onClick={() => {
                  updateSettings({ tempUnit: "C" });
                  showToast("Switched to Celsius (°C)");
                }}
              >
                °C Celsius
              </button>
              <button
                type="button"
                className={settings.tempUnit === "F" ? "active" : ""}
                onClick={() => {
                  updateSettings({ tempUnit: "F" });
                  showToast("Switched to Fahrenheit (°F)");
                }}
              >
                °F Fahrenheit
              </button>
            </div>
          </div>

          <div className="setting-row">
            <div>
              <strong>Wind Speed Unit</strong>
              <p>Choose preferred wind speed display format</p>
            </div>
            <div className="segmented-control">
              {[
                { key: "kmh", label: "km/h" },
                { key: "ms", label: "m/s" },
                { key: "mph", label: "mph" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  className={settings.windUnit === opt.key ? "active" : ""}
                  onClick={() => {
                    updateSettings({ windUnit: opt.key });
                    showToast(`Wind unit set to ${opt.label}`);
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* LOCATION & REFRESH CARD */}
        <section className="section-card">
          <div className="section-title-group" style={{ marginBottom: 18 }}>
            <MapPin size={18} color="#ff9d2e" />
            <h2>Default Location &amp; Refresh</h2>
          </div>

          <form className="setting-row" onSubmit={handleSaveDefaultCity}>
            <div>
              <strong>Default Startup City</strong>
              <p>City loaded automatically when you open WeatherGPT</p>
            </div>
            <div className="inline-form">
              <input
                type="text"
                className="inline-filter-input"
                value={defaultCityInput}
                onChange={(e) => setDefaultCityInput(e.target.value)}
                placeholder="e.g. Kolkata"
              />
              <button type="submit" className="primary-btn">
                Save
              </button>
            </div>
          </form>

          <div className="setting-row">
            <div>
              <strong>Auto-Refresh Live Weather</strong>
              <p>Automatically refresh dashboard weather in the background</p>
            </div>
            <div className="inline-form">
              <select
                className="select-input"
                value={settings.autoRefresh ? String(settings.refreshInterval) : "0"}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val === 0) {
                    updateSettings({ autoRefresh: false });
                    showToast("Auto-refresh disabled");
                  } else {
                    updateSettings({ autoRefresh: true, refreshInterval: val });
                    showToast(`Auto-refresh set to every ${val} min`);
                  }
                }}
              >
                <option value="0">Off</option>
                <option value="5">Every 5 mins</option>
                <option value="10">Every 10 mins</option>
                <option value="30">Every 30 mins</option>
              </select>
            </div>
          </div>

          <div className="setting-row">
            <div>
              <strong>Emergency Mode</strong>
              <p>Pin severe weather alert banner &amp; India emergency helplines</p>
            </div>
            <button
              type="button"
              className={`action-btn ${emergencyMode ? "danger-active" : ""}`}
              onClick={() => setEmergencyMode(!emergencyMode)}
            >
              <ShieldAlert size={16} />
              <span>{emergencyMode ? "ON" : "OFF"}</span>
            </button>
          </div>
        </section>

        {/* BACKEND CONNECTION & RESET */}
        <section className="section-card">
          <div className="section-title-group" style={{ marginBottom: 18 }}>
            <SettingsIcon size={18} color="#ff9d2e" />
            <h2>System Diagnostics &amp; Reset</h2>
          </div>

          <div className="setting-row">
            <div>
              <strong>Backend API Connection</strong>
              <p>Endpoint: {apiBaseUrl}</p>
            </div>
            <button
              type="button"
              className="action-btn"
              onClick={handleTestBackend}
              disabled={testingApi}
            >
              <RefreshCw size={15} className={testingApi ? "spin" : ""} />
              <span>{testingApi ? "Testing..." : "Test Connection"}</span>
            </button>
          </div>

          {apiStatus && (
            <div className={`api-status-box ${apiStatus.ok ? "ok" : "fail"}`}>
              {apiStatus.ok ? <Wifi size={18} /> : <WifiOff size={18} />}
              <div>
                <strong>{apiStatus.message}</strong>
                {apiStatus.provider && (
                  <p>
                    Weather Engine: {apiStatus.provider} | AI: {apiStatus.aiProvider}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="setting-row" style={{ marginTop: 14 }}>
            <div>
              <strong>Reset App Preferences</strong>
              <p>Restore default units, saved cities, and startup location</p>
            </div>
            <button
              type="button"
              className="action-btn"
              onClick={handleReset}
            >
              <RotateCcw size={15} />
              <span>Reset Defaults</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Setting;
