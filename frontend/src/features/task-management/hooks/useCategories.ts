import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../../api/client";
import type { CategoryRead } from "../types";

interface CategoryPayload {
  name: string;
  color: string;
}

const fetchCategories = async (): Promise<CategoryRead[]> => {
  const response = await apiClient.get("/categories/");
  return response.data;
};

export const useCategories = () => {
  return useQuery<CategoryRead[], Error>({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CategoryPayload) => {
      const response = await apiClient.post<CategoryRead>("/categories/", data);
      return response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CategoryPayload> }) => {
      const response = await apiClient.patch<CategoryRead>(`/categories/${id}`, data);
      return response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
};
