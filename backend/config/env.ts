import { CorsOptions } from 'cors';
import { AppError } from '../error/AppError.js';
import { COMMON_ERROR } from '../error/definitions/commonErrors.js';

const DEFAULT_ALLOWED_ORIGINS: string[] = [
  'https://fetodo-six.vercel.app',
  'https://fetodo.vercel.app',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3636',
  'http://127.0.0.1:3636',
  'http://180.93.34.142:3636',
  'https://todo.onrender.com',
  'http://todo.onrender.com'
];

const normalizeOrigin = (origin: string): string => origin.replace(/\/+$/, '');

const parseAllowedOrigins = (value: string | undefined): string[] => {
  if (!value) return [];
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map(normalizeOrigin);
};

export const getAllowedOrigins = (): string[] => {
  const configuredOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);
  return configuredOrigins.length > 0 ? configuredOrigins : DEFAULT_ALLOWED_ORIGINS;
};

export const createCorsOptions = (): CorsOptions => {
  const allowedOrigins = new Set(getAllowedOrigins());

  return {
    origin(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
      if (!origin) {
        callback(null, true);
        return;
      }
      const normalizedOrigin = normalizeOrigin(origin);
      if (allowedOrigins.has(normalizedOrigin)) {
        callback(null, true);
        return;
      }
      callback(new AppError(COMMON_ERROR.CORS_NOT_ALLOWED));
    },
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
  };
};

export interface ServerConfig {
  port: number;
  host: string;
}

export const getServerConfig = (): ServerConfig => ({
  port: Number.parseInt(process.env.PORT ?? '3001', 10),
  host: process.env.HOST ?? '0.0.0.0',
});

export const validateServerEnv = (): void => {
  const missing: string[] = [];

  if (!process.env.MONGO_URI) missing.push('MONGO_URI');
  if (!process.env.JWT_SECRET) missing.push('JWT_SECRET');
  if (!process.env.JWT_REFRESH_SECRET) missing.push('JWT_REFRESH_SECRET');
  if (!process.env.JWT_ACCESS_EXPIRES_IN) missing.push('JWT_ACCESS_EXPIRES_IN');
  if (!process.env.JWT_REFRESH_EXPIRES_IN) missing.push('JWT_REFRESH_EXPIRES_IN');
  if (!process.env.SALT_ROUNDS) missing.push('SALT_ROUNDS');

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  const saltRounds = Number.parseInt(process.env.SALT_ROUNDS as string, 10);
  if (Number.isNaN(saltRounds) || saltRounds <= 0) {
    throw new Error('SALT_ROUNDS must be a positive integer');
  }
};

export const getAiApiKey = (): string | null => process.env.AI_API_KEY?.trim() || null;

export const getAiBaseUrl = (): string | null => process.env.AI_BASE_URL?.trim() || null;

export const getAiModel = (): string | null => process.env.AI_MODEL_NAME?.trim() || null;
