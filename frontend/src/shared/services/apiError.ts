export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly kind: "http" | "network" | "timeout" = "http",
    public readonly code?: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export const getApiErrorMessage = (error: unknown, fallback = "An unexpected error occurred"): string => {
  if (error instanceof ApiError) {
    return error.message || fallback;
  }
  if (error instanceof Error) {
    return error.message || fallback;
  }
  return fallback;
};
