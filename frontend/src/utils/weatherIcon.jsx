import {
  Sun,
  Moon,
  Cloud,
  CloudSun,
  CloudRain,
  CloudDrizzle,
  CloudLightning,
  CloudSnow,
  CloudFog,
} from "lucide-react";

export function WeatherConditionIcon({ main = "", icon = "", size = 32 }) {
  const cond = main.toLowerCase();
  const isNight = icon.endsWith("n");

  if (cond.includes("thunderstorm")) {
    return <CloudLightning size={size} color="#f59e0b" />;
  }
  if (cond.includes("drizzle")) {
    return <CloudDrizzle size={size} color="#38bdf8" />;
  }
  if (cond.includes("rain")) {
    return <CloudRain size={size} color="#38bdf8" />;
  }
  if (cond.includes("snow")) {
    return <CloudSnow size={size} color="#bae6fd" />;
  }
  if (
    cond.includes("fog") ||
    cond.includes("mist") ||
    cond.includes("haze") ||
    cond.includes("smoke") ||
    cond.includes("dust")
  ) {
    return <CloudFog size={size} color="#94a3b8" />;
  }
  if (cond.includes("clear")) {
    return isNight ? (
      <Moon size={size} color="#fde68a" />
    ) : (
      <Sun size={size} color="#fbbf24" />
    );
  }
  if (cond.includes("cloud")) {
    return icon === "02d" || icon === "02n" ? (
      <CloudSun size={size} color="#38bdf8" />
    ) : (
      <Cloud size={size} color="#cbd5e1" />
    );
  }
  return <CloudSun size={size} color="#38bdf8" />;
}
