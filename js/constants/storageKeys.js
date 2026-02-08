export const STORAGE_KEYS = Object.freeze({
  username: "todo.username",
  todos: "todo.items",
  lastBackground: "todo.lastBg"
});

export function getTodoStorageKey(username) {
  const normalized = String(username ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

  return normalized ? `${STORAGE_KEYS.todos}:${normalized}` : STORAGE_KEYS.todos;
}
