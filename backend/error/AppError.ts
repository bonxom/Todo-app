import type { ErrorDefinition } from './ErrorDefinition.js';

export interface AppErrorOptions {
  readonly params?: Readonly<Record<string, string | number>>;
  readonly message?: string;
  readonly details?: unknown;
  readonly cause?: unknown;
}

const formatMessage = (
  template: string,
  params: Readonly<Record<string, string | number>> = {}
): string => template.replace(/\{([^{}]+)\}/g, (placeholder, key: string) =>
  Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : placeholder
);

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(definition: ErrorDefinition, options: AppErrorOptions = {}) {
    const message = options.message ?? formatMessage(definition.message, options.params);
    super(message, { cause: options.cause });
    this.name = 'AppError';
    this.code = definition.code;
    this.statusCode = definition.statusCode;
    this.details = options.details;

    Error.captureStackTrace?.(this, AppError);
  }
}
