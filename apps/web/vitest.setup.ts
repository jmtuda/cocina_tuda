import "@testing-library/jest-dom/vitest";
Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
  configurable: true,
  value: function () {
    this.setAttribute("open", "");
    this.querySelector("[autofocus]")?.focus();
  },
});
Object.defineProperty(HTMLDialogElement.prototype, "close", {
  configurable: true,
  value: function () {
    this.removeAttribute("open");
  },
});
