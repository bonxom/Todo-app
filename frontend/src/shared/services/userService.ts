import axiosInstance, { type RequestOptions } from "./httpClient";
import type { UpdateProfilePayload, User } from "../types/domain";

export const userService = {
  createUser: async (userData: unknown): Promise<User> => {
    const response = await axiosInstance.post<User>("/api/users", userData);
    return response.data;
  },

  // Get all users (Admin only)
  getAllUsers: async (options?: RequestOptions): Promise<User[]> => {
    const response = await axiosInstance.get<User[]>("/api/users", options);
    return response.data;
  },

  // Get user by ID (Admin only)
  getUserById: async (userId: string, options?: RequestOptions): Promise<User> => {
    const response = await axiosInstance.get<User>(`/api/users/${userId}`, options);
    return response.data;
  },

  // Update user (Admin only)
  updateUser: async (userId: string, userData: UpdateProfilePayload): Promise<User> => {
    const response = await axiosInstance.put<User>(`/api/users/${userId}`, userData);
    return response.data;
  },

  // Delete user (Admin only)
  deleteUser: async (userId: string): Promise<unknown> => {
    const response = await axiosInstance.delete(`/api/users/${userId}`);
    return response.data;
  },
};
