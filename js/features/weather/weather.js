import { getCurrentPosition } from "../../services/locationService.js";
import { fetchWeather } from "../../services/weatherService.js";

const REFRESH_INTERVAL_MS = 10 * 60 * 1000;
const WEATHER_KEY_HINT = "Set API key in js/constants/config.js";

function resolveWeatherApiKey(config) {
  return String(config?.apiKey ?? "").trim();
}

function setWeatherStatus(weatherEl, locationEl, weatherText, locationText) {
  weatherEl.textContent = weatherText;
  locationEl.textContent = locationText;
}

function getLocationErrorMessage(error) {
  if (!error || typeof error.code !== "number") {
    return "Unable to get location.";
  }

  if (error.code === 1) {
    return "Location permission denied.";
  }
  if (error.code === 2) {
    return "Location unavailable.";
  }
  if (error.code === 3) {
    return "Location request timed out.";
  }
  return "Unable to get location.";
}

async function renderWeather({ weatherEl, locationEl, config }) {
  const apiKey = resolveWeatherApiKey(config);
  if (!apiKey) {
    setWeatherStatus(weatherEl, locationEl, "Weather API key missing", WEATHER_KEY_HINT);
    return;
  }

  try {
    setWeatherStatus(weatherEl, locationEl, "Loading weather...", "Getting location...");
    const position = await getCurrentPosition();
    const { latitude, longitude } = position.coords;

    const weather = await fetchWeather(latitude, longitude, { ...config, apiKey });
    const temp = Math.round(weather.main?.temp ?? 0);
    const summary = weather.weather?.[0]?.description ?? "Unknown";
    const city = weather.name ?? "Unknown city";

    setWeatherStatus(weatherEl, locationEl, `${summary} ${temp}°C`, city);
  } catch (error) {
    const locationMessage = error?.message === "Missing weather API key."
      ? WEATHER_KEY_HINT
      : typeof error?.code === "number"
        ? getLocationErrorMessage(error)
        : "Check network or API key";
    setWeatherStatus(weatherEl, locationEl, "Weather unavailable", locationMessage);
    console.error(error);
  }
}

export async function initWeather({ weatherEl, locationEl, config, panelEl }) {
  if (!weatherEl || !locationEl) {
    return;
  }

  const weatherPanelEl = panelEl ?? weatherEl.closest(".weather");
  if (weatherPanelEl) {
    weatherPanelEl.title = "Weather key is loaded from .env.local";
  }

  await renderWeather({ weatherEl, locationEl, config });
  window.setInterval(() => {
    void renderWeather({ weatherEl, locationEl, config });
  }, REFRESH_INTERVAL_MS);
}
