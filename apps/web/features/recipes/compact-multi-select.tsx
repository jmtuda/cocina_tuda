import { useEffect, useId, useRef, useState } from "react";

export function MultiSelect({
  label,
  value,
  items,
  onChange,
}: {
  label: string;
  value: string[];
  items: { id: string; name: string }[];
  onChange(value: string[]): void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  const summary =
    items
      .filter((item) => value.includes(item.id))
      .map((item) => item.name)
      .join(", ") || "Selecciona";
  return (
    <div
      className="compact-select"
      ref={root}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node))
          setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <span id={`${id}-label`} className="field-label">
        {label}
      </span>
      <button
        ref={trigger}
        type="button"
        className="compact-select-trigger"
        aria-labelledby={`${id}-label ${id}-summary`}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => {
          setQuery("");
          setOpen(!open);
        }}
      >
        <span id={`${id}-summary`}>{summary}</span>
        <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <div
          id={id}
          className="compact-select-options"
          role="group"
          aria-label={label}
        >
          <input
            ref={search}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.preventDefault();
            }}
            aria-label={`Buscar ${label.toLowerCase()}`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {items
            .filter((item) =>
              item.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
            )
            .map((item) => (
              <label key={item.id}>
                <input
                  type="checkbox"
                  checked={value.includes(item.id)}
                  onChange={(event) =>
                    onChange(
                      event.target.checked
                        ? [...value, item.id]
                        : value.filter((id) => id !== item.id),
                    )
                  }
                />
                {item.name}
              </label>
            ))}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              trigger.current?.focus();
            }}
          >
            Listo
          </button>
        </div>
      )}
    </div>
  );
}
