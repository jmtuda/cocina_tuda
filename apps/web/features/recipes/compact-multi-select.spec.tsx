import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { MultiSelect } from "./compact-multi-select";
afterEach(cleanup);
it("supports keyboard search and selection without submitting the recipe; closes outside and on Tab", async () => {
  const submit = vi.fn();
  function Example() {
    const [value, setValue] = useState<string[]>([]);
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <MultiSelect
          label="Categorías"
          value={value}
          onChange={setValue}
          items={[
            { id: "a", name: "Sopa" },
            { id: "b", name: "Pasta" },
          ]}
        />
        <button type="button">Fuera</button>
        <button>Guardar receta</button>
      </form>
    );
  }
  render(<Example />);
  const user = userEvent.setup();
  const trigger = screen.getByRole("button", { name: /Categorías/ });
  await user.click(trigger);
  await user.type(screen.getByLabelText("Buscar categorías"), "sop{Enter}");
  expect(submit).not.toHaveBeenCalled();
  expect(
    screen.queryByRole("checkbox", { name: "Pasta" }),
  ).not.toBeInTheDocument();
  await user.tab();
  await user.keyboard(" ");
  expect(screen.getByRole("checkbox", { name: "Sopa" })).toBeChecked();
  await user.click(screen.getByRole("button", { name: "Fuera" }));
  expect(trigger).toHaveAttribute("aria-expanded", "false");
  await user.click(trigger);
  await user.keyboard("{Escape}");
  expect(trigger).toHaveFocus();
  await user.click(trigger);
  await user.tab({ shift: true });
  await user.tab({ shift: true });
  expect(trigger).toHaveAttribute("aria-expanded", "false");
});
