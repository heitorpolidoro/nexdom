import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { TaskStatus, TaskPriority } from "../types";
import TaskList from "./TaskList";
import TaskForm from "./TaskForm";
import TaskDetailsView from "./TaskDetailsView";
import { useTasks } from "../hooks/useTasks";
import { Button } from "../../../components/ui/button";
import { Select } from "../../../components/ui/select";
import { Plus } from "lucide-react";

const TaskDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<{
    status: TaskStatus | null;
    priority: TaskPriority | null;
  }>({ status: null, priority: null });

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const { data: tasks, isLoading, isError, error } = useTasks(filters);

  const selectedTask = tasks?.find((t) => t.id === selectedTaskId);

  const handleFilterChange = (
    filterType: "status" | "priority",
    value: TaskStatus | TaskPriority | null,
  ) => {
    setFilters((prev) => ({ ...prev, [filterType]: value }));
  };

  const clearFilters = () => setFilters({ status: null, priority: null });

  const handleTaskClick = (taskId: string) => {
    setSelectedTaskId(taskId);
    setIsEditing(false);
    setIsCreating(false);
  };

  const handleCreateNewTask = () => {
    setIsCreating(true);
    setSelectedTaskId(null);
    setIsEditing(false);
  };

  const handleEditTask = () => setIsEditing(true);

  const handleCloseOverlay = () => {
    setSelectedTaskId(null);
    setIsCreating(false);
    setIsEditing(false);
  };

  const handleOverlayKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") handleCloseOverlay();
  };

  const showModal = isCreating || !!selectedTask;

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      PENDING: t("tasks.details.statusPending"),
      IN_PROGRESS: t("tasks.details.statusInProgress"),
      COMPLETED: t("tasks.details.statusCompleted"),
      CANCELED: t("tasks.details.statusCanceled"),
    };
    return map[status] || status;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          {t("tasks.dashboard.title")}
        </h1>
        <Button onClick={handleCreateNewTask}>
          <Plus className="size-4" />
          {t("tasks.dashboard.newTask")}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 p-4 rounded-lg border bg-muted/30">
        <Select
          value={filters.status ?? ""}
          onChange={(e) =>
            handleFilterChange("status", (e.target.value as TaskStatus) || null)
          }
          className="w-40"
        >
          <option value="">{t("tasks.dashboard.allStatuses")}</option>
          {Object.values(TaskStatus).map((s) => (
            <option key={s} value={s}>
              {getStatusLabel(s)}
            </option>
          ))}
        </Select>

        <Select
          value={filters.priority ?? ""}
          onChange={(e) =>
            handleFilterChange(
              "priority",
              (e.target.value as TaskPriority) || null,
            )
          }
          className="w-40"
        >
          <option value="">{t("tasks.dashboard.allPriorities")}</option>
          {Object.values(TaskPriority).map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>

        {(filters.status || filters.priority) && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            {t("tasks.dashboard.clearFilters")}
          </Button>
        )}
      </div>

      {/* Task list */}
      <TaskList
        tasks={tasks || []}
        isLoading={isLoading}
        isError={isError}
        error={error}
        filters={filters}
        onTaskClick={handleTaskClick}
      />

      {/* Modal overlay */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={handleCloseOverlay}
          onKeyDown={handleOverlayKeyDown}
          tabIndex={0}
          role="button"
          aria-label={t("tasks.dashboard.closeModal")}
        >
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="document"
            tabIndex={-1}
          >
            {isCreating && (
              <TaskForm
                onCancel={handleCloseOverlay}
                onSuccess={handleCloseOverlay}
              />
            )}
            {selectedTask && !isEditing && (
              <TaskDetailsView
                task={selectedTask}
                onClose={handleCloseOverlay}
                onEdit={handleEditTask}
              />
            )}
            {selectedTask && isEditing && (
              <TaskForm
                task={selectedTask}
                onCancel={() => setIsEditing(false)}
                onSuccess={handleCloseOverlay}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskDashboard;
