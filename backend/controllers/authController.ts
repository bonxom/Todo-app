import type { Request, Response } from 'express';
import { authService } from '../services/authService.js';

export const registerUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { user, accessToken, refreshToken, token } = await authService.register(
    req.validatedBody as Record<string, unknown>
  );
  res.status(201).json({ message: 'Registration successful', user, accessToken, refreshToken, token });
};

export const loginUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  const body = req.validatedBody as Record<string, unknown>;
  const { user, accessToken, refreshToken, token } = await authService.login(
    body.email as string,
    body.password as string
  );
  res.status(200).json({ message: 'Login successful', user, accessToken, refreshToken, token });
};

export const refreshToken = async (
  req: Request,
  res: Response
): Promise<void> => {
  const body = req.validatedBody as Record<string, unknown>;
  const refreshTokenString = body.refreshToken as string | undefined;
  const tokens = await authService.refreshToken(refreshTokenString);
  res.status(200).json({ message: 'Token refreshed successfully', ...tokens });
};

export const logoutUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  const refreshTokenString = req.validatedBody?.refreshToken as string | undefined;
  await authService.logout(refreshTokenString);
  res.status(200).json({ message: 'Logout successful' });
};

export const getMe = async (
  req: Request,
  res: Response
): Promise<void> => {
  const user = await authService.getMe(req.user!._id);
  res.status(200).json(user);
};

export const changePassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  const body = req.validatedBody as Record<string, unknown>;
  await authService.changePassword(
    req.user!._id,
    body.currentPassword as string,
    body.newPassword as string
  );
  res.status(200).json({ message: 'Password changed successfully' });
};

export const updateInfo = async (
  req: Request,
  res: Response
): Promise<void> => {
  const user = await authService.updateInfo(
    req.user!._id,
    req.validatedBody as Record<string, unknown>
  );
  res.status(200).json({ message: 'User info updated successfully', user });
};

export const selfDelete = async (
  req: Request,
  res: Response
): Promise<void> => {
  await authService.selfDelete(req.user!._id);
  res.status(200).json({ message: 'User deleted successfully' });
};
