export const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";

export async function apiFetch(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  const url =
    input.startsWith("http") || input.startsWith("/api/")
      ? input
      : `${apiUrl}${input}`;
  try {
    return await fetch(url, init);
  } catch {
    throw new Error(
      "No se puede conectar con Cocina Tuda. Comprueba que la aplicación y la base de datos están iniciadas e inténtalo de nuevo.",
    );
  }
}

export async function responseError(response: Response, fallback: string) {
  const body = (await response.json().catch(() => ({}))) as {
    message?: string | string[];
  };
  const detail = Array.isArray(body.message)
    ? body.message.join(", ")
    : body.message;
  return detail ? `${fallback}: ${detail}` : fallback;
}
