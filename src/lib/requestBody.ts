/**
 * Read + parse a JSON request body with a real size cap.
 *
 * Unlike checking the `Content-Length` header (which is absent on chunked
 * requests and `Number(null) === 0`, silently bypassing the cap), this measures
 * the actual buffered bytes. Vercel's platform body limit bounds the gross size
 * before this runs; this enforces the app-level limit and rejects invalid JSON.
 */
const DEFAULT_MAX = 1_000_000; // 1 MB

export type JsonBodyResult =
  | { ok: true; data: unknown }
  | { ok: false; status: number; error: string };

export async function readJsonBody(req: Request, maxBytes: number = DEFAULT_MAX): Promise<JsonBodyResult> {
  let text: string;
  try {
    text = await req.text();
  } catch {
    return { ok: false, status: 400, error: 'Could not read body' };
  }
  if (Buffer.byteLength(text, 'utf8') > maxBytes) {
    return { ok: false, status: 413, error: 'Payload too large' };
  }
  if (!text) return { ok: false, status: 400, error: 'Empty request body' };
  try {
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: false, status: 400, error: 'Invalid JSON' };
  }
}
