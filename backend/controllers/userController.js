import { userService } from '../services/userService.js';

export const createUser = async (req, res, next) => {
  try {
    const user = await userService.create(req.validatedBody);
    res.status(201).json({ message: 'User created successfully', user });
  } catch (error) {
    next(error);
  }
};

export const getAllUsers = async (req, res, next) => {
  try {
    const users = await userService.getAll();
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const user = await userService.getById(req.params.id);
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const user = await userService.update(req.params.id, req.validatedBody);
    res.status(200).json({ message: 'User updated successfully', user });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    await userService.delete(req.params.id);
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    await userService.update(req.params.id, { avatarUrl });
    res.status(200).json({ message: 'Avatar uploaded successfully', avatarUrl });
  } catch (error) {
    next(error);
  }
};
