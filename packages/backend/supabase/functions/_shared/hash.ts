/**
 * sha256 the input text — used as the rewrite_cache PK so the same post text
 * + mode + model_version collapses to the same row, AND so we never store
 * plaintext server-side (only the hash + the rewrite output land in Postgres).
 */
export async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
