import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, ShieldAlert, CloudSun, X } from "lucide-react";
import Sidebar from "./Sidebar";
import { useWeather } from "../context/WeatherContext";

function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { emergencyMode, setEmergencyMode } = useWeather();

  return (
    <div className={`app-layout ${emergencyMode ? "emergency-active" : ""}`}>
      {/* Mobile Header */}
      <header className="mobile-topbar">
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open navigation menu"
        >
          <Menu size={22} />
        </button>

        <div className="mobile-brand">
          <CloudSun size={24} color="#ff9d2e" />
          <span>
            Weather<b>GPT</b>
          </span>
        </div>

        <button
          type="button"
          className={`mobile-emergency-pill ${emergencyMode ? "on" : ""}`}
          onClick={() => setEmergencyMode(!emergencyMode)}
        >
          <ShieldAlert size={15} />
          {emergencyMode ? "SOS ON" : "SOS"}
        </button>
      </header>

      {/* Backdrop for mobile drawer */}
      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="content-area">
        {emergencyMode && (
          <div className="emergency-banner">
            <div className="emergency-banner-text">
              <ShieldAlert size={18} />
              <span>
                <strong>EMERGENCY MODE ACTIVE:</strong> Stay indoors during severe weather.
                India Helplines — National Emergency: <b>112</b> | NDMA Disaster: <b>1078</b> | Ambulance: <b>108</b>
              </span>
            </div>
            <div className="emergency-banner-actions">
              <Link to="/alerts" className="emergency-banner-link">
                View Alerts
              </Link>
              <button
                type="button"
                className="emergency-banner-close"
                onClick={() => setEmergencyMode(false)}
                aria-label="Disable emergency mode"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}

export default Layout;
