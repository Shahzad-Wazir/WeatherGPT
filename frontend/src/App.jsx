import "./App.css";

import { BrowserRouter, Routes, Route } from "react-router-dom";
import { WeatherProvider } from "./context/WeatherContext";

import Layout from "./components/Layout";

import Home from "./pages/Home";
import IndiaMap from "./pages/IndiaMap";
import Forecast from "./pages/Forecast";
import Alerts from "./pages/Alerts";
import WeatherAI from "./pages/WeatherAI";
import ClimateAnalytics from "./pages/ClimateAnalytics";
import SavedPlace from "./pages/SavedPlace";
import Setting from "./pages/Setting";

function App() {
  return (
    <WeatherProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/india-map" element={<IndiaMap />} />
            <Route path="/forecast" element={<Forecast />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/weather-ai" element={<WeatherAI />} />
            <Route path="/climate-analytics" element={<ClimateAnalytics />} />
            <Route path="/saved-places" element={<SavedPlace />} />
            <Route path="/settings" element={<Setting />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </WeatherProvider>
  );
}

export default App;
