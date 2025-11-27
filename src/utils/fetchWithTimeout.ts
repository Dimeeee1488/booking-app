const DEFAULT_TIMEOUT_MS = 30000;

interface FetchWithTimeoutInit extends RequestInit {
  timeoutMs?: number;
}

/**
 * Wrapper around fetch that aborts the request after the provided timeout.
 * Also respects an existing AbortSignal passed via init.signal.
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: FetchWithTimeoutInit = {}
): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, signal, ...rest } = init;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  try {
    const response = await fetch(input, { ...rest, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

