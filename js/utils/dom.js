export const qs = (selector, scope = document) => scope.querySelector(selector);

export const qsa = (selector, scope = document) => [...scope.querySelectorAll(selector)];

export function toggleClass(el, className, active) {
  if (!el) {
    return;
  }
  el.classList.toggle(className, active);
}
