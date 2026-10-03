"use client";

import { ReactNode, useEffect, useRef } from "react";

export function RecipeModal({
  active,
  title,
  onClose,
  children,
}: {
  active: boolean;
  title: string;
  onClose(): void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!active) return;
    const element = dialog.current;
    const trigger = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    element?.showModal();
    element?.querySelector<HTMLButtonElement>("button")?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
      if (trigger?.isConnected) trigger.focus();
    };
  }, [active]);

  if (!active) return children;
  return (
    <dialog
      ref={dialog}
      className="recipe-modal"
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="recipe-modal-bar">
        <span>Receta</span>
        <button type="button" className="quiet" onClick={onClose}>
          Cerrar
        </button>
      </div>
      <div className="recipe-modal-content">{children}</div>
    </dialog>
  );
}
