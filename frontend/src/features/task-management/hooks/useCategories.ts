import { useQuery } from "@tanstack/react-query";
import apiClient from "../../../api/client";
import type { CategoryRead } from "../types";

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
