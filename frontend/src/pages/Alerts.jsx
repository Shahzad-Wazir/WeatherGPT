import { useState, useEffect, useCallback } from "react";
import {
  TriangleAlert,
  ShieldAlert,
  RefreshCw,
  PhoneCall,
  CheckCircle2,
  MapPin,
  Info,
} from "lucide-react";
import { useWeather } from "../context/WeatherContext";

const SEVERITY_META = {
  red: { label: "Red Warning", badgeClass: "sev-red" },
  orange: { label: "Orange Alert", badgeClass: "sev-orange" },
  yellow: { label: "Yellow Watch", badgeClass: "sev-yellow" },
  green: { label: "All Clear", badgeClass: "sev-green" },
};

const HELPLINES = [
  { name: "National Emergency", number: "112" },
  { name: "NDMA Disaster Control", number: "1078" },
  { name: "Ambulance / Medical", number: "108" },
  { name: "Fire & Rescue", number: "101" },
];

function Alerts() {
  const { apiBaseUrl, selectedCity, emergencyMode, setEmergencyMode } =
    useWeather();

  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(
        `${apiBaseUrl}/api/alerts?city=${encodeURIComponent(selectedCity)}`
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to load alerts");
      }
      setAlerts(data.alerts || []);
      setUpdatedAt(data.updatedAt ? new Date(data.updatedAt) : new Date());
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Backend server is not reachable on port 5000."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, selectedCity]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const counts = {
    red: alerts.filter((a) => a.severity === "red").length,
    orange: alerts.filter((a) => a.severity === "orange").length,
    yellow: alerts.filter((a) => a.severity === "yellow").length,
    green: alerts.filter((a) => a.severity === "green").length,
  };

  const visibleAlerts =
    filter === "all" ? alerts : alerts.filter((a) => a.severity === filter);

  return (
    <div className="alerts-page">
      <div className="page-header">
        <div>
          <h1>IMD Alert Center</h1>
          <p className="page-subtitle">
            Live hazard advisories scanned across major Indian cities &amp;{" "}
            <b>{selectedCity}</b>
            {updatedAt
              ? ` • Updated ${updatedAt.toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}`
              : ""}
          </p>
        </div>

        <div className="page-header-actions">
          <button
            type="button"
            className={`action-btn ${emergencyMode ? "danger-active" : ""}`}
            onClick={() => setEmergencyMode(!emergencyMode)}
          >
            <ShieldAlert size={17} />
            <span>{emergencyMode ? "Emergency Mode: ON" : "Enable Emergency Mode"}</span>
          </button>

          <button
            type="button"
            className="action-btn"
            onClick={fetchAlerts}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? "spin" : ""} />
            <span>Scan Now</span>
          </button>
        </div>
      </div>

      {/* SEVERITY SUMMARY CARDS */}
      <div className="alert-summary-grid">
        <div className="alert-stat-card sev-red">
          <span>Red Warnings</span>
          <strong>{counts.red}</strong>
        </div>
        <div className="alert-stat-card sev-orange">
          <span>Orange Alerts</span>
          <strong>{counts.orange}</strong>
        </div>
        <div className="alert-stat-card sev-yellow">
          <span>Yellow Watches</span>
          <strong>{counts.yellow}</strong>
        </div>
        <div className="alert-stat-card sev-green">
          <span>All Clear Cities</span>
          <strong>{counts.green}</strong>
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="quick-chips">
        {[
          { key: "all", label: `All (${alerts.length})` },
          { key: "red", label: `Red (${counts.red})` },
          { key: "orange", label: `Orange (${counts.orange})` },
          { key: "yellow", label: `Yellow (${counts.yellow})` },
          { key: "green", label: `All Clear (${counts.green})` },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`chip-btn ${filter === tab.key ? "active" : ""}`}
            onClick={() => setFilter(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="loading">
          <RefreshCw size={22} className="spin" />
          <span>Scanning live weather conditions across India...</span>
        </div>
      ) : (
        <div className="alerts-list">
          {visibleAlerts.map((alert) => {
            const meta = SEVERITY_META[alert.severity] || SEVERITY_META.green;
            return (
              <div
                key={alert.id}
                className={`alert-card ${meta.badgeClass}`}
              >
                <div className="alert-card-header">
                  <div className="alert-card-title">
                    {alert.severity === "green" ? (
                      <CheckCircle2 size={20} />
                    ) : (
                      <TriangleAlert size={20} />
                    )}
                    <div>
                      <span className={`severity-pill ${meta.badgeClass}`}>
                        {meta.label} • {alert.category}
                      </span>
                      <h3>{alert.title}</h3>
                    </div>
                  </div>
                  <div className="alert-metric">
                    <MapPin size={14} /> {alert.city} • <b>{alert.metric}</b>
                  </div>
                </div>

                <p className="alert-desc">{alert.description}</p>
                <div className="alert-advice">
                  <Info size={15} />
                  <span>{alert.advice}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* EMERGENCY HELPLINES */}
      <section className="section-card">
        <div className="section-card-header">
          <div className="section-title-group">
            <PhoneCall size={18} color="#ff9d2e" />
            <h2>India Weather &amp; Disaster Helplines</h2>
          </div>
        </div>
        <div className="helplines-grid">
          {HELPLINES.map((h) => (
            <div key={h.number} className="helpline-card">
              <span>{h.name}</span>
              <strong>{h.number}</strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Alerts;
