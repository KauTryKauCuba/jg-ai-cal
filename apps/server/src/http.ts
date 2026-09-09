// A bare `fetch()` throw means the request never left (or never landed) —
// nothing was sent to bill against, so retrying is always safe. This exists
// because the Docker network path to outbound provider APIs is intermittently
// flaky (observed ~50% UND_ERR_CONNECT_TIMEOUT on fresh TLS connections), not
// because any provider itself is unreliable.
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retries = 2
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetch(url, init);
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
      }
    }
  }
  throw lastErr;
}
