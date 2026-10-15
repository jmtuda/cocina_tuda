"use client";

import { useId } from "react";

export type MamboConfiguration = {
  speed?: number | null;
  temperature?: number | null;
  ct?: number | null;
  durationSeconds?: number | null;
  observations?: string | null;
};
export type MamboDraft = {
  speed: string;
  temperature: string;
  ct: string;
  duration: string;
  durationUnit: "seconds" | "minutes";
  observations: string;
};
export type StepDraft = { text: string; mambo?: MamboDraft | null };
export type RecipeStep = { text: string; mambo?: MamboConfiguration | null };
const maxInteger = 2147483647;

export function mamboDraft(value?: MamboConfiguration | null): MamboDraft {
  const seconds = value?.durationSeconds;
  const minutes = seconds != null && seconds !== 0 && seconds % 60 === 0;
  return {
    speed: value?.speed?.toString() ?? "",
    temperature: value?.temperature?.toString() ?? "",
    ct: value?.ct?.toString() ?? "",
    duration: seconds == null ? "" : String(minutes ? seconds / 60 : seconds),
    durationUnit: minutes ? "minutes" : "seconds",
    observations: value?.observations ?? "",
  };
}

export function stepDraft(value: string | RecipeStep): StepDraft {
  return typeof value === "string"
    ? { text: value }
    : { text: value.text, mambo: value.mambo ? mamboDraft(value.mambo) : null };
}

export function mamboPayload(
  value?: MamboDraft | null,
): MamboConfiguration | null {
  if (!value) return null;
  const result: MamboConfiguration = {};
  for (const key of ["speed", "temperature", "ct"] as const) {
    if (value[key].trim() !== "") result[key] = Number(value[key]);
  }
  if (value.duration.trim() !== "") {
    result.durationSeconds = durationInSeconds(value);
  }
  if (value.observations.trim()) result.observations = value.observations;
  return Object.keys(result).length ? result : null;
}

function durationInSeconds(value: MamboDraft): number {
  const seconds =
    Number(value.duration) * (value.durationUnit === "minutes" ? 60 : 1);
  const rounded = Math.round(seconds);
  // Corregir únicamente el ruido binario de convertir minutos a segundos, no redondear tiempos fraccionarios.
  return value.durationUnit === "minutes" &&
    Math.abs(seconds - rounded) <=
      Number.EPSILON * Math.max(1, Math.abs(seconds)) * 2
    ? rounded
    : seconds;
}

export function validMambo(value?: MamboDraft | null): boolean {
  const payload = mamboPayload(value);
  return (
    !payload ||
    [
      payload.speed,
      payload.temperature,
      payload.ct,
      payload.durationSeconds,
    ].every(
      (number) =>
        number == null ||
        (Number.isInteger(number) && number >= 0 && number <= maxInteger),
    )
  );
}

export function MamboEditor({
  value,
  onChange,
  step,
}: {
  value?: MamboDraft | null;
  onChange(value: MamboDraft | null): void;
  step: number;
}) {
  const id = useId();
  if (!value)
    return (
      <button
        type="button"
        className="quiet"
        onClick={() => onChange(mamboDraft())}
      >
        Añadir Mambo al paso {step}
      </button>
    );
  return (
    <fieldset className="mambo-editor">
      <legend>Mambo · paso {step}</legend>
      <div className="mambo-fields">
        {(
          [
            ["speed", "Velocidad"],
            ["temperature", "Temperatura (°C)"],
            ["ct", "CT"],
          ] as const
        ).map(([key, label]) => (
          <label key={key}>
            {label}
            <input
              aria-label={`${label} Mambo paso ${step}`}
              type="number"
              min="0"
              max={maxInteger}
              step="1"
              value={value[key]}
              onChange={(event) =>
                onChange({ ...value, [key]: event.target.value })
              }
            />
          </label>
        ))}
        <label>
          Duración
          <input
            aria-label={`Duración Mambo paso ${step}`}
            type="number"
            min="0"
            max={
              value.durationUnit === "minutes" ? maxInteger / 60 : maxInteger
            }
            step={value.durationUnit === "minutes" ? "any" : "1"}
            value={value.duration}
            aria-describedby={`${id}-help`}
            onChange={(event) =>
              onChange({ ...value, duration: event.target.value })
            }
          />
        </label>
        <label>
          Unidad de duración
          <select
            aria-label={`Unidad de duración Mambo paso ${step}`}
            value={value.durationUnit}
            onChange={(event) => {
              const unit = event.target.value as MamboDraft["durationUnit"];
              // Conservar el tiempo al cambiar la unidad; segundos no divisibles usan decimales en minutos.
              const seconds = durationInSeconds(value);
              onChange({
                ...value,
                durationUnit: unit,
                duration:
                  value.duration === ""
                    ? ""
                    : String(unit === "minutes" ? seconds / 60 : seconds),
              });
            }}
          >
            <option value="seconds">Segundos</option>
            <option value="minutes">Minutos</option>
          </select>
        </label>
      </div>
      <label>
        Observaciones del robot
        <textarea
          aria-label={`Observaciones del robot paso ${step}`}
          rows={2}
          value={value.observations}
          onChange={(event) =>
            onChange({ ...value, observations: event.target.value })
          }
        />
      </label>
      <small id={`${id}-help`}>
        Vacío significa sin indicar; 0 se conserva. La duración debe equivaler a
        segundos enteros.
      </small>
      {!validMambo(value) && (
        <p role="alert">
          Mambo: usa valores enteros no negativos y una duración equivalente a
          segundos enteros.
        </p>
      )}
      <button type="button" className="quiet" onClick={() => onChange(null)}>
        Quitar Mambo del paso {step}
      </button>
    </fieldset>
  );
}

export function MamboSummary({ value }: { value?: MamboConfiguration | null }) {
  if (!value) return null;
  const parts: string[] = [];
  if (value.speed != null) parts.push(`Vel. ${value.speed}`);
  if (value.temperature != null) parts.push(`${value.temperature} °C`);
  if (value.ct != null) parts.push(`CT ${value.ct}`);
  if (value.durationSeconds != null) {
    const minutes = Math.floor(value.durationSeconds / 60);
    const remainder = value.durationSeconds % 60;
    parts.push(
      minutes > 0
        ? `${minutes} m${remainder ? ` ${remainder} s` : ""}`
        : `${remainder} s`,
    );
  }
  if (!parts.length && !value.observations?.trim()) return null;
  return (
    <div className="mambo-summary">
      <p>
        {parts.join(" · ")}
        {value.observations
          ? `${parts.length ? " · " : ""}${value.observations}`
          : ""}
      </p>
    </div>
  );
}
