import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Tooltip,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapPin,
  Loader,
  RefreshCw,
  Droplets,
  Wind,
  ArrowRight,
  Compass,
} from "lucide-react";
import { useWeather } from "../context/WeatherContext";
import { WeatherConditionIcon } from "../utils/weatherIcon";

function getTempColor(tempC) {
  if (tempC >= 38) return "#ef4444";
  if (tempC >= 30) return "#f97316";
  if (tempC >= 22) return "#eab308";
  if (tempC >= 14) return "#22c55e";
  return "#38bdf8";
}

function MapClickHandler({ onPickCoords }) {
  useMapEvents({
    click(e) {
      onPickCoords(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function IndiaMap() {
  const { apiBaseUrl, setSelectedCity, formatTemp, formatWind } = useWeather();
  const navigate = useNavigate();

  const [citiesWeather, setCitiesWeather] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterText, setFilterText] = useState("");
  const [pickedWeather, setPickedWeather] = useState(null);
  const [picking, setPicking] = useState(false);

  const loadCities = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${apiBaseUrl}/api/cities-weather`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to load India weather map");
      }
      setCitiesWeather(data.cities || []);
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Backend not reachable. Start the backend server on port 5000."
          : err.message
      );
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    loadCities();
  }, [loadCities]);

  const handleMapClick = async (lat, lon) => {
    try {
      setPicking(true);
      const res = await fetch(
        `${apiBaseUrl}/api/weather?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`
      );
      if (res.ok) {
        const data = await res.json();
        setPickedWeather(data);
      }
    } catch {
      // ignore map click errors
    } finally {
      setPicking(false);
    }
  };

  const handleInspectCity = (cityName) => {
    setSelectedCity(cityName);
    navigate("/");
  };

  const filteredCities = citiesWeather.filter((c) =>
    (c.name || "").toLowerCase().includes(filterText.trim().toLowerCase())
  );

  return (
    <div className="india-map-page">
      <div className="page-header">
        <div>
          <h1>India GIS Weather Map</h1>
          <p className="page-subtitle">
            Interactive live weather across major Indian cities — click any marker or anywhere on the map to inspect.
          </p>
        </div>

        <div className="page-header-actions">
          <input
            type="text"
            className="inline-filter-input"
            placeholder="Filter city..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
          <button
            type="button"
            className="action-btn"
            onClick={loadCities}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? "spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* LEGEND */}
      <div className="map-legend">
        <span><i style={{ background: "#38bdf8" }} /> &lt;14°C Cold</span>
        <span><i style={{ background: "#22c55e" }} /> 14–21°C Pleasant</span>
        <span><i style={{ background: "#eab308" }} /> 22–29°C Warm</span>
        <span><i style={{ background: "#f97316" }} /> 30–37°C Hot</span>
        <span><i style={{ background: "#ef4444" }} /> 38°C+ Extreme</span>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* INTERACTIVE LEAFLET MAP */}
      <div className="gis-map-wrapper">
        <MapContainer
          center={[22.5, 82.0]}
          zoom={5}
          minZoom={4}
          maxZoom={12}
          scrollWheelZoom={true}
          className="leaflet-gis-container"
        >
          <TileLayer
            attribution="&copy; OpenStreetMap &copy; CARTO"
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <MapClickHandler onPickCoords={handleMapClick} />

          {filteredCities.map((city) => {
            if (!city.coord) return null;
            const color = getTempColor(city.main?.temp ?? 25);
            return (
              <CircleMarker
                key={city.id || city.name}
                center={[city.coord.lat, city.coord.lon]}
                radius={11}
                pathOptions={{
                  color: "#ffffff",
                  weight: 1.5,
                  fillColor: color,
                  fillOpacity: 0.9,
                }}
              >
                <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                  <strong>{city.name}</strong>: {formatTemp(city.main?.temp)}
                </Tooltip>
                <Popup>
                  <div className="map-popup">
                    <strong>{city.name}</strong>
                    <div className="map-popup-temp">
                      {formatTemp(city.main?.temp)}
                    </div>
                    <p style={{ textTransform: "capitalize" }}>
                      {city.weather?.[0]?.description}
                    </p>
                    <small>
                      Humidity: {city.main?.humidity}% | Wind:{" "}
                      {formatWind(city.wind?.speed)}
                    </small>
                    <button
                      type="button"
                      className="map-popup-btn"
                      onClick={() => handleInspectCity(city.name)}
                    >
                      Open Dashboard →
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

          {pickedWeather?.coord && (
            <CircleMarker
              center={[pickedWeather.coord.lat, pickedWeather.coord.lon]}
              radius={9}
              pathOptions={{
                color: "#ff9d2e",
                weight: 2.5,
                fillColor: "#ff9d2e",
                fillOpacity: 0.45,
              }}
            >
              <Popup>
                <div className="map-popup">
                  <strong>{pickedWeather.name}</strong>
                  <div className="map-popup-temp">
                    {formatTemp(pickedWeather.main?.temp)}
                  </div>
                  <p>{pickedWeather.weather?.[0]?.description}</p>
                </div>
              </Popup>
            </CircleMarker>
          )}
        </MapContainer>

        {(picking || pickedWeather) && (
          <div className="map-click-readout">
            <Compass size={16} color="#ff9d2e" />
            {picking ? (
              <span>Fetching coordinates weather...</span>
            ) : (
              <span>
                Pinned: <b>{pickedWeather.name}</b> —{" "}
                <b>{formatTemp(pickedWeather.main?.temp)}</b>,{" "}
                {pickedWeather.weather?.[0]?.description} (Humidity{" "}
                {pickedWeather.main?.humidity}%)
              </span>
            )}
          </div>
        )}
      </div>

      {/* CITIES GRID */}
      {loading ? (
        <div className="map-loading">
          <Loader size={30} className="spin" />
          <p>Loading live weather for Indian cities...</p>
        </div>
      ) : (
        <div className="cities-grid">
          {filteredCities.map((city) => (
            <div
              className="city-weather-card"
              key={city.id || city.name}
              onClick={() => handleInspectCity(city.name)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleInspectCity(city.name);
              }}
            >
              <div className="city-card-top">
                <div className="city-card-title">
                  <MapPin size={16} color="#ff9d2e" />
                  <h2>{city.name}</h2>
                </div>
                <WeatherConditionIcon
                  main={city.weather?.[0]?.main}
                  icon={city.weather?.[0]?.icon}
                  size={28}
                />
              </div>

              <div className="city-card-temp">
                {formatTemp(city.main?.temp)}
              </div>

              <p className="city-card-desc">
                {city.weather?.[0]?.description || "clear sky"}
              </p>

              <div className="city-card-meta">
                <span>
                  <Droplets size={13} /> {city.main?.humidity ?? "--"}%
                </span>
                <span>
                  <Wind size={13} /> {formatWind(city.wind?.speed)}
                </span>
                <span className="city-card-open">
                  Inspect <ArrowRight size={13} />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default IndiaMap;
