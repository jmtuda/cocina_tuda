import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, expect, it } from "vitest";
import { RecipeModal } from "./recipe-modal";

function Example() {
  const [active, setActive] = useState(false);
  return (
    <>
      <button onClick={() => setActive(true)}>Abrir receta</button>
      <RecipeModal
        active={active}
        title="Receta completa"
        onClose={() => setActive(false)}
      >
        <p>Todos los pasos e ingredientes</p>
      </RecipeModal>
    </>
  );
}
afterEach(cleanup);
it("closes visibly, restores focus and releases the page scroll lock", async () => {
  const user = userEvent.setup();
  render(<Example />);
  const trigger = screen.getByRole("button", { name: "Abrir receta" });
  await user.click(trigger);
  expect(screen.getByRole("dialog", { name: "Receta completa" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Cerrar" })).toHaveFocus();
  await user.click(screen.getByRole("button", { name: "Cerrar" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
  expect(document.body.style.overflow).toBe("");
});
it("handles the native Escape cancel event", async () => {
  const user = userEvent.setup();
  render(<Example />);
  await user.click(screen.getByRole("button", { name: "Abrir receta" }));
  fireEvent(
    screen.getByRole("dialog"),
    new Event("cancel", { bubbles: false, cancelable: true }),
  );
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
