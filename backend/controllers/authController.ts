import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService.js';

export const registerUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { user, accessToken, refreshToken, token } = await authService.register(
      req.validatedBody as Record<string, unknown>
    );
    res.status(201).json({ message: 'Registration successful', user, accessToken, refreshToken, token });
  } catch (error) {
    next(error);
  }
};

export const loginUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const body = req.validatedBody as Record<string, unknown>;
    const { user, accessToken, refreshToken, token } = await authService.login(
      body.email as string,
      body.password as string
    );
    res.status(200).json({ message: 'Login successful', user, accessToken, refreshToken, token });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const body = req.validatedBody as Record<string, unknown> | undefined;
    const refreshTokenString = (body?.refreshToken ?? req.body?.refreshToken) as string;
    const tokens = await authService.refreshToken(refreshTokenString);
    res.status(200).json({ message: 'Token refreshed successfully', ...tokens });
  } catch (error) {
    next(error);
  }
};

export const logoutUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const refreshTokenString = req.body?.refreshToken as string | undefined;
    await authService.logout(refreshTokenString);
    res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await authService.getMe(req.user!._id);
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const body = req.validatedBody as Record<string, unknown>;
    await authService.changePassword(
      req.user!._id,
      body.currentPassword as string,
      body.newPassword as string
    );
    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};

export const updateInfo = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await authService.updateInfo(
      req.user!._id,
      req.body as Record<string, unknown>
    );
    res.status(200).json({ message: 'User info updated successfully', user });
  } catch (error) {
    next(error);
  }
};

export const selfDelete = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await authService.selfDelete(req.user!._id);
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};
