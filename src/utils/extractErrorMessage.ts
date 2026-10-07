/**
 * Pure error message extraction — no store/UI imports (safe for auth bootstrap).
 */
export function extractErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;
    const responseData =
      err.responseData && typeof err.responseData === 'object'
        ? (err.responseData as Record<string, unknown>)
        : null;
    if (responseData) {
      const responseErrors = extractErrorMessage(responseData);
      if (responseErrors !== 'An unexpected error occurred. Please try again.') {
        return responseErrors;
      }
    }

    if (err.errors) {
      if (Array.isArray(err.errors)) {
        return err.errors.map(String).join(', ');
      }
      if (typeof err.errors === 'object') {
        const errorMessages = Object.values(err.errors as Record<string, unknown>)
          .flatMap((v) => (Array.isArray(v) ? v : [v]))
          .map((v) => String(v))
          .filter(Boolean);
        if (errorMessages.length > 0) return errorMessages.join(', ');
      } else {
        return String(err.errors);
      }
    }

    if (err.message) return String(err.message);
    if (err.error) return String(err.error);
    if (err.details) {
      if (typeof err.details === 'string') return err.details;
      if (Array.isArray(err.details)) return err.details.join(', ');
      if (typeof err.details === 'object') {
        const details = Object.values(err.details as Record<string, unknown>)
          .flatMap((v) => (Array.isArray(v) ? v : [v]));
        return details.map(String).join(', ');
      }
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred. Please try again.';
}
