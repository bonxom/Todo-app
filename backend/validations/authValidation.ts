import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required').max(100),
  dob: z.string().min(1, 'Date of birth is required'),
  nationality: z.string().max(100).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

const optionalRefreshTokenBodySchema = z.object({
  refreshToken: z.string().optional(),
});

export const refreshTokenSchema = z.preprocess(
  (value) => value === undefined ? {} : value,
  optionalRefreshTokenBodySchema
);

export const logoutSchema = refreshTokenSchema;

export const updateInfoSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).max(100).optional(),
  dob: z.string().optional(),
  nationality: z.string().max(100).optional(),
  avatarUrl: z.string().url().or(z.literal('')).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
