/** Safe JSON parse for fetch responses that may be HTML error pages (404/500). */
export async function readJsonResponse<T = any>(
  res: Response
): Promise<{ ok: boolean; status: number; data: T; error?: string }> {
  const contentType = res.headers.get('content-type') || ''
  const raw = await res.text()

  if (!contentType.includes('application/json')) {
    const looksHtml = raw.trimStart().startsWith('<!') || raw.includes('<!DOCTYPE')
    return {
      ok: false,
      status: res.status,
      data: {} as T,
      error: looksHtml
        ? res.status === 404
          ? 'API route not found (404). Restart the Next.js server and clear .next, then retry.'
          : `Server returned HTML instead of JSON (HTTP ${res.status}). Restart the local server.`
        : `Unexpected non-JSON response (HTTP ${res.status}).`,
    }
  }

  try {
    const data = JSON.parse(raw) as T
    return {
      ok: res.ok,
      status: res.status,
      data,
      error: res.ok ? undefined : (data as any)?.error || `Request failed (${res.status})`,
    }
  } catch {
    return {
      ok: false,
      status: res.status,
      data: {} as T,
      error: 'Server returned invalid JSON.',
    }
  }
}
