import { STORAGE_KEYS, getTodoStorageKey } from "../../constants/storageKeys.js";
import { getJSON, getText, removeKey, setJSON } from "../../utils/storage.js";

const TODO_MAX_LENGTH = 80;
const TODO_HELP_DEFAULT = "Maximum 80 characters.";
const TODO_HELP_LOCKED = "Login first to use todo features.";
const TODO_HELP_EMPTY = "Please enter a task.";
const TODO_HELP_REORDERED = "Active task order updated.";

function normalizeTodos(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => item && typeof item.text === "string")
    .map((item) => ({
      id: Number(item.id) || Date.now(),
      text: item.text,
      done: Boolean(item.done),
      createdAt: item.createdAt || new Date().toISOString()
    }));
}

function normalizeTodoText(value) {
  return value.trim().replace(/\s+/g, " ");
}

export function initTodo({ formEl, inputEl, listEl, summaryEl, emptyEl, filtersEl, clearDoneBtn, helperEl }) {
  if (!formEl || !inputEl || !listEl) {
    return { setAccess: () => {} };
  }

  const lockNoticeEl = document.querySelector("#todoLockNotice");
  let todos = [];
  let filter = "all";
  let isLocked = true;
  let currentStorageKey = "";
  let editingId = null;
  let draggingId = null;
  let dragOverId = null;
  let dragOverPosition = "before";

  const persist = () => {
    if (!currentStorageKey) {
      return;
    }
    setJSON(currentStorageKey, todos);
  };

  const migrateLegacyTodosIfNeeded = (storageKey) => {
    const hasUserTodos = getText(storageKey, "__missing__") !== "__missing__";
    if (hasUserTodos) {
      return;
    }

    const hasLegacyTodos = getText(STORAGE_KEYS.todos, "__missing__") !== "__missing__";
    if (!hasLegacyTodos) {
      return;
    }

    const legacyTodos = normalizeTodos(getJSON(STORAGE_KEYS.todos, []));
    if (legacyTodos.length > 0) {
      setJSON(storageKey, legacyTodos);
    }
    removeKey(STORAGE_KEYS.todos);
  };

  const loadTodosByUser = (username) => {
    currentStorageKey = getTodoStorageKey(username);
    migrateLegacyTodosIfNeeded(currentStorageKey);
    todos = normalizeTodos(getJSON(currentStorageKey, []));
  };

  const setHelper = (message, isError = false) => {
    if (!helperEl) {
      return;
    }
    helperEl.textContent = message;
    helperEl.classList.toggle("error", isError);
  };

  const getCounts = () => {
    const total = todos.length;
    const done = todos.filter((todo) => todo.done).length;
    const active = total - done;
    return { total, done, active };
  };

  const getVisibleTodos = () => {
    if (filter === "active") {
      return todos.filter((todo) => !todo.done);
    }
    if (filter === "done") {
      return todos.filter((todo) => todo.done);
    }
    return todos;
  };

  const hasDuplicateTodo = (candidateText, excludeId = null) =>
    todos.some((todo) => {
      if (excludeId !== null && todo.id === excludeId) {
        return false;
      }
      return todo.text.toLowerCase() === candidateText.toLowerCase();
    });

  const stopEditing = () => {
    editingId = null;
  };

  const resolveTodoItemFromEvent = (event) => {
    const rawTarget = event.target;
    if (rawTarget instanceof Element) {
      return rawTarget.closest(".todo-item");
    }
    if (rawTarget instanceof Node && rawTarget.parentElement) {
      return rawTarget.parentElement.closest(".todo-item");
    }
    return null;
  };

  const clearDragState = () => {
    draggingId = null;
    dragOverId = null;
    dragOverPosition = "before";
    listEl.classList.remove("is-drag-over-empty");
    const items = listEl.querySelectorAll(".todo-item");
    items.forEach((item) => {
      item.classList.remove("is-dragging", "is-drag-over", "is-drag-over-after");
    });
  };

  const moveActiveTodo = (dragId, targetId, position = "before") => {
    if (dragId === targetId) {
      return false;
    }

    const draggedTodo = todos.find((todo) => todo.id === dragId);
    const targetTodo = todos.find((todo) => todo.id === targetId);
    if (!draggedTodo || !targetTodo || draggedTodo.done || targetTodo.done) {
      return false;
    }

    const reorderedActive = todos.filter((todo) => !todo.done);
    const draggedIndex = reorderedActive.findIndex((todo) => todo.id === dragId);
    if (draggedIndex === -1) {
      return false;
    }

    const [movedTodo] = reorderedActive.splice(draggedIndex, 1);
    const targetIndex = reorderedActive.findIndex((todo) => todo.id === targetId);
    if (targetIndex === -1) {
      return false;
    }

    const insertIndex = position === "after" ? targetIndex + 1 : targetIndex;
    reorderedActive.splice(insertIndex, 0, movedTodo);

    let activeCursor = 0;
    todos = todos.map((todo) => (todo.done ? todo : reorderedActive[activeCursor++]));
    return true;
  };

  const moveActiveTodoToEnd = (dragId) => {
    const draggedTodo = todos.find((todo) => todo.id === dragId);
    if (!draggedTodo || draggedTodo.done) {
      return false;
    }

    const reorderedActive = todos.filter((todo) => !todo.done);
    const draggedIndex = reorderedActive.findIndex((todo) => todo.id === dragId);
    if (draggedIndex === -1 || draggedIndex === reorderedActive.length - 1) {
      return false;
    }

    const [movedTodo] = reorderedActive.splice(draggedIndex, 1);
    reorderedActive.push(movedTodo);

    let activeCursor = 0;
    todos = todos.map((todo) => (todo.done ? todo : reorderedActive[activeCursor++]));
    return true;
  };

  const saveEditedTodo = (id, rawValue) => {
    const index = todos.findIndex((todo) => todo.id === id);
    if (index === -1) {
      stopEditing();
      render();
      return;
    }

    const nextText = normalizeTodoText(rawValue);
    if (!nextText) {
      setHelper(TODO_HELP_EMPTY, true);
      return;
    }
    if (nextText.length > TODO_MAX_LENGTH) {
      setHelper(`Task must be ${TODO_MAX_LENGTH} characters or less.`, true);
      return;
    }
    if (hasDuplicateTodo(nextText, id)) {
      setHelper("This task already exists.", true);
      return;
    }

    todos[index].text = nextText;
    stopEditing();
    setHelper(TODO_HELP_DEFAULT);
    persist();
    render();
  };

  const updateFilterButtons = () => {
    if (!filtersEl) {
      return;
    }
    const buttons = filtersEl.querySelectorAll(".filter-btn");
    buttons.forEach((button) => {
      const active = button.dataset.filter === filter;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  };

  const renderSummary = () => {
    if (!summaryEl) {
      return;
    }
    const { total, done, active } = getCounts();
    summaryEl.textContent = total === 0 ? "0 tasks" : `${active} active · ${done} done · ${total} total`;
  };

  const renderEmpty = (visibleCount) => {
    if (!emptyEl) {
      return;
    }
    emptyEl.classList.toggle("hidden", visibleCount > 0);
    if (visibleCount > 0) {
      return;
    }
    if (todos.length === 0) {
      emptyEl.textContent = "No tasks yet. Add your first task.";
      return;
    }
    if (filter === "active") {
      emptyEl.textContent = "No active tasks. Nice progress.";
      return;
    }
    if (filter === "done") {
      emptyEl.textContent = "No completed tasks yet.";
      return;
    }
    emptyEl.textContent = "No tasks to show.";
  };

  const render = () => {
    listEl.classList.remove("is-drag-over-empty");
    if (isLocked) {
      stopEditing();
      clearDragState();
      listEl.innerHTML = "";
      listEl.classList.add("is-locked");
      if (summaryEl) {
        summaryEl.textContent = "Login required";
      }
      if (emptyEl) {
        emptyEl.classList.add("hidden");
      }
      if (lockNoticeEl) {
        lockNoticeEl.classList.remove("hidden");
      }
      if (clearDoneBtn) {
        clearDoneBtn.disabled = true;
      }
      updateFilterButtons();
      setHelper(TODO_HELP_LOCKED, false);
      return;
    }

    listEl.classList.remove("is-locked");
    if (lockNoticeEl) {
      lockNoticeEl.classList.add("hidden");
    }
    const visibleTodos = getVisibleTodos();
    listEl.innerHTML = "";

    visibleTodos.forEach((todo) => {
      const isEditing = editingId === todo.id;
      const isDraggable = !todo.done && !isEditing;
      const li = document.createElement("li");
      li.className = `todo-item todo-item-enter${todo.done ? " done" : ""}${isEditing ? " is-editing" : ""}`;
      li.dataset.id = String(todo.id);
      li.draggable = isDraggable;
      li.classList.toggle("is-draggable", isDraggable);

      const main = document.createElement("div");
      main.className = "todo-main";

      const checkBtn = document.createElement("button");
      checkBtn.className = "check-btn";
      checkBtn.type = "button";
      checkBtn.dataset.action = "toggle";
      checkBtn.setAttribute("aria-label", todo.done ? "Mark as active" : "Mark as done");
      checkBtn.setAttribute("aria-pressed", String(todo.done));

      if (isEditing) {
        const editInput = document.createElement("input");
        editInput.className = "todo-edit-input";
        editInput.type = "text";
        editInput.maxLength = TODO_MAX_LENGTH;
        editInput.value = todo.text;
        editInput.setAttribute("aria-label", `Edit task: ${todo.text}`);
        main.append(checkBtn, editInput);
      } else {
        const text = document.createElement("span");
        text.className = "todo-text";
        text.textContent = todo.text;
        main.append(checkBtn, text);
      }

      const actions = document.createElement("div");
      actions.className = "todo-actions-inline";

      if (isEditing) {
        const saveBtn = document.createElement("button");
        saveBtn.className = "icon-btn success";
        saveBtn.type = "button";
        saveBtn.dataset.action = "save-edit";
        saveBtn.textContent = "Save";

        const cancelBtn = document.createElement("button");
        cancelBtn.className = "icon-btn";
        cancelBtn.type = "button";
        cancelBtn.dataset.action = "cancel-edit";
        cancelBtn.textContent = "Cancel";

        actions.append(saveBtn, cancelBtn);
      } else {
        const editBtn = document.createElement("button");
        editBtn.className = "icon-btn";
        editBtn.type = "button";
        editBtn.dataset.action = "edit";
        editBtn.textContent = "Edit";
        editBtn.setAttribute("aria-label", `Edit task: ${todo.text}`);

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "icon-btn danger";
        deleteBtn.type = "button";
        deleteBtn.dataset.action = "delete";
        deleteBtn.textContent = "Delete";
        deleteBtn.setAttribute("aria-label", `Delete task: ${todo.text}`);

        actions.append(editBtn, deleteBtn);
      }

      li.append(main, actions);
      listEl.appendChild(li);

      if (isEditing) {
        window.requestAnimationFrame(() => {
          const editInput = li.querySelector(".todo-edit-input");
          if (editInput) {
            editInput.focus();
            editInput.select();
          }
        });
      }
    });

    const { done } = getCounts();
    if (clearDoneBtn) {
      clearDoneBtn.disabled = done === 0;
    }
    updateFilterButtons();
    renderSummary();
    renderEmpty(visibleTodos.length);
  };

  formEl.addEventListener("submit", (event) => {
    event.preventDefault();
    if (isLocked) {
      setHelper(TODO_HELP_LOCKED, true);
      return;
    }
    const text = normalizeTodoText(inputEl.value);
    if (!text) {
      setHelper(TODO_HELP_EMPTY, true);
      inputEl.focus();
      return;
    }
    if (text.length > TODO_MAX_LENGTH) {
      setHelper(`Task must be ${TODO_MAX_LENGTH} characters or less.`, true);
      inputEl.focus();
      return;
    }
    if (hasDuplicateTodo(text)) {
      setHelper("This task already exists.", true);
      inputEl.focus();
      return;
    }

    todos.unshift({
      id: Date.now() + Math.floor(Math.random() * 1000),
      text,
      done: false,
      createdAt: new Date().toISOString()
    });

    setHelper(TODO_HELP_DEFAULT);
    persist();
    render();
    formEl.reset();
    inputEl.focus();
  });

  listEl.addEventListener("click", (event) => {
    if (isLocked) {
      return;
    }
    const button = event.target.closest("button[data-action]");
    if (!button) {
      return;
    }

    const item = button.closest(".todo-item");
    if (!item) {
      return;
    }

    const id = Number(item.dataset.id);
    const index = todos.findIndex((todo) => todo.id === id);
    if (index === -1) {
      return;
    }

    const action = button.dataset.action;
    if (action === "toggle") {
      todos[index].done = !todos[index].done;
      if (editingId === id) {
        stopEditing();
      }
    } else if (action === "edit") {
      editingId = id;
      setHelper("Press Enter to save or Escape to cancel.", false);
      render();
      return;
    } else if (action === "save-edit") {
      const editInput = item.querySelector(".todo-edit-input");
      saveEditedTodo(id, editInput?.value ?? "");
      return;
    } else if (action === "cancel-edit") {
      stopEditing();
      setHelper(TODO_HELP_DEFAULT, false);
      render();
      return;
    } else if (action === "delete") {
      todos.splice(index, 1);
      if (editingId === id) {
        stopEditing();
      }
    }

    setHelper(TODO_HELP_DEFAULT);
    persist();
    render();
  });

  listEl.addEventListener("keydown", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || !target.classList.contains("todo-edit-input")) {
      return;
    }

    const item = target.closest(".todo-item");
    if (!item) {
      return;
    }
    const id = Number(item.dataset.id);

    if (event.key === "Enter") {
      event.preventDefault();
      saveEditedTodo(id, target.value);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      stopEditing();
      setHelper(TODO_HELP_DEFAULT, false);
      render();
    }
  });

  listEl.addEventListener("dragstart", (event) => {
    if (isLocked) {
      return;
    }

    const item = resolveTodoItemFromEvent(event);
    if (!item) {
      return;
    }

    const id = Number(item.dataset.id);
    const todo = todos.find((entry) => entry.id === id);
    if (!todo || todo.done || editingId === id) {
      event.preventDefault();
      return;
    }

    draggingId = id;
    item.classList.add("is-dragging");
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", String(id));
    }
  });

  listEl.addEventListener("dragover", (event) => {
    if (isLocked || draggingId === null) {
      return;
    }

    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }

    const targetItem = resolveTodoItemFromEvent(event);
    if (!targetItem) {
      dragOverId = null;
      dragOverPosition = "before";
      listEl.classList.add("is-drag-over-empty");
      const items = listEl.querySelectorAll(".todo-item");
      items.forEach((item) => {
        item.classList.remove("is-drag-over", "is-drag-over-after");
      });
      return;
    }

    const targetId = Number(targetItem.dataset.id);
    const targetTodo = todos.find((entry) => entry.id === targetId);
    if (!targetTodo || targetId === draggingId) {
      dragOverId = null;
      dragOverPosition = "before";
      return;
    }

    if (targetTodo.done) {
      dragOverId = null;
      dragOverPosition = "before";
      listEl.classList.add("is-drag-over-empty");
      return;
    }

    listEl.classList.remove("is-drag-over-empty");
    const rect = targetItem.getBoundingClientRect();
    const nextPosition = event.clientY >= rect.top + rect.height / 2 ? "after" : "before";
    if (dragOverId === targetId && dragOverPosition === nextPosition) {
      return;
    }

    dragOverId = targetId;
    dragOverPosition = nextPosition;
    const items = listEl.querySelectorAll(".todo-item");
    items.forEach((item) => {
      item.classList.remove("is-drag-over", "is-drag-over-after");
    });
    targetItem.classList.add(nextPosition === "after" ? "is-drag-over-after" : "is-drag-over");
  });

  listEl.addEventListener("drop", (event) => {
    if (isLocked || draggingId === null) {
      return;
    }

    event.preventDefault();
    const targetItem = resolveTodoItemFromEvent(event);
    let moved = false;

    if (targetItem) {
      const targetId = Number(targetItem.dataset.id);
      const targetTodo = todos.find((entry) => entry.id === targetId);
      if (targetTodo?.done) {
        moved = moveActiveTodoToEnd(draggingId);
      } else {
        moved = moveActiveTodo(draggingId, targetId, dragOverPosition);
      }
    } else {
      moved = moveActiveTodoToEnd(draggingId);
    }

    clearDragState();

    if (!moved) {
      return;
    }

    setHelper(TODO_HELP_REORDERED);
    persist();
    render();
  });

  listEl.addEventListener("dragend", () => {
    clearDragState();
  });

  if (filtersEl) {
    filtersEl.addEventListener("click", (event) => {
      if (isLocked) {
        return;
      }
      const button = event.target.closest(".filter-btn");
      if (!button) {
        return;
      }
      const nextFilter = button.dataset.filter;
      if (!nextFilter || nextFilter === filter) {
        return;
      }
      clearDragState();
      stopEditing();
      filter = nextFilter;
      render();
    });
  }

  if (clearDoneBtn) {
    clearDoneBtn.addEventListener("click", () => {
      if (isLocked) {
        return;
      }
      const previousLength = todos.length;
      todos = todos.filter((todo) => !todo.done);
      clearDragState();
      if (editingId !== null && !todos.some((todo) => todo.id === editingId)) {
        stopEditing();
      }
      if (todos.length === previousLength) {
        return;
      }
      setHelper("Completed tasks removed.");
      persist();
      render();
    });
  }

  const setControlDisabled = (disabled) => {
    inputEl.disabled = disabled;
    const submitButton = formEl.querySelector("button[type='submit']");
    if (submitButton) {
      submitButton.disabled = disabled;
    }
    if (clearDoneBtn) {
      clearDoneBtn.disabled = disabled || todos.every((todo) => !todo.done);
    }
    if (filtersEl) {
      const buttons = filtersEl.querySelectorAll(".filter-btn");
      buttons.forEach((button) => {
        button.disabled = disabled;
      });
    }
  };

  const setAccess = (loggedIn, username = "") => {
    const hasUser = Boolean(String(username).trim());
    const nextUnlocked = Boolean(loggedIn && hasUser);
    isLocked = !nextUnlocked;

    if (nextUnlocked) {
      loadTodosByUser(username);
      clearDragState();
      stopEditing();
    } else {
      currentStorageKey = "";
      todos = [];
      clearDragState();
      stopEditing();
    }

    setControlDisabled(isLocked);
    render();
    if (!isLocked) {
      inputEl.focus();
    }
  };

  setControlDisabled(isLocked);
  setHelper(TODO_HELP_LOCKED);
  render();

  return {
    setAccess
  };
}
