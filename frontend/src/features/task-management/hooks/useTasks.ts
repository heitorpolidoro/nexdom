import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../../api/client";
import type {
  TaskRead,
  TaskStatus,
  TaskPriority,
  TaskCreate,
  TaskUpdate,
} from "../types";

/**
 * Options for fetching tasks, including various filters.
 */
interface FetchTasksOptions {
  /** Filter by task status. */
  status?: TaskStatus | null;
  /** Filter by task priority. */
  priority?: TaskPriority | null;
  /** Filter by the UUID of the assigned user. */
  assigned_to_id?: string | null;
}

/**
 * Fetches tasks from the API based on provided options.
 *
 * @param options - Filters for status, priority, and assignee.
 * @returns A promise with the list of tasks.
 */
const fetchTasks = async (options: FetchTasksOptions): Promise<TaskRead[]> => {
  const response = await apiClient.get("/tasks/", {
    params: {
      status: options.status,
      priority: options.priority,
      assigned_to_id: options.assigned_to_id,
    },
  });
  return response.data;
};

/**
 * Fetches a single task by its ID.
 *
 * @param id - The UUID of the task to fetch.
 * @returns A promise with the task data.
 */
const fetchTask = async (id: string): Promise<TaskRead> => {
  const response = await apiClient.get(`/tasks/${id}`);
  return response.data;
};

/**
 * Hook to retrieve and manage tasks with filtering.
 *
 * @param options - Filters for the task list.
 * @returns React Query result with task data.
 */
export const useTasks = (options: FetchTasksOptions) => {
  return useQuery<TaskRead[], Error>({
    queryKey: ["tasks", options],
    queryFn: () => fetchTasks(options),
  });
};

/**
 * Hook to retrieve a single task by its ID.
 *
 * @param id - The UUID of the task.
 * @returns React Query result with task data.
 */
export const useTask = (id: string) => {
  return useQuery<TaskRead, Error>({
    queryKey: ["tasks", id],
    queryFn: () => fetchTask(id),
    enabled: !!id,
  });
};

/**
 * Hook to create a new task.
 *
 * @returns React Query mutation result.
 */
export const useCreateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newTask: TaskCreate) => apiClient.post("/tasks/", newTask),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
};

/**
 * Hook to update an existing task.
 *
 * @returns React Query mutation result.
 */
export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TaskUpdate }) =>
      apiClient.patch(`/tasks/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks", id] });
    },
  });
};

/**
 * Fetches the audit history for a specific task.
 *
 * @param taskId - The UUID of the task.
 * @returns A promise with the task history records.
 */
const fetchTaskHistory = async (taskId: string) => {
  const response = await apiClient.get(`/tasks/${taskId}/history`);
  return response.data;
};

/**
 * Hook to retrieve the audit history of a task.
 *
 * @param taskId - The UUID of the task.
 * @returns React Query result with history data.
 */
export const useTaskHistory = (taskId: string) => {
  return useQuery({
    queryKey: ["tasks", taskId, "history"],
    queryFn: () => fetchTaskHistory(taskId),
    enabled: !!taskId,
  });
};

/**
 * Hook to get a function that invalidates the tasks query.
 *
 * @returns A function to invalidate tasks.
 */
export const useInvalidateTasks = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["tasks"] });
};
