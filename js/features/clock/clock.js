import { formatDate, formatTime } from "../../utils/date.js";

export function initClock({ clockEl, dateEl }) {
  if (!clockEl || !dateEl) {
    return;
  }

  const render = () => {
    const now = new Date();
    clockEl.textContent = formatTime(now);
    dateEl.textContent = formatDate(now);
  };

  render();
  setInterval(render, 1000);
}
