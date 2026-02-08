import { STORAGE_KEYS } from "../../constants/storageKeys.js";
import { pickRandom } from "../../utils/random.js";
import { getText, setText } from "../../utils/storage.js";

function pickRandomNext(imagePaths, previousImage) {
  if (!previousImage || imagePaths.length <= 1) {
    return pickRandom(imagePaths);
  }

  const candidates = imagePaths.filter((path) => path !== previousImage);
  return pickRandom(candidates.length > 0 ? candidates : imagePaths);
}

function getBackgroundLayers() {
  const layers = Array.from(document.querySelectorAll("[data-bg-layer]")).filter(
    (node) => node instanceof HTMLElement
  );
  return layers.length >= 2 ? layers.slice(0, 2) : null;
}

function preloadImage(path) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = encodeURI(path);
  });
}

async function pickLoadedImage(imagePaths, firstCandidate) {
  if (!firstCandidate) {
    return "";
  }

  const tried = new Set();
  let candidate = firstCandidate;

  while (candidate && !tried.has(candidate)) {
    tried.add(candidate);
    const loaded = await preloadImage(candidate);
    if (loaded) {
      return candidate;
    }
    const remaining = imagePaths.filter((path) => !tried.has(path));
    candidate = pickRandom(remaining);
  }

  return "";
}

function applyBackground(path) {
  const encodedPath = encodeURI(path);
  document.documentElement.style.setProperty("--bg-image", `url("${encodedPath}")`);
  if (document.body) {
    document.body.style.backgroundImage = `url("${encodedPath}")`;
  }
}

function getBackgroundTone(path) {
  const normalized = String(path ?? "").toLowerCase();
  return normalized.includes("/light/") ? "light" : "dark";
}

function applyBackgroundTone(path) {
  const tone = getBackgroundTone(path);
  const isLight = tone === "light";

  [document.documentElement, document.body].forEach((element) => {
    if (!element) {
      return;
    }
    element.classList.toggle("bg-light", isLight);
    element.classList.toggle("bg-dark", !isLight);
  });
}

function setLayerImage(layerEl, path) {
  const encodedPath = encodeURI(path);
  layerEl.style.backgroundImage = `url("${encodedPath}")`;
}

export function initBackground({
  imagePaths,
  persist = true,
  rotateOnLoad = true,
  rotateIntervalMs = 0,
  shuffleBtnEl = null
}) {
  if (!Array.isArray(imagePaths) || imagePaths.length === 0) {
    return { rotateNow: () => Promise.resolve(""), getCurrent: () => "", stop: () => {} };
  }

  const layerEls = getBackgroundLayers();
  let activeLayerIndex = 0;
  let initializedLayers = false;

  if (layerEls) {
    const detected = layerEls.findIndex((layer) => layer.classList.contains("is-active"));
    activeLayerIndex = detected >= 0 ? detected : 0;
    layerEls.forEach((layer, index) => {
      layer.classList.toggle("is-active", index === activeLayerIndex);
    });
  }

  const savedRaw = persist ? getText(STORAGE_KEYS.lastBackground, "") : "";
  const saved = imagePaths.includes(savedRaw) ? savedRaw : "";
  let current = "";
  let queue = Promise.resolve("");
  let intervalId = 0;

  const applyLayerTransition = (selectedPath) => {
    if (!layerEls) {
      return;
    }

    if (!initializedLayers) {
      layerEls.forEach((layer, index) => {
        setLayerImage(layer, selectedPath);
        layer.classList.toggle("is-active", index === activeLayerIndex);
      });
      initializedLayers = true;
      return;
    }

    const nextIndex = activeLayerIndex === 0 ? 1 : 0;
    const currentLayer = layerEls[activeLayerIndex];
    const nextLayer = layerEls[nextIndex];

    setLayerImage(nextLayer, selectedPath);
    nextLayer.classList.add("is-active");
    currentLayer.classList.remove("is-active");
    activeLayerIndex = nextIndex;
  };

  const applyAndPersist = (selectedPath) => {
    if (!selectedPath) {
      return "";
    }

    if (current === selectedPath) {
      applyBackground(selectedPath);
      applyBackgroundTone(selectedPath);
      applyLayerTransition(selectedPath);
      if (persist) {
        setText(STORAGE_KEYS.lastBackground, selectedPath);
      }
      return selectedPath;
    }

    current = selectedPath;
    applyBackground(selectedPath);
    applyBackgroundTone(selectedPath);
    applyLayerTransition(selectedPath);
    if (persist) {
      setText(STORAGE_KEYS.lastBackground, selectedPath);
    }
    return selectedPath;
  };

  const loadAndApply = async (candidatePath) => {
    const selectedPath = await pickLoadedImage(imagePaths, candidatePath);
    return applyAndPersist(selectedPath);
  };

  const setInitial = () => {
    const firstCandidate = rotateOnLoad
      ? pickRandomNext(imagePaths, saved)
      : saved || pickRandom(imagePaths);
    return loadAndApply(firstCandidate);
  };

  const rotateNow = () => {
    const previous = current || saved;
    const nextCandidate = pickRandomNext(imagePaths, previous);
    return loadAndApply(nextCandidate);
  };

  const enqueue = (task) => {
    queue = queue.then(task).catch((error) => {
      console.error(error);
      return "";
    });
    return queue;
  };

  const ready = enqueue(setInitial);

  if (Number.isFinite(rotateIntervalMs) && rotateIntervalMs > 0 && imagePaths.length > 1) {
    intervalId = window.setInterval(() => {
      void enqueue(rotateNow);
    }, rotateIntervalMs);
  }

  if (shuffleBtnEl) {
    shuffleBtnEl.addEventListener("click", () => {
      void enqueue(rotateNow);
    });
  }

  return {
    ready,
    rotateNow: () => enqueue(rotateNow),
    getCurrent: () => current,
    stop: () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    }
  };
}
