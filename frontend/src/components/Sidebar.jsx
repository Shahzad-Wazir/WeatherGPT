import { NavLink } from "react-router-dom";
import {
  CloudSun,
  House,
  Map,
  CalendarDays,
  TriangleAlert,
  MessageSquare,
  BarChart3,
  Bookmark,
  Settings,
  ShieldAlert,
  X,
} from "lucide-react";
import { useWeather } from "../context/WeatherContext";

function Sidebar({ isOpen, onClose }) {
  const {
    selectedCity,
    activeLocationMeta,
    savedPlaces,
    emergencyMode,
    setEmergencyMode,
  } = useWeather();

  const menuItems = [
    { name: "Home", path: "/", icon: House },
    { name: "India GIS Map", path: "/india-map", icon: Map },
    { name: "Extended Forecast", path: "/forecast", icon: CalendarDays },
    { name: "IMD Alert Center", path: "/alerts", icon: TriangleAlert },
    { name: "WeatherGPT AI", path: "/weather-ai", icon: MessageSquare },
    { name: "Climate Analytics", path: "/climate-analytics", icon: BarChart3 },
    {
      name: "Saved Places",
      path: "/saved-places",
      icon: Bookmark,
      badge: savedPlaces.length,
    },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  const coordText =
    activeLocationMeta?.coord?.lat !== undefined
      ? `${activeLocationMeta.coord.lat.toFixed(2)}°N, ${activeLocationMeta.coord.lon.toFixed(2)}°E`
      : "Active Monitoring";

  return (
    <aside className={`sidebar ${isOpen ? "open" : ""}`}>
      <div className="logo-section">
        <CloudSun size={36} color="#ff9d2e" />
        <div>
          <h1>
            Weather<span>GPT</span>
          </h1>
          <p>INDIA WEATHER INTELLIGENCE</p>
        </div>
        <button
          type="button"
          className="sidebar-close-btn"
          onClick={onClose}
          aria-label="Close navigation menu"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="sidebar-menu">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.path === "/"}
              onClick={onClose}
              className={({ isActive }) =>
                `menu-item ${isActive ? "active" : ""}`
              }
            >
              <Icon size={20} />
              <span>{item.name}</span>
              {typeof item.badge === "number" && item.badge > 0 && (
                <span className="menu-badge">{item.badge}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        <button
          type="button"
          className={`emergency-box ${emergencyMode ? "active" : ""}`}
          onClick={() => setEmergencyMode(!emergencyMode)}
        >
          <ShieldAlert size={18} />
          <span>EMERGENCY MODE</span>
          <small>{emergencyMode ? "ON" : "OFF"}</small>
        </button>

        <div className="location-box">
          <div className="country-icon">
            {activeLocationMeta?.country || "IN"}
          </div>
          <div className="location-box-text">
            <strong>{activeLocationMeta?.name || selectedCity}</strong>
            <p>{coordText}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
