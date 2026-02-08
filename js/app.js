import { STORAGE_KEYS } from "./constants/storageKeys.js";
import { WEATHER_CONFIG } from "./constants/config.js";
import { initAuth } from "./features/auth/auth.js";
import { initBackground } from "./features/background/background.js";
import { initClock } from "./features/clock/clock.js";
import { initTodo } from "./features/todo/todo.js";
import { initWeather } from "./features/weather/weather.js";
import { qs } from "./utils/dom.js";
import { getText } from "./utils/storage.js";

const darkBackgroundIndices = [2, 3, 5, 8, 9, 11, 12, 13, 14, 16, 18, 20, 22, 25, 29, 30, 32, 34, 35, 36, 37, 38, 39];
const lightBackgroundIndices = [1, 4, 6, 7, 10, 15, 17, 19, 21, 23, 24, 26, 27, 28, 31, 33, 40];

function toBackgroundPath(group, index) {
  const number = String(index).padStart(2, "0");
  return `assets/bg/${group}/texture-${number}.jpg`;
}

const backgroundImages = [
  ...darkBackgroundIndices.map((index) => toBackgroundPath("dark", index)),
  ...lightBackgroundIndices.map((index) => toBackgroundPath("light", index))
];
const BACKGROUND_ROTATE_INTERVAL_MS = 2 * 60 * 1000;

function normalizeUsername(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function getSavedUsername() {
  return normalizeUsername(getText(STORAGE_KEYS.username, ""));
}

function setAuthViewState(username) {
  const normalized = normalizeUsername(username);
  const loggedIn = Boolean(normalized);
  [document.documentElement, document.body].forEach((element) => {
    if (!element) {
      return;
    }
    element.classList.toggle("auth-ready", loggedIn);
    element.classList.toggle("auth-locked", !loggedIn);
  });

  const shuffleBgBtn = qs("#shuffleBgBtn");
  if (shuffleBgBtn) {
    shuffleBgBtn.classList.toggle("hidden", !loggedIn);
  }
}

function bootstrap() {
  initBackground({
    imagePaths: backgroundImages,
    persist: true,
    rotateOnLoad: true,
    rotateIntervalMs: BACKGROUND_ROTATE_INTERVAL_MS,
    shuffleBtnEl: qs("#shuffleBgBtn")
  });

  initClock({
    clockEl: qs("#clock"),
    dateEl: qs("#dateText")
  });

  const todoController = initTodo({
    formEl: qs("#todoForm"),
    inputEl: qs("#todoInput"),
    listEl: qs("#todoList"),
    summaryEl: qs("#todoSummary"),
    emptyEl: qs("#todoEmpty"),
    filtersEl: qs("#todoFilters"),
    clearDoneBtn: qs("#clearDoneBtn"),
    helperEl: qs("#todoHelp")
  });

  const initialUsername = getSavedUsername();
  setAuthViewState(initialUsername);
  todoController.setAccess(Boolean(initialUsername), initialUsername);

  initAuth({
    formEl: qs("#loginForm"),
    inputEl: qs("#nameInput"),
    greetingEl: qs("#greeting"),
    logoutBtn: qs("#logoutBtn"),
    helperEl: qs("#loginHelp"),
    onLoginChange: (username) => {
      const normalized = normalizeUsername(username);
      setAuthViewState(normalized);
      todoController.setAccess(Boolean(normalized), normalized);
    }
  });

  initWeather({
    weatherEl: qs("#weatherText"),
    locationEl: qs("#locationText"),
    panelEl: qs(".weather"),
    config: WEATHER_CONFIG
  });

  window.__APP_READY__ = true;
}

bootstrap();
