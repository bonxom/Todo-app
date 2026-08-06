import { authService } from '../services/authService.js';

export const registerUser = async (req, res, next) => {
  try {
    const { user, accessToken, refreshToken, token } = await authService.register(req.validatedBody);
    res.status(201).json({ message: 'Registration successful', user, accessToken, refreshToken, token });
  } catch (error) {
    next(error);
  }
};

export const loginUser = async (req, res, next) => {
  try {
    const { user, accessToken, refreshToken, token } = await authService.login(
      req.validatedBody.email,
      req.validatedBody.password
    );
    res.status(200).json({ message: 'Login successful', user, accessToken, refreshToken, token });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const refreshTokenString = req.validatedBody?.refreshToken || req.body?.refreshToken;
    const tokens = await authService.refreshToken(refreshTokenString);
    res.status(200).json({ message: 'Token refreshed successfully', ...tokens });
  } catch (error) {
    next(error);
  }
};

export const logoutUser = async (req, res, next) => {
  try {
    const refreshTokenString = req.body?.refreshToken;
    const userId = req.user?._id;
    await authService.logout(refreshTokenString, userId);
    res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user._id);
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    await authService.changePassword(
      req.user._id,
      req.validatedBody.currentPassword,
      req.validatedBody.newPassword
    );
    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
};

export const updateInfo = async (req, res, next) => {
  try {
    const user = await authService.updateInfo(req.user._id, req.body);
    res.status(200).json({ message: 'User info updated successfully', user });
  } catch (error) {
    next(error);
  }
};

export const selfDelete = async (req, res, next) => {
  try {
    await authService.selfDelete(req.user._id);
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};
