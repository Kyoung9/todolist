import { STORAGE_KEYS } from "../../constants/storageKeys.js";
import { getText, removeKey, setText } from "../../utils/storage.js";
import { toggleClass } from "../../utils/dom.js";

const LOGIN_HELP_DEFAULT = "Use 2-20 characters.";
const LOGIN_HELP_STORAGE_ERROR = "Unable to save username. Check browser storage settings.";

function normalizeUsername(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function getGreetingPrefixByHour(hour) {
  if (hour >= 5 && hour < 12) {
    return "Good morning";
  }
  if (hour >= 12 && hour < 18) {
    return "Good afternoon";
  }
  if (hour >= 18 && hour < 22) {
    return "Good evening";
  }
  return "Good night";
}

function buildGreeting(username) {
  const now = new Date();
  const prefix = getGreetingPrefixByHour(now.getHours());
  return `${prefix}, ${username}`;
}

function readPersistedUsername() {
  return normalizeUsername(getText(STORAGE_KEYS.username, ""));
}

function writeUsername(username) {
  return setText(STORAGE_KEYS.username, username);
}

function clearUsername() {
  return removeKey(STORAGE_KEYS.username);
}

export function initAuth({ formEl, inputEl, greetingEl, logoutBtn, helperEl, onLoginChange }) {
  if (!formEl || !inputEl || !greetingEl) {
    return { getUsername: () => "", logout: () => {} };
  }

  const setHelper = (message, isError = false) => {
    if (!helperEl) {
      return;
    }
    helperEl.textContent = message;
    toggleClass(helperEl, "error", isError);
  };

  const render = (username) => {
    const loggedIn = Boolean(username);
    toggleClass(formEl, "hidden", loggedIn);
    toggleClass(greetingEl, "hidden", !loggedIn);
    if (logoutBtn) {
      toggleClass(logoutBtn, "hidden", !loggedIn);
    }

    greetingEl.textContent = loggedIn ? buildGreeting(username) : "";
    setHelper(loggedIn ? `Signed in as ${username}.` : LOGIN_HELP_DEFAULT, false);

    if (typeof onLoginChange === "function") {
      onLoginChange(username);
    }

    if (!loggedIn) {
      inputEl.focus();
    }
  };

  render(readPersistedUsername());

  formEl.addEventListener("submit", (event) => {
    event.preventDefault();
    const username = normalizeUsername(inputEl.value);
    if (username.length < 2) {
      setHelper("Name must be at least 2 characters.", true);
      inputEl.focus();
      return;
    }

    const saved = writeUsername(username);
    if (!saved) {
      setHelper(LOGIN_HELP_STORAGE_ERROR, true);
      return;
    }

    formEl.reset();
    render(username);
  });

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      const removed = clearUsername();
      if (!removed) {
        setHelper("Unable to clear username from storage.", true);
        return;
      }
      render("");
    });
  }

  return {
    getUsername: readPersistedUsername,
    logout: () => {
      clearUsername();
      render("");
    }
  };
}
