import axiosInstance, { type RequestOptions } from "./httpClient";
import type { Category, CategoryMutationPayload } from "../types/domain";

export const categoryService = {
  // Create new category
  createCategory: async (categoryData: CategoryMutationPayload): Promise<Category> => {
    const response = await axiosInstance.post<Category>("/api/categories", categoryData);
    return response.data;
  },

  // Get all categories
  getAllCategories: async (options?: RequestOptions): Promise<Category[]> => {
    const response = await axiosInstance.get<Category[]>("/api/categories", options);
    return response.data;
  },

  // Get category by ID
  getCategoryById: async (categoryId: string, options?: RequestOptions): Promise<Category> => {
    const response = await axiosInstance.get<Category>(`/api/categories/${categoryId}`, options);
    return response.data;
  },

  // Update category
  updateCategory: async (categoryId: string, categoryData: CategoryMutationPayload): Promise<Category> => {
    const response = await axiosInstance.put<Category>(`/api/categories/${categoryId}`, categoryData);
    return response.data;
  },

  // Delete category
  deleteCategory: async (categoryId: string): Promise<unknown> => {
    const response = await axiosInstance.delete(`/api/categories/${categoryId}`);
    return response.data;
  },
};
