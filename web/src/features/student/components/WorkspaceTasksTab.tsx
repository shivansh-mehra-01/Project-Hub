"use client";

import React, { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/design-system/components/Badge";
import { Button } from "@/design-system/components/Button";
import { Input } from "@/design-system/components/Input";
import { Modal } from "@/design-system/components/Modal";
import { ConfirmationDialog } from "@/design-system/patterns/PageStates";
import { studentApi } from "@/lib/api/studentApi";
import { ProjectProgressDto, SprintTaskDto, SprintTaskStatus, TeamMemberDto } from "@/lib/api/types";
import { showToast } from "@/lib/toast";
import { computeMemberTaskContributions } from "@/features/shared/projectLifecycleHelpers";

export interface WorkspaceTasksTabProps {
  tasks: SprintTaskDto[];
  progress: ProjectProgressDto | null;
  members: TeamMemberDto[];
  isTeamLead: boolean;
  onRefreshTasks: () => Promise<void>;
}

const COLUMNS: { key: SprintTaskStatus; label: string }[] = [
  { key: "Todo", label: "To Do" },
  { key: "InProgress", label: "In Progress" },
  { key: "Done", label: "Done" },
];

export const WorkspaceTasksTab: React.FC<WorkspaceTasksTabProps> = ({
  tasks,
  progress,
  members,
  isTeamLead,
  onRefreshTasks,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<SprintTaskDto | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskTag, setTaskTag] = useState("Development");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskAssigneeId, setTaskAssigneeId] = useState("");
  const [creating, setCreating] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<SprintTaskDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Task edit state (when Team Lead opens Task Details)
  const [editTitle, setEditTitle] = useState("");
  const [editTag, setEditTag] = useState("Development");
  const [editDueDate, setEditDueDate] = useState("");
  const [editAssigneeId, setEditAssigneeId] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const openTaskDetails = (task: SprintTaskDto) => {
    setSelectedTask(task);
    setEditTitle(task.title);
    setEditTag(task.categoryTag || "Development");
    setEditDueDate(task.dueDateUtc ? task.dueDateUtc.split("T")[0] : "");
    setEditAssigneeId(task.assignedToUserId || "");
  };

  const handleSaveTaskEdit = async () => {
    if (!selectedTask || !isTeamLead) return;
    if (editTitle.trim().length < 3) {
      showToast("Task title must be at least 3 characters.", "error");
      return;
    }
    setSavingEdit(true);
    try {
      await studentApi.updateWorkspaceTask(selectedTask.id, {
        title: editTitle.trim(),
        categoryTag: editTag,
        assignedToUserId: editAssigneeId || undefined,
        dueDateUtc: editDueDate ? new Date(editDueDate).toISOString() : undefined,
      });
      showToast("Task updated.", "success");
      setSelectedTask(null);
      await onRefreshTasks();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to update task.", "error");
    } finally {
      setSavingEdit(false);
    }
  };

  const totalCount = progress?.totalTasks ?? tasks.length;
  const completedCount = progress?.completedTasks ?? tasks.filter((t) => t.status === "Done").length;
  const completionPct =
    progress?.completionPercentage ?? (totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0);

  const handleCreateTask = async () => {
    if (taskTitle.trim().length < 3) {
      showToast("Task title must be at least 3 characters.", "error");
      return;
    }
    setCreating(true);
    try {
      await studentApi.createWorkspaceTask({
        title: taskTitle.trim(),
        categoryTag: taskTag,
        assignedToUserId: taskAssigneeId || undefined,
        dueDateUtc: taskDueDate ? new Date(taskDueDate).toISOString() : undefined,
      });
      setShowCreateModal(false);
      setTaskTitle("");
      setTaskDueDate("");
      setTaskAssigneeId("");
      showToast("Task created.", "success");
      await onRefreshTasks();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to create task.", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (taskId: string, status: SprintTaskStatus) => {
    try {
      await studentApi.updateTaskStatus(taskId, { status });
      await onRefreshTasks();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to update status.", "error");
    }
  };

  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    setDeleting(true);
    try {
      await studentApi.deleteWorkspaceTask(taskToDelete.id);
      showToast("Task deleted.", "success");
      setTaskToDelete(null);
      await onRefreshTasks();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to delete task.", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Compact Progress Header */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-bold text-slate-900">Sprint Tasks</span>
          <Badge variant={completionPct >= 100 ? "success" : "neutral"} size="sm">
            {completedCount}/{totalCount} Done ({completionPct}%)
          </Badge>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex-1 sm:w-44 bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-brand-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, completionPct)}%` }}
            />
          </div>
          {isTeamLead && (
            <Button
              size="sm"
              variant="primary"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setShowCreateModal(true)}
            >
              New Task
            </Button>
          )}
        </div>
      </div>

      {/* Individual Contribution Summary */}
      {members.length > 0 && (
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2">
          <div className="text-xs font-bold text-slate-800">Individual Task Contributions</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {computeMemberTaskContributions(members, tasks).map((contrib) => (
              <div
                key={contrib.userId}
                className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/70 text-xs flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 truncate">
                    {contrib.fullName}
                    {contrib.isTeamLead ? " (Lead)" : ""}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {contrib.completedCount}/{contrib.assignedCount} completed
                  </div>
                </div>
                <Badge
                  variant={
                    contrib.assignedCount > 0 && contrib.completedCount === contrib.assignedCount
                      ? "success"
                      : "neutral"
                  }
                  size="sm"
                >
                  {contrib.completionPercentage}%
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3-Column Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.key);
          return (
            <div key={col.key} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-slate-800">{col.label}</span>
                <span className="text-[11px] bg-white px-2 py-0.5 rounded-full border border-slate-200 text-slate-600 tabular-nums">
                  {colTasks.length}
                </span>
              </div>

              <div className="space-y-2 min-h-[180px]">
                {colTasks.length === 0 ? (
                  <div className="h-24 flex items-center justify-center text-[11px] text-slate-400 border border-dashed border-slate-200 rounded-lg">
                    No tasks
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => openTaskDetails(task)}
                      className="p-3 bg-white rounded-lg border border-slate-200 hover:border-brand-primary transition-colors cursor-pointer space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2 text-[10px]">
                        <span className="font-semibold text-brand-primary bg-brand-primary-tint px-1.5 py-0.5 rounded">
                          {task.categoryTag || "Task"}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {task.isOverdue && (
                            <span className="font-bold text-rose-700 bg-rose-50 px-1 py-0.5 rounded">
                              Overdue
                            </span>
                          )}
                          {task.dueDateUtc && (
                            <span className="text-slate-400 tabular-nums">
                              {task.dueDateUtc.split("T")[0]}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-xs font-semibold text-slate-900 leading-snug">{task.title}</div>

                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[11px] text-slate-500">
                        <span className="truncate max-w-[120px]">{task.assigneeName || "Unassigned"}</span>
                        <div className="flex items-center gap-1">
                          <select
                            value={task.status}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleStatusChange(task.id, e.target.value as SprintTaskStatus);
                            }}
                            className="text-[10px] font-semibold rounded px-1.5 py-0.5 border border-slate-200 bg-slate-50 text-slate-700 cursor-pointer"
                          >
                            <option value="Todo">To Do</option>
                            <option value="InProgress">In Progress</option>
                            <option value="Done">Done</option>
                          </select>
                          {isTeamLead && task.status !== "Done" && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTaskToDelete(task);
                              }}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded cursor-pointer"
                              title="Delete task"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Task Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="New Sprint Task"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="secondary" size="sm" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateTask} isLoading={creating}>
              Create Task
            </Button>
          </div>
        }
      >
        <div className="space-y-3.5 text-xs">
          <Input
            label="Task Title"
            placeholder="e.g. Implement API authentication"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Category</label>
              <select
                value={taskTag}
                onChange={(e) => setTaskTag(e.target.value)}
                className="w-full h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs"
              >
                <option value="Development">Development</option>
                <option value="Hardware">Hardware</option>
                <option value="Firmware">Firmware</option>
                <option value="Backend">Backend</option>
                <option value="Frontend">Frontend</option>
                <option value="ML">ML / Data</option>
                <option value="Testing">Testing</option>
                <option value="Docs">Documentation</option>
              </select>
            </div>
            <Input
              label="Due Date"
              type="date"
              value={taskDueDate}
              onChange={(e) => setTaskDueDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Assignee</label>
            <select
              value={taskAssigneeId}
              onChange={(e) => setTaskAssigneeId(e.target.value)}
              className="w-full h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs"
            >
              <option value="">Unassigned (or self)</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.fullName} {m.isTeamLead ? "(Lead)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      {/* Task Details Modal */}
      <Modal
        isOpen={Boolean(selectedTask)}
        onClose={() => setSelectedTask(null)}
        title="Task Details"
        footer={
          <div className="flex items-center justify-between w-full">
            <select
              value={selectedTask?.status || "Todo"}
              onChange={async (e) => {
                if (!selectedTask) return;
                const next = e.target.value as SprintTaskStatus;
                await handleStatusChange(selectedTask.id, next);
                setSelectedTask({ ...selectedTask, status: next });
              }}
              className="text-xs font-semibold rounded-lg border border-slate-300 bg-white px-2.5 py-1.5"
            >
              <option value="Todo">To Do</option>
              <option value="InProgress">In Progress</option>
              <option value="Done">Done</option>
            </select>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setSelectedTask(null)}>
                Close
              </Button>
              {isTeamLead && (
                <Button variant="primary" size="sm" onClick={handleSaveTaskEdit} isLoading={savingEdit}>
                  Save Changes
                </Button>
              )}
            </div>
          </div>
        }
      >
        {selectedTask && (
          <div className="space-y-3 text-xs">
            {isTeamLead ? (
              <>
                <Input
                  label="Task Title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Category</label>
                    <select
                      value={editTag}
                      onChange={(e) => setEditTag(e.target.value)}
                      className="w-full h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs"
                    >
                      <option value="Development">Development</option>
                      <option value="Hardware">Hardware</option>
                      <option value="Firmware">Firmware</option>
                      <option value="Backend">Backend</option>
                      <option value="Frontend">Frontend</option>
                      <option value="ML">ML / Data</option>
                      <option value="Testing">Testing</option>
                      <option value="Docs">Documentation</option>
                    </select>
                  </div>
                  <Input
                    label="Due Date"
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Assignee</label>
                  <select
                    value={editAssigneeId}
                    onChange={(e) => setEditAssigneeId(e.target.value)}
                    className="w-full h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs"
                  >
                    <option value="">Unassigned (or self)</option>
                    {members.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.fullName} {m.isTeamLead ? "(Lead)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <>
                <div className="text-sm font-bold text-slate-900">{selectedTask.title}</div>
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-500 block">Category</span>
                    <span className="font-semibold text-slate-900">{selectedTask.categoryTag || "Task"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Due Date</span>
                    <span className="font-semibold text-slate-900">
                      {selectedTask.dueDateUtc ? selectedTask.dueDateUtc.split("T")[0] : "None"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Assignee</span>
                    <span className="font-semibold text-slate-900">{selectedTask.assigneeName || "Unassigned"}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Status</span>
                    <span className="font-semibold text-slate-900">{selectedTask.status}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      <ConfirmationDialog
        isOpen={Boolean(taskToDelete)}
        onClose={() => setTaskToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Sprint Task"
        description={`Are you sure you want to delete "${taskToDelete?.title || ""}"? This action cannot be undone.`}
        confirmText="Delete Task"
        variant="danger"
        isLoading={deleting}
      />
    </div>
  );
};
