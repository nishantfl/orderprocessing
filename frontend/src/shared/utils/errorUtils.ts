import type { AxiosError } from 'axios';

/** Extract user-friendly message from unknown error (e.g. API or network) */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as AxiosError<{ message?: string | string[] }>;
    const msg = axiosError.response?.data?.message;
    if (typeof msg === 'string') return msg;
    if (Array.isArray(msg)) return (msg as string[]).join(', ');
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
