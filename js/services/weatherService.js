export async function fetchWeather(lat, lon, config) {
  const { baseUrl, apiKey, units = "metric", lang = "kr" } = config;

  if (!apiKey) {
    throw new Error("Missing weather API key.");
  }

  const url = new URL(baseUrl);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("appid", apiKey);
  url.searchParams.set("units", units);
  url.searchParams.set("lang", lang);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Weather request failed: ${response.status}`);
  }

  return response.json();
}
