(function () {
  const APP_READY_DELAY_MS = 600;
  const BACKGROUND_ROTATE_INTERVAL_MS = 2 * 60 * 1000;
  const WEATHER_REFRESH_INTERVAL_MS = 10 * 60 * 1000;
  const TODO_MAX_LENGTH = 80;
  const TODO_HELP_REORDERED = "Active task order updated.";
  const WEATHER_KEY_HINT = "Set window.__WEATHER_API_KEY__ in index.html";
  const DARK_BACKGROUND_INDICES = [2, 3, 5, 8, 9, 11, 12, 13, 14, 16, 18, 20, 22, 25, 29, 30, 32, 34, 35, 36, 37, 38, 39];
  const LIGHT_BACKGROUND_INDICES = [1, 4, 6, 7, 10, 15, 17, 19, 21, 23, 24, 26, 27, 28, 31, 33, 40];

  const STORAGE_KEYS = Object.freeze({
    username: "todo.username",
    todos: "todo.items",
    lastBackground: "todo.lastBg"
  });

  function toBackgroundPath(group, index) {
    var number = String(index).padStart(2, "0");
    return "assets/bg/" + group + "/texture-" + number + ".jpg";
  }

  const backgroundImages = DARK_BACKGROUND_INDICES.map(function (index) {
    return toBackgroundPath("dark", index);
  }).concat(
    LIGHT_BACKGROUND_INDICES.map(function (index) {
      return toBackgroundPath("light", index);
    })
  );

  var state = {
    username: "",
    todos: [],
    currentTodoKey: "",
    filter: "all",
    todoDraggingId: null,
    todoDragOverId: null,
    todoDragOverPosition: "before",
    background: "",
    bgQueue: Promise.resolve(""),
    bgLayers: null,
    bgActiveLayerIndex: 0,
    bgInitialized: false
  };

  function normalizeText(value) {
    return String(value == null ? "" : value)
      .trim()
      .replace(/\s+/g, " ");
  }

  function getText(key, fallback) {
    try {
      var value = localStorage.getItem(key);
      return value == null ? fallback : value;
    } catch (_error) {
      return fallback;
    }
  }

  function setText(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (_error) {
      return false;
    }
  }

  function removeText(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (_error) {
      return false;
    }
  }

  function getJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_error) {
      return fallback;
    }
  }

  function setJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_error) {
      return false;
    }
  }

  function getTodoStorageKey(username) {
    var normalized = normalizeText(username).toLowerCase();
    return normalized ? STORAGE_KEYS.todos + ":" + normalized : STORAGE_KEYS.todos;
  }

  function getSavedUsername() {
    return normalizeText(getText(STORAGE_KEYS.username, ""));
  }

  function saveUsername(username) {
    return setText(STORAGE_KEYS.username, username);
  }

  function clearUsername() {
    return removeText(STORAGE_KEYS.username);
  }

  function qs(selector) {
    return document.querySelector(selector);
  }

  var els = {
    clock: null,
    dateText: null,
    loginForm: null,
    nameInput: null,
    loginHelp: null,
    greeting: null,
    logoutBtn: null,
    shuffleBgBtn: null,
    todoForm: null,
    todoInput: null,
    todoHelp: null,
    todoList: null,
    todoSummary: null,
    todoEmpty: null,
    todoFilters: null,
    clearDoneBtn: null,
    todoLockNotice: null,
    weatherText: null,
    locationText: null,
    weatherPanel: null
  };

  function setHelper(el, message, isError) {
    if (!el) {
      return;
    }
    el.textContent = message;
    el.classList.toggle("error", Boolean(isError));
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

  function setAuthView(username) {
    var normalized = normalizeText(username);
    var loggedIn = Boolean(normalized);

    [document.documentElement, document.body].forEach(function (el) {
      if (!el) {
        return;
      }
      el.classList.toggle("auth-ready", loggedIn);
      el.classList.toggle("auth-locked", !loggedIn);
    });

    if (els.logoutBtn) {
      els.logoutBtn.classList.toggle("hidden", !loggedIn);
    }
    if (els.shuffleBgBtn) {
      els.shuffleBgBtn.classList.toggle("hidden", !loggedIn);
    }
    if (els.greeting) {
      els.greeting.classList.toggle("hidden", !loggedIn);
      els.greeting.textContent = loggedIn ? getGreetingPrefixByHour(new Date().getHours()) + ", " + normalized : "";
    }
    setHelper(
      els.loginHelp,
      loggedIn ? "Signed in as " + normalized + "." : "Use 2-20 characters.",
      false
    );
  }

  function normalizeTodos(value) {
    if (!Array.isArray(value)) {
      return [];
    }
    return value
      .filter(function (item) {
        return item && typeof item.text === "string";
      })
      .map(function (item) {
        return {
          id: Number(item.id) || Date.now(),
          text: normalizeText(item.text),
          done: Boolean(item.done),
          createdAt: item.createdAt || new Date().toISOString()
        };
      });
  }

  function loadTodosForUser(username) {
    state.currentTodoKey = getTodoStorageKey(username);
    var legacyExists = getText(STORAGE_KEYS.todos, "__missing__") !== "__missing__";
    var userExists = getText(state.currentTodoKey, "__missing__") !== "__missing__";
    if (!userExists && legacyExists) {
      setJSON(state.currentTodoKey, normalizeTodos(getJSON(STORAGE_KEYS.todos, [])));
      removeText(STORAGE_KEYS.todos);
    }
    state.todos = normalizeTodos(getJSON(state.currentTodoKey, []));
  }

  function persistTodos() {
    if (!state.currentTodoKey) {
      return;
    }
    setJSON(state.currentTodoKey, state.todos);
  }

  function getVisibleTodos() {
    if (state.filter === "active") {
      return state.todos.filter(function (todo) {
        return !todo.done;
      });
    }
    if (state.filter === "done") {
      return state.todos.filter(function (todo) {
        return todo.done;
      });
    }
    return state.todos;
  }

  function hasDuplicateTodo(text) {
    var candidate = normalizeText(text).toLowerCase();
    return state.todos.some(function (todo) {
      return normalizeText(todo.text).toLowerCase() === candidate;
    });
  }

  function resolveTodoItemFromEvent(event) {
    var rawTarget = event.target;
    var element = rawTarget instanceof Element
      ? rawTarget
      : rawTarget && rawTarget.parentElement instanceof Element
        ? rawTarget.parentElement
        : null;

    return element ? element.closest(".todo-item") : null;
  }

  function clearTodoDragState() {
    state.todoDraggingId = null;
    state.todoDragOverId = null;
    state.todoDragOverPosition = "before";
    if (!els.todoList) {
      return;
    }

    els.todoList.classList.remove("is-drag-over-empty");
    var items = els.todoList.querySelectorAll(".todo-item");
    items.forEach(function (item) {
      item.classList.remove("is-dragging", "is-drag-over", "is-drag-over-after");
    });
  }

  function moveActiveTodo(dragId, targetId, position) {
    var nextPosition = position === "after" ? "after" : "before";
    if (dragId === targetId) {
      return false;
    }

    var draggedTodo = state.todos.find(function (todo) {
      return todo.id === dragId;
    });
    var targetTodo = state.todos.find(function (todo) {
      return todo.id === targetId;
    });

    if (!draggedTodo || !targetTodo || draggedTodo.done || targetTodo.done) {
      return false;
    }

    var reorderedActive = state.todos.filter(function (todo) {
      return !todo.done;
    });

    var draggedIndex = reorderedActive.findIndex(function (todo) {
      return todo.id === dragId;
    });
    if (draggedIndex < 0) {
      return false;
    }

    var movedTodo = reorderedActive.splice(draggedIndex, 1)[0];
    var targetIndex = reorderedActive.findIndex(function (todo) {
      return todo.id === targetId;
    });
    if (targetIndex < 0) {
      return false;
    }

    var insertIndex = nextPosition === "after" ? targetIndex + 1 : targetIndex;
    reorderedActive.splice(insertIndex, 0, movedTodo);

    var activeCursor = 0;
    state.todos = state.todos.map(function (todo) {
      if (todo.done) {
        return todo;
      }
      var nextTodo = reorderedActive[activeCursor];
      activeCursor += 1;
      return nextTodo;
    });

    return true;
  }

  function moveActiveTodoToEnd(dragId) {
    var draggedTodo = state.todos.find(function (todo) {
      return todo.id === dragId;
    });
    if (!draggedTodo || draggedTodo.done) {
      return false;
    }

    var reorderedActive = state.todos.filter(function (todo) {
      return !todo.done;
    });

    var draggedIndex = reorderedActive.findIndex(function (todo) {
      return todo.id === dragId;
    });
    if (draggedIndex < 0 || draggedIndex === reorderedActive.length - 1) {
      return false;
    }

    var movedTodo = reorderedActive.splice(draggedIndex, 1)[0];
    reorderedActive.push(movedTodo);

    var activeCursor = 0;
    state.todos = state.todos.map(function (todo) {
      if (todo.done) {
        return todo;
      }
      var nextTodo = reorderedActive[activeCursor];
      activeCursor += 1;
      return nextTodo;
    });

    return true;
  }

  function updateFilterButtons() {
    if (!els.todoFilters) {
      return;
    }
    var buttons = els.todoFilters.querySelectorAll(".filter-btn");
    buttons.forEach(function (button) {
      var active = button.getAttribute("data-filter") === state.filter;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
      button.disabled = !state.username;
    });
  }

  function renderTodoSummary() {
    if (!els.todoSummary) {
      return;
    }

    if (!state.username) {
      els.todoSummary.textContent = "Login required";
      return;
    }

    var total = state.todos.length;
    var done = state.todos.filter(function (todo) {
      return todo.done;
    }).length;
    var active = total - done;
    els.todoSummary.textContent = total === 0 ? "0 tasks" : active + " active · " + done + " done · " + total + " total";
  }

  function renderTodoEmpty(visibleCount) {
    if (!els.todoEmpty) {
      return;
    }

    if (!state.username) {
      els.todoEmpty.classList.add("hidden");
      return;
    }

    els.todoEmpty.classList.toggle("hidden", visibleCount > 0);
    if (visibleCount > 0) {
      return;
    }
    if (state.todos.length === 0) {
      els.todoEmpty.textContent = "No tasks yet. Add your first task.";
      return;
    }
    if (state.filter === "active") {
      els.todoEmpty.textContent = "No active tasks. Nice progress.";
      return;
    }
    if (state.filter === "done") {
      els.todoEmpty.textContent = "No completed tasks yet.";
      return;
    }
    els.todoEmpty.textContent = "No tasks to show.";
  }

  function renderTodoList() {
    if (!els.todoList) {
      return;
    }

    clearTodoDragState();
    var isLocked = !state.username;
    els.todoList.innerHTML = "";
    els.todoList.classList.toggle("is-locked", isLocked);

    if (els.todoLockNotice) {
      els.todoLockNotice.classList.toggle("hidden", !isLocked);
    }

    if (els.todoInput) {
      els.todoInput.disabled = isLocked;
    }
    if (els.todoForm) {
      var addButton = els.todoForm.querySelector("button[type='submit']");
      if (addButton) {
        addButton.disabled = isLocked;
      }
    }

    if (isLocked) {
      updateFilterButtons();
      renderTodoSummary();
      renderTodoEmpty(0);
      setHelper(els.todoHelp, "Login first to use todo features.", false);
      if (els.clearDoneBtn) {
        els.clearDoneBtn.disabled = true;
      }
      return;
    }

    var visibleTodos = getVisibleTodos();
    visibleTodos.forEach(function (todo) {
      var isDraggable = !todo.done;
      var li = document.createElement("li");
      li.className = "todo-item" + (todo.done ? " done" : "");
      li.setAttribute("data-id", String(todo.id));
      li.draggable = isDraggable;
      li.classList.toggle("is-draggable", isDraggable);

      var main = document.createElement("div");
      main.className = "todo-main";

      var checkBtn = document.createElement("button");
      checkBtn.className = "check-btn";
      checkBtn.type = "button";
      checkBtn.setAttribute("data-action", "toggle");
      checkBtn.setAttribute("aria-label", todo.done ? "Mark as active" : "Mark as done");
      checkBtn.setAttribute("aria-pressed", String(todo.done));

      var text = document.createElement("span");
      text.className = "todo-text";
      text.textContent = todo.text;

      var actions = document.createElement("div");
      actions.className = "todo-actions-inline";

      var deleteBtn = document.createElement("button");
      deleteBtn.className = "icon-btn danger";
      deleteBtn.type = "button";
      deleteBtn.setAttribute("data-action", "delete");
      deleteBtn.textContent = "Delete";
      deleteBtn.setAttribute("aria-label", "Delete task: " + todo.text);

      main.append(checkBtn, text);
      actions.append(deleteBtn);
      li.append(main, actions);
      els.todoList.append(li);
    });

    var hasDone = state.todos.some(function (todo) {
      return todo.done;
    });
    if (els.clearDoneBtn) {
      els.clearDoneBtn.disabled = !hasDone;
    }

    updateFilterButtons();
    renderTodoSummary();
    renderTodoEmpty(visibleTodos.length);
    setHelper(els.todoHelp, "Maximum 80 characters.", false);
  }

  function handleTodoSubmit(event) {
    event.preventDefault();
    if (!state.username) {
      setHelper(els.todoHelp, "Login first to use todo features.", true);
      return;
    }

    var text = normalizeText(els.todoInput ? els.todoInput.value : "");
    if (!text) {
      setHelper(els.todoHelp, "Please enter a task.", true);
      if (els.todoInput) {
        els.todoInput.focus();
      }
      return;
    }
    if (text.length > TODO_MAX_LENGTH) {
      setHelper(els.todoHelp, "Task must be " + TODO_MAX_LENGTH + " characters or less.", true);
      return;
    }
    if (hasDuplicateTodo(text)) {
      setHelper(els.todoHelp, "This task already exists.", true);
      return;
    }

    state.todos.unshift({
      id: Date.now() + Math.floor(Math.random() * 1000),
      text: text,
      done: false,
      createdAt: new Date().toISOString()
    });
    persistTodos();
    if (els.todoForm) {
      els.todoForm.reset();
    }
    if (els.todoInput) {
      els.todoInput.focus();
    }
    renderTodoList();
  }

  function handleTodoClick(event) {
    if (!state.username) {
      return;
    }

    var button = event.target.closest("button[data-action]");
    if (!button) {
      return;
    }

    var item = button.closest(".todo-item");
    if (!item) {
      return;
    }

    var id = Number(item.getAttribute("data-id"));
    var index = state.todos.findIndex(function (todo) {
      return todo.id === id;
    });
    if (index < 0) {
      return;
    }

    var action = button.getAttribute("data-action");
    if (action === "toggle") {
      state.todos[index].done = !state.todos[index].done;
    } else if (action === "delete") {
      state.todos.splice(index, 1);
    }

    persistTodos();
    renderTodoList();
  }

  function handleFilterClick(event) {
    if (!state.username) {
      return;
    }
    var button = event.target.closest(".filter-btn");
    if (!button) {
      return;
    }
    var next = button.getAttribute("data-filter");
    if (!next || next === state.filter) {
      return;
    }
    clearTodoDragState();
    state.filter = next;
    renderTodoList();
  }

  function handleClearDone() {
    if (!state.username) {
      return;
    }
    var before = state.todos.length;
    state.todos = state.todos.filter(function (todo) {
      return !todo.done;
    });
    clearTodoDragState();
    if (state.todos.length === before) {
      return;
    }
    persistTodos();
    renderTodoList();
  }

  function handleTodoDragStart(event) {
    if (!state.username || !els.todoList) {
      return;
    }

    var item = resolveTodoItemFromEvent(event);
    if (!item) {
      return;
    }

    var id = Number(item.getAttribute("data-id"));
    var todo = state.todos.find(function (entry) {
      return entry.id === id;
    });
    if (!todo || todo.done) {
      event.preventDefault();
      return;
    }

    state.todoDraggingId = id;
    item.classList.add("is-dragging");
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", String(id));
    }
  }

  function handleTodoDragOver(event) {
    if (!state.username || !els.todoList || state.todoDraggingId === null) {
      return;
    }

    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }

    var targetItem = resolveTodoItemFromEvent(event);
    if (!targetItem) {
      state.todoDragOverId = null;
      state.todoDragOverPosition = "before";
      els.todoList.classList.add("is-drag-over-empty");
      var noneTargets = els.todoList.querySelectorAll(".todo-item");
      noneTargets.forEach(function (item) {
        item.classList.remove("is-drag-over", "is-drag-over-after");
      });
      return;
    }

    var targetId = Number(targetItem.getAttribute("data-id"));
    var targetTodo = state.todos.find(function (entry) {
      return entry.id === targetId;
    });
    if (!targetTodo || targetId === state.todoDraggingId) {
      state.todoDragOverId = null;
      state.todoDragOverPosition = "before";
      return;
    }

    if (targetTodo.done) {
      state.todoDragOverId = null;
      state.todoDragOverPosition = "before";
      els.todoList.classList.add("is-drag-over-empty");
      return;
    }

    els.todoList.classList.remove("is-drag-over-empty");
    var rect = targetItem.getBoundingClientRect();
    var nextPosition = event.clientY >= rect.top + rect.height / 2 ? "after" : "before";
    if (state.todoDragOverId === targetId && state.todoDragOverPosition === nextPosition) {
      return;
    }

    state.todoDragOverId = targetId;
    state.todoDragOverPosition = nextPosition;
    var targets = els.todoList.querySelectorAll(".todo-item");
    targets.forEach(function (item) {
      item.classList.remove("is-drag-over", "is-drag-over-after");
    });
    targetItem.classList.add(nextPosition === "after" ? "is-drag-over-after" : "is-drag-over");
  }

  function handleTodoDrop(event) {
    if (!state.username || !els.todoList || state.todoDraggingId === null) {
      return;
    }

    event.preventDefault();
    var targetItem = resolveTodoItemFromEvent(event);
    var moved = false;

    if (targetItem) {
      var targetId = Number(targetItem.getAttribute("data-id"));
      var targetTodo = state.todos.find(function (entry) {
        return entry.id === targetId;
      });
      if (targetTodo && targetTodo.done) {
        moved = moveActiveTodoToEnd(state.todoDraggingId);
      } else {
        moved = moveActiveTodo(state.todoDraggingId, targetId, state.todoDragOverPosition);
      }
    } else {
      moved = moveActiveTodoToEnd(state.todoDraggingId);
    }

    clearTodoDragState();
    if (!moved) {
      return;
    }

    setHelper(els.todoHelp, TODO_HELP_REORDERED, false);
    persistTodos();
    renderTodoList();
  }

  function handleTodoDragEnd() {
    clearTodoDragState();
  }

  function formatTime(date) {
    var hh = String(date.getHours()).padStart(2, "0");
    var mm = String(date.getMinutes()).padStart(2, "0");
    var ss = String(date.getSeconds()).padStart(2, "0");
    return hh + ":" + mm + ":" + ss;
  }

  function formatDate(date) {
    try {
      return new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long"
      }).format(date);
    } catch (_error) {
      return date.toDateString();
    }
  }

  function renderClock() {
    var now = new Date();
    if (els.clock) {
      els.clock.textContent = formatTime(now);
    }
    if (els.dateText) {
      els.dateText.textContent = formatDate(now);
    }
  }

  function getBackgroundLayers() {
    var layers = Array.prototype.slice
      .call(document.querySelectorAll("[data-bg-layer]"))
      .filter(function (node) {
        return node instanceof HTMLElement;
      });
    return layers.length >= 2 ? layers.slice(0, 2) : null;
  }

  function pickRandom(items) {
    if (!Array.isArray(items) || items.length === 0) {
      return "";
    }
    return items[Math.floor(Math.random() * items.length)];
  }

  function pickRandomNext(previous) {
    if (!previous || backgroundImages.length <= 1) {
      return pickRandom(backgroundImages);
    }
    var candidates = backgroundImages.filter(function (path) {
      return path !== previous;
    });
    return pickRandom(candidates.length > 0 ? candidates : backgroundImages);
  }

  function preloadImage(path) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        resolve(true);
      };
      img.onerror = function () {
        resolve(false);
      };
      img.src = encodeURI(path);
    });
  }

  function setBackgroundTone(path) {
    var normalized = String(path || "").toLowerCase();
    var isLight = normalized.indexOf("/light/") >= 0;
    [document.documentElement, document.body].forEach(function (element) {
      if (!element) {
        return;
      }
      element.classList.toggle("bg-light", isLight);
      element.classList.toggle("bg-dark", !isLight);
    });
  }

  function applyBackground(path) {
    if (!path) {
      return;
    }
    var encoded = encodeURI(path);
    document.documentElement.style.setProperty("--bg-image", "url(\"" + encoded + "\")");
    if (document.body) {
      document.body.style.backgroundImage = "url(\"" + encoded + "\")";
    }

    if (state.bgLayers) {
      if (!state.bgInitialized) {
        state.bgLayers.forEach(function (layer, index) {
          layer.style.backgroundImage = "url(\"" + encoded + "\")";
          layer.classList.toggle("is-active", index === state.bgActiveLayerIndex);
        });
        state.bgInitialized = true;
      } else {
        var nextIndex = state.bgActiveLayerIndex === 0 ? 1 : 0;
        var currentLayer = state.bgLayers[state.bgActiveLayerIndex];
        var nextLayer = state.bgLayers[nextIndex];
        nextLayer.style.backgroundImage = "url(\"" + encoded + "\")";
        nextLayer.classList.add("is-active");
        currentLayer.classList.remove("is-active");
        state.bgActiveLayerIndex = nextIndex;
      }
    }

    setBackgroundTone(path);
    state.background = path;
    setText(STORAGE_KEYS.lastBackground, path);
  }

  function rotateBackgroundNow() {
    var previous = state.background || getText(STORAGE_KEYS.lastBackground, "");
    var firstCandidate = pickRandomNext(previous);
    if (!firstCandidate) {
      return Promise.resolve("");
    }

    var tried = {};
    var queue = [firstCandidate];

    function nextCandidate() {
      if (queue.length > 0) {
        return queue.shift();
      }
      var remaining = backgroundImages.filter(function (path) {
        return !tried[path];
      });
      return pickRandom(remaining);
    }

    function attempt(candidate) {
      if (!candidate || tried[candidate]) {
        return Promise.resolve("");
      }
      tried[candidate] = true;
      return preloadImage(candidate).then(function (loaded) {
        if (loaded) {
          applyBackground(candidate);
          return candidate;
        }
        return attempt(nextCandidate());
      });
    }

    return attempt(firstCandidate);
  }

  function enqueueBackground(task) {
    state.bgQueue = state.bgQueue
      .then(task)
      .catch(function (error) {
        console.error(error);
        return "";
      });
    return state.bgQueue;
  }

  function resolveWeatherApiKey() {
    var raw = normalizeText(window.__WEATHER_API_KEY__);
    if (!raw || /^%[A-Z0-9_]+%$/.test(raw)) {
      return "";
    }
    return raw;
  }

  function setWeatherStatus(weatherText, locationText) {
    if (els.weatherText) {
      els.weatherText.textContent = weatherText;
    }
    if (els.locationText) {
      els.locationText.textContent = locationText;
    }
  }

  function renderWeather() {
    var apiKey = resolveWeatherApiKey();
    if (!apiKey) {
      setWeatherStatus("Weather API key missing", WEATHER_KEY_HINT);
      return Promise.resolve();
    }
    if (!("geolocation" in navigator)) {
      setWeatherStatus("Weather unavailable", "Geolocation not supported");
      return Promise.resolve();
    }

    setWeatherStatus("Loading weather...", "Getting location...");
    return new Promise(function (resolve) {
      navigator.geolocation.getCurrentPosition(
        function (position) {
          var latitude = position.coords.latitude;
          var longitude = position.coords.longitude;
          var url = new URL("https://api.openweathermap.org/data/2.5/weather");
          url.searchParams.set("lat", String(latitude));
          url.searchParams.set("lon", String(longitude));
          url.searchParams.set("appid", apiKey);
          url.searchParams.set("units", "metric");
          url.searchParams.set("lang", "kr");

          fetch(url.toString())
            .then(function (response) {
              if (!response.ok) {
                throw new Error("Weather request failed: " + response.status);
              }
              return response.json();
            })
            .then(function (data) {
              var temp = Math.round(data && data.main ? data.main.temp : 0);
              var summary =
                data && Array.isArray(data.weather) && data.weather[0] ? data.weather[0].description : "Unknown";
              var city = data && data.name ? data.name : "Unknown city";
              setWeatherStatus(summary + " " + temp + "°C", city);
            })
            .catch(function (error) {
              console.error(error);
              setWeatherStatus("Weather unavailable", "Check network or API key");
            })
            .finally(resolve);
        },
        function (error) {
          var message = "Unable to get location.";
          if (error && error.code === 1) {
            message = "Location permission denied.";
          } else if (error && error.code === 2) {
            message = "Location unavailable.";
          } else if (error && error.code === 3) {
            message = "Location request timed out.";
          }
          setWeatherStatus("Weather unavailable", message);
          resolve();
        },
        {
          enableHighAccuracy: false,
          timeout: 8000,
          maximumAge: 60000
        }
      );
    });
  }

  function setSession(username) {
    state.username = normalizeText(username);
    setAuthView(state.username);
    if (state.username) {
      loadTodosForUser(state.username);
    } else {
      state.currentTodoKey = "";
      state.todos = [];
    }
    renderTodoList();
  }

  function bindEvents() {
    if (els.loginForm) {
      els.loginForm.addEventListener("submit", function (event) {
        event.preventDefault();
        var username = normalizeText(els.nameInput ? els.nameInput.value : "");
        if (username.length < 2) {
          setHelper(els.loginHelp, "Name must be at least 2 characters.", true);
          if (els.nameInput) {
            els.nameInput.focus();
          }
          return;
        }
        if (!saveUsername(username)) {
          setHelper(els.loginHelp, "Unable to save username. Check browser storage settings.", true);
          return;
        }
        if (els.loginForm) {
          els.loginForm.reset();
        }
        setSession(username);
      });
    }

    if (els.logoutBtn) {
      els.logoutBtn.addEventListener("click", function () {
        if (!clearUsername()) {
          setHelper(els.loginHelp, "Unable to clear username from storage.", true);
          return;
        }
        setSession("");
      });
    }

    if (els.todoForm) {
      els.todoForm.addEventListener("submit", handleTodoSubmit);
    }
    if (els.todoList) {
      els.todoList.addEventListener("click", handleTodoClick);
      els.todoList.addEventListener("dragstart", handleTodoDragStart);
      els.todoList.addEventListener("dragover", handleTodoDragOver);
      els.todoList.addEventListener("drop", handleTodoDrop);
      els.todoList.addEventListener("dragend", handleTodoDragEnd);
    }
    if (els.todoFilters) {
      els.todoFilters.addEventListener("click", handleFilterClick);
    }
    if (els.clearDoneBtn) {
      els.clearDoneBtn.addEventListener("click", handleClearDone);
    }

    if (els.shuffleBgBtn) {
      els.shuffleBgBtn.addEventListener("click", function () {
        enqueueBackground(rotateBackgroundNow);
      });
    }

    if (els.weatherPanel) {
      els.weatherPanel.title = "Weather key is loaded from .env.local";
    }
  }

  function cacheElements() {
    els.clock = qs("#clock");
    els.dateText = qs("#dateText");
    els.loginForm = qs("#loginForm");
    els.nameInput = qs("#nameInput");
    els.loginHelp = qs("#loginHelp");
    els.greeting = qs("#greeting");
    els.logoutBtn = qs("#logoutBtn");
    els.shuffleBgBtn = qs("#shuffleBgBtn");
    els.todoForm = qs("#todoForm");
    els.todoInput = qs("#todoInput");
    els.todoHelp = qs("#todoHelp");
    els.todoList = qs("#todoList");
    els.todoSummary = qs("#todoSummary");
    els.todoEmpty = qs("#todoEmpty");
    els.todoFilters = qs("#todoFilters");
    els.clearDoneBtn = qs("#clearDoneBtn");
    els.todoLockNotice = qs("#todoLockNotice");
    els.weatherText = qs("#weatherText");
    els.locationText = qs("#locationText");
    els.weatherPanel = qs(".weather");
  }

  function initFallbackApp() {
    if (window.__APP_READY__) {
      return;
    }

    cacheElements();
    state.bgLayers = getBackgroundLayers();

    if (state.bgLayers) {
      var activeIndex = state.bgLayers.findIndex(function (layer) {
        return layer.classList.contains("is-active");
      });
      state.bgActiveLayerIndex = activeIndex >= 0 ? activeIndex : 0;
      state.bgLayers.forEach(function (layer, index) {
        layer.classList.toggle("is-active", index === state.bgActiveLayerIndex);
      });
    }

    bindEvents();

    setSession(getSavedUsername());
    renderClock();
    window.setInterval(renderClock, 1000);

    enqueueBackground(rotateBackgroundNow);
    window.setInterval(function () {
      enqueueBackground(rotateBackgroundNow);
    }, BACKGROUND_ROTATE_INTERVAL_MS);

    renderWeather();
    window.setInterval(renderWeather, WEATHER_REFRESH_INTERVAL_MS);

    window.__APP_READY__ = true;
    window.__APP_FALLBACK__ = true;
    console.warn("Fallback app mode is active because module bootstrap did not complete.");
  }

  function bootstrapWithGuard() {
    window.setTimeout(function () {
      if (window.__APP_READY__) {
        return;
      }
      initFallbackApp();
    }, APP_READY_DELAY_MS);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrapWithGuard);
  } else {
    bootstrapWithGuard();
  }
})();
