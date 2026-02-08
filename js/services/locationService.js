export function getCurrentPosition(options = {}) {
  const config = {
    enableHighAccuracy: false,
    timeout: 8000,
    maximumAge: 60_000,
    ...options
  };

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, config);
  });
}
