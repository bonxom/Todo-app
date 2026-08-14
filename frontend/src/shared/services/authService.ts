import axiosInstance, { type RequestOptions } from "./httpClient";
import { getStoredRefreshToken } from "./authStorage";
import type {
  AuthSession,
  ChangePasswordPayload,
  LoginPayload,
  RegisterPayload,
  UpdateProfilePayload,
  User,
} from "../types/domain";

export const authService = {
  // Register new user (pure HTTP call; caller or mutation sets session)
  register: async (userData: RegisterPayload): Promise<AuthSession> => {
    const response = await axiosInstance.post<AuthSession>("/api/auth/register", userData);
    return response.data;
  },

  // Login user (pure HTTP call; caller or mutation sets session)
  login: async (credentials: LoginPayload): Promise<AuthSession> => {
    const response = await axiosInstance.post<AuthSession>("/api/auth/login", credentials);
    return response.data;
  },

  // Refresh token
  refreshToken: async (refreshToken: string): Promise<AuthSession> => {
    const response = await axiosInstance.post<AuthSession>("/api/auth/refresh", { refreshToken });
    return response.data;
  },

  // Get current user info
  getMe: async (options?: RequestOptions): Promise<User> => {
    const response = await axiosInstance.get<User>("/api/auth/me", options);
    return response.data;
  },

  // Change password
  changePassword: async (passwordData: ChangePasswordPayload): Promise<unknown> => {
    const response = await axiosInstance.put("/api/auth/change-password", passwordData);
    return response.data;
  },

  // Update user info
  updateInfo: async (userData: UpdateProfilePayload): Promise<{ user?: User; [key: string]: unknown }> => {
    const response = await axiosInstance.put<{ user?: User; [key: string]: unknown }>("/api/auth/update-info", userData);
    return response.data;
  },

  // Logout (posts stored refresh token; caller/mutation clears session in finally)
  logout: async (): Promise<unknown> => {
    const refreshToken = getStoredRefreshToken();
    const response = await axiosInstance.post("/api/auth/logout", { refreshToken });
    return response.data;
  },
};
