export class ApiError extends Error {
  readonly status: number | null;
  readonly code: string | null;

  constructor(message: string, status: number | null = null, code: string | null = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function detailText(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    const items = value.map((item) => {
      if (typeof item === 'string') return item;
      if (isRecord(item)) {
        const message = typeof item.msg === 'string' ? item.msg : typeof item.message === 'string' ? item.message : null;
        const location = Array.isArray(item.loc) ? item.loc.filter((part) => typeof part === 'string' || typeof part === 'number').join('.') : '';
        return message ? (location ? `${location}: ${message}` : message) : null;
      }
      return null;
    }).filter((item): item is string => item !== null);
    return items.length > 0 ? items.join('; ') : null;
  }
  if (isRecord(value)) {
    if (typeof value.message === 'string') return value.message;
    if (typeof value.msg === 'string') return value.msg;
  }
  return null;
}

export async function readJsonResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json') && !contentType.toLowerCase().includes('+json')) {
    if (!response.ok) {
      throw new ApiError(httpStatusMessage(response.status), response.status);
    }
    throw new ApiError('The API returned a non-JSON response where JSON was expected.', response.status);
  }

  let payload: unknown;
  try {
    payload = await response.json() as unknown;
  } catch {
    throw new ApiError('The API response contained invalid JSON.', response.status);
  }

  if (!response.ok) {
    const root = isRecord(payload) ? payload : null;
    const error = root && isRecord(root.error) ? root.error : null;
    const code = error && typeof error.code === 'string' ? error.code : null;
    const message = error ? detailText(error.message) : null;
    const detail = root ? detailText(root.detail) : null;
    const serverMessage = message ?? detail ?? (root ? detailText(root.message) : null);
    throw new ApiError(serverMessage ?? httpStatusMessage(response.status), response.status, code);
  }
  return payload;
}

export function httpStatusMessage(status: number): string {
  if (status === 413) return 'The backend rejected the upload because it is too large (HTTP 413).';
  if (status === 422) return 'The backend could not validate this request (HTTP 422). Check the image and configuration.';
  if (status >= 500) return `The backend failed while processing the request (HTTP ${status}).`;
  if (status === 404) return 'The requested API endpoint was not found (HTTP 404). Check the API base URL and backend routes.';
  if (status === 401 || status === 403) return `The backend denied this request (HTTP ${status}). This frontend does not implement authentication.`;
  return `The API request failed with HTTP ${status}.`;
}

export function asErrorMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === 'AbortError') return 'Request cancelled.';
  if (error instanceof ApiError) return error.message;
  if (error instanceof TypeError) return 'Could not reach the API. Check that the backend is running and that its CORS policy allows this frontend origin.';
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred. Please retry.';
}
