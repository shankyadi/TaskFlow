
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock3,
  Filter,
  FolderKanban,
  GripVertical,
  MessageCircle,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import api from "../api";
import { useAuth } from "../Context/useAuth";
import TaskModal from "../components/TaskModal";

const COLUMNS = [
  {
    id: "TODO",
    name: "To do",
    subtitle: "Ready to get started",
    Icon: Circle,
    color: "#85858f",
    soft: "#f1f1f4",
    bar: "#a1a1aa",
  },
  {
    id: "IN_PROGRESS",
    name: "In progress",
    subtitle: "Currently being worked on",
    Icon: Clock3,
    color: "#2563eb",
    soft: "#eaf1ff",
    bar: "#3b82f6",
  },
  {
    id: "DONE",
    name: "Completed",
    subtitle: "Finished work",
    Icon: CheckCircle2,
    color: "#059669",
    soft: "#e5f9f0",
    bar: "#10b981",
  },
];

const PRIORITIES = {
  LOW: {
    label: "Low",
    dot: "#10b981",
    className: "bg-emerald-50 text-emerald-700",
  },
  MEDIUM: {
    label: "Medium",
    dot: "#f59e0b",
    className: "bg-amber-50 text-amber-700",
  },
  HIGH: {
    label: "High",
    dot: "#f43f5e",
    className: "bg-rose-50 text-rose-700",
  },
};

const PRIORITY_ORDER = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

function sortTasks(tasks, status) {
  const now = new Date();

  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  const getDate = (task) =>
    task.dueDate
      ? String(task.dueDate).slice(0, 10)
      : null;

  const comparePriority = (a, b) =>
    (PRIORITY_ORDER[a.priority] ?? 3) -
    (PRIORITY_ORDER[b.priority] ?? 3);

  const compareDueDate = (a, b) => {
    const dateA = getDate(a);
    const dateB = getDate(b);

    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;

    return dateA.localeCompare(dateB);
  };

  const compareCreatedAt = (a, b) =>
    String(b.createdAt || "").localeCompare(
      String(a.createdAt || "")
    );

  return [...tasks].sort((a, b) => {
    if (status === "TODO") {
      return (
        comparePriority(a, b) ||
        compareDueDate(a, b) ||
        compareCreatedAt(a, b)
      );
    }

    if (status === "IN_PROGRESS") {
      const overdueA =
        getDate(a) && getDate(a) < today ? 1 : 0;

      const overdueB =
        getDate(b) && getDate(b) < today ? 1 : 0;

      return (
        overdueB - overdueA ||
        compareDueDate(a, b) ||
        comparePriority(a, b) ||
        compareCreatedAt(a, b)
      );
    }

    if (status === "DONE") {
      return (
        String(b.completedAt || "").localeCompare(
          String(a.completedAt || "")
        ) ||
        compareCreatedAt(a, b)
      );
    }

    return 0;
  });
}

const EMPTY_FORM = {
  title: "",
  priority: "MEDIUM",
  labels: "",
  dueDate: "",
};

const fieldClass =
  "h-11 w-full rounded-xl border border-[#e5e5ea] bg-white px-3.5 text-[13px] text-[#29292f] outline-none transition focus:border-[#93b4fa] focus:ring-4 focus:ring-blue-100";

function dueInfo(task) {
  if (!task.dueDate) return null;

  const date = String(task.dueDate).slice(0, 10);
  const now = new Date();

  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  const parsed = new Date(`${date}T12:00:00Z`);

  return {
    text: Number.isNaN(parsed.getTime())
      ? date
      : parsed.toLocaleDateString(undefined, {
          timeZone: "UTC",
          month: "short",
          day: "numeric",
        }),
    overdue: task.status !== "DONE" && date < today,
  };
}

function Avatar({ name }) {
  const initials = String(name || "?")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <span
      title={name}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eaf0fb] text-[10px] font-bold text-[#526895]"
    >
      {initials}
    </span>
  );
}

function PrioritySelect({
  value,
  onChange,
  all = false,
}) {
  const priority = PRIORITIES[value];

  return (
    <div className="relative">
      <span
        className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-2 w-2 -translate-y-1/2 rounded-full"
        style={{
          backgroundColor: priority?.dot || "#a1a1aa",
        }}
      />

      <select
        aria-label="Priority"
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className={`${fieldClass} cursor-pointer appearance-none pl-8 pr-9 font-medium`}
      >
        {all && (
          <option value="">All priorities</option>
        )}
        <option value="LOW">Low priority</option>
        <option value="MEDIUM">Medium priority</option>
        <option value="HIGH">High priority</option>
      </select>

      <ChevronDown
        size={15}
        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#92929d]"
      />
    </div>
  );
}

function TaskCard({
  task,
  canDelete,
  onDelete,
  onOpen,
  recentlyDragged,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: task.id,
  });

  const priority =
    PRIORITIES[task.priority] || PRIORITIES.MEDIUM;

  const due = dueInfo(task);

  const completedDate =
    task.status === "DONE" && task.completedAt
      ? new Date(task.completedAt)
      : null;

  const completedLabel =
    completedDate &&
    !Number.isNaN(completedDate.getTime())
      ? completedDate.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : null;

  const dragStyle = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    zIndex: isDragging ? 1000 : undefined,
    position: "relative",
    touchAction: "none",
  };

  return (
    <article
      ref={setNodeRef}
      style={dragStyle}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (!isDragging && !recentlyDragged()) {
          onOpen(task.id);
        }
      }}
      onKeyDown={(event) => {
        if (
          event.target === event.currentTarget &&
          (event.key === "Enter" ||
            event.key === " ")
        ) {
          event.preventDefault();
          onOpen(task.id);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Open ${task.title}. Drag to change status.`}
      className={`group select-none rounded-[19px] border bg-white p-4 shadow-[0_3px_14px_rgba(20,25,45,0.035)] transition-[box-shadow,border-color] duration-150 ${
        isDragging
          ? "cursor-grabbing border-blue-400 shadow-2xl"
          : "cursor-grab border-[#e9e9ee] hover:border-[#c3d4fb] hover:shadow-[0_10px_30px_rgba(20,25,45,0.09)]"
      } ${
        due?.overdue
          ? "border-l-[3px] border-l-rose-400"
          : ""
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${priority.className}`}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{
              backgroundColor: priority.dot,
            }}
          />
          {priority.label}
        </span>

        <div className="flex items-center gap-1">
          {canDelete && (
            <button
              type="button"
              title="Delete task"
              aria-label={`Delete ${task.title}`}
              onPointerDown={(event) =>
                event.stopPropagation()
              }
              onClick={(event) => {
                event.stopPropagation();
                onDelete(task.id);
              }}
              className="rounded-lg p-1.5 text-[#b4b4bd] transition hover:bg-rose-50 hover:text-rose-600"
            >
              <Trash2 size={15} />
            </button>
          )}

          <GripVertical
            size={17}
            className="text-[#b4b4bd]"
            aria-hidden="true"
          />
        </div>
      </div>

      <h3 className="text-[14px] font-semibold leading-5 text-[#24242b]">
        {task.title}
      </h3>

      {task.description && (
        <p className="mt-2 line-clamp-2 text-[12px] leading-5 text-[#93939e]">
          {task.description}
        </p>
      )}

      {task.labels?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {task.labels.map((label) => (
            <span
              key={label}
              className="rounded-md bg-[#f1f3ff] px-2 py-1 text-[10px] font-medium text-[#596db5]"
            >
              #{label}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#f2f2f5] pt-3">
        <div className="flex min-w-0 items-center gap-2">
          {task.assignee ? (
            <Avatar name={task.assignee.name} />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-[#d8d8e0] text-[#aaaab5]">
              <Plus size={13} />
            </span>
          )}

          <span className="truncate text-[11px] text-[#92929c]">
            {task.assignee?.name || "Unassigned"}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-3 text-[11px] text-[#9b9ba5]">
          {due && (
            <span
              title={
                due.overdue ? "Overdue" : "Due date"
              }
              className={`inline-flex items-center gap-1 ${
                due.overdue
                  ? "font-semibold text-rose-600"
                  : ""
              }`}
            >
              <CalendarDays size={13} />
              {due.text}
            </span>
          )}

          <span className="inline-flex items-center gap-1">
            <MessageCircle size={13} />
            {task._count?.comments ?? 0}
          </span>
        </div>
      </div>

      {completedLabel && (
        <div className="mt-2 flex items-center gap-1.5 pl-1 text-[11px] font-medium text-emerald-700">
          <CheckCircle2 size={13} />
          <span>Completed {completedLabel}</span>
        </div>
      )}
    </article>
  );
}

function Column({
  column,
  tasks,
  canDelete,
  onDelete,
  onOpen,
  recentlyDragged,
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const Icon = column.Icon;

  return (
    <section
      ref={setNodeRef}
      className={`flex min-h-100 min-w-0 flex-col rounded-[25px] border p-3.5 transition-colors ${
        isOver
          ? "border-blue-300 bg-[#eaf1ff]"
          : "border-[#e9e9ef] bg-[#f8f8fa]"
      }`}
    >
      <div className="mb-4 flex items-center justify-between gap-2 px-1 pt-1">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{
              backgroundColor: column.soft,
              color: column.color,
            }}
          >
            <Icon size={18} strokeWidth={1.8} />
          </span>

          <div>
            <h2 className="text-[14px] font-semibold text-[#29292f]">
              {column.name}
            </h2>
            <p className="mt-0.5 text-[10px] text-[#a1a1ab]">
              {column.subtitle}
            </p>
          </div>
        </div>

        <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-white px-2 text-[11px] font-bold text-[#777783] shadow-sm">
          {tasks.length}
        </span>
      </div>

      <div
        className="mb-4 h-1 rounded-full"
        style={{
          backgroundColor: column.bar,
          opacity: 0.7,
        }}
      />

      <div className="flex flex-1 flex-col gap-3">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            canDelete={canDelete}
            onDelete={onDelete}
            onOpen={onOpen}
            recentlyDragged={recentlyDragged}
          />
        ))}

        {tasks.length === 0 && (
          <div
            className={`flex min-h-38 flex-1 flex-col items-center justify-center rounded-[18px] border border-dashed px-4 text-center ${
              isOver
                ? "border-blue-300 bg-white/70"
                : "border-[#e2e2e8] bg-white/40"
            }`}
          >
            <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#a3a3ae]">
              <Icon size={19} />
            </span>

            <p className="text-[12px] font-medium text-[#777783]">
              No tasks here
            </p>

            <p className="mt-1 text-[11px] text-[#a4a4ae]">
              Drop a task here
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export default function Board() {
  const { id: projectId } = useParams();
  const { user, logout } = useAuth();

  const isManager = [
    "ADMIN",
    "PROJECT_MANAGER",
  ].includes(user?.role);

  const [tasks, setTasks] = useState([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [priorityFilter, setPriorityFilter] =
    useState("");
  const [labelFilter, setLabelFilter] =
    useState("");
  const [search, setSearch] = useState("");

  const [form, setForm] = useState(EMPTY_FORM);
  const [showCreate, setShowCreate] =
    useState(false);
  const [creating, setCreating] = useState(false);

  const [openId, setOpenId] = useState(null);
  const [projectName, setProjectName] =
    useState("");
  const [draggingId, setDraggingId] =
    useState(null);

  const lastDragEnd = useRef(0);

  const recentlyDragged = () =>
    Date.now() - lastDragEnd.current < 300;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const load = useCallback(async () => {
    try {
      const response = await api.get("/tasks", {
        params: {
          projectId,
          limit: 100,
          ...(priorityFilter && {
            priority: priorityFilter,
          }),
          ...(labelFilter.trim() && {
            label: labelFilter.trim(),
          }),
        },
      });

      setTasks(response.data.items || []);
      setTotal(response.data.total || 0);
      setError("");
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
      } else {
        setError(
          "Could not load tasks. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [
    projectId,
    priorityFilter,
    labelFilter,
    logout,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);

    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    let cancelled = false;

    api
      .get("/projects")
      .then((response) => {
        if (!cancelled) {
          const project = response.data.find(
            (item) => item.id === projectId
          );

          setProjectName(project?.name || "");
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const addTask = async (event) => {
    event.preventDefault();

    if (creating || !form.title.trim()) return;

    setCreating(true);
    setError("");

    try {
      await api.post("/tasks", {
        title: form.title.trim(),
        priority: form.priority,
        labels: form.labels
          .split(",")
          .map((label) => label.trim())
          .filter(Boolean),
        dueDate: form.dueDate || null,
        projectId,
      });

      setForm(EMPTY_FORM);
      setShowCreate(false);

      await load();
    } catch {
      setError(
        "Could not create task. Check the title and try again."
      );
    } finally {
      setCreating(false);
    }
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm("Delete this task?")) {
      return;
    }

    setError("");

    try {
      await api.delete(`/tasks/${taskId}`);
      await load();
    } catch {
      setError("Could not delete task.");
    }
  };

  const onDragEnd = async ({ active, over }) => {
    lastDragEnd.current = Date.now();
    setDraggingId(null);

    if (
      !over ||
      !COLUMNS.some(
        (column) => column.id === over.id
      )
    ) {
      return;
    }

    const task = tasks.find(
      (item) => item.id === active.id
    );

    if (!task || task.status === over.id) {
      return;
    }

    const newStatus = over.id;

    const optimisticCompletedAt =
      newStatus === "DONE"
        ? new Date().toISOString()
        : null;

    setTasks((previous) =>
      previous.map((item) =>
        item.id === task.id
          ? {
              ...item,
              status: newStatus,
              completedAt: optimisticCompletedAt,
            }
          : item
      )
    );

    try {
      const response = await api.patch(
        `/tasks/${task.id}`,
        { status: newStatus }
      );

      setTasks((previous) =>
        previous.map((item) =>
          item.id === task.id
            ? { ...item, ...response.data }
            : item
        )
      );
    } catch (err) {
      setTasks((previous) =>
        previous.map((item) =>
          item.id === task.id
            ? {
                ...item,
                status: task.status,
                completedAt: task.completedAt,
              }
            : item
        )
      );

      setError(
        err.response?.status === 403
          ? "You do not have permission to move this task."
          : "Could not move task. Please try again."
      );
    }
  };

  const visibleTasks = tasks.filter((task) =>
    task.title
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  );

  const overdueCount = visibleTasks.filter(
    (task) => dueInfo(task)?.overdue
  ).length;

  const hasFilters = Boolean(
    priorityFilter || labelFilter || search
  );

  const clearFilters = () => {
    setPriorityFilter("");
    setLabelFilter("");
    setSearch("");
  };

  return (
    <main className="mx-auto w-full max-w-400 px-5 pb-20 pt-9 sm:px-8 lg:px-12 lg:pt-12">
      <Link
        to="/"
        className="mb-7 inline-flex items-center gap-2 text-[12px] font-medium text-[#8b8b96] transition hover:text-[#2563eb]"
      >
        <ArrowLeft size={15} />
        All projects
      </Link>

      <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[19px] border border-[#e4e9f4] bg-linear-to-br from-white to-[#eaf1ff] text-[#2563eb] shadow-sm">
            <FolderKanban
              size={25}
              strokeWidth={1.7}
            />
          </div>

          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[1.5px] text-[#9b9ba5]">
              Project workspace
            </p>

            <h1 className="wrap-break-word text-[28px] font-bold tracking-[-1.2px] text-[#1d1d1f] sm:text-[34px]">
              {projectName || "Workflow board"}
            </h1>

            <p className="mt-1 text-[12px] text-[#92929c]">
              Organize your work, one task at a time.
            </p>
          </div>
        </div>

        {isManager && (
          <button
            type="button"
            onClick={() =>
              setShowCreate((value) => !value)
            }
            className="inline-flex self-start items-center gap-2 rounded-full bg-[#1d1d1f] px-5 py-3 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#35353a] sm:self-auto"
          >
            {showCreate ? (
              <X size={16} />
            ) : (
              <Plus size={16} />
            )}

            {showCreate ? "Close" : "New task"}
          </button>
        )}
      </div>

      {isManager && showCreate && (
        <form
          onSubmit={addTask}
          className="mb-7 rounded-[24px] border border-[#e7e7ed] bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="mb-5">
            <h2 className="text-[16px] font-semibold text-[#29292f]">
              Create a task
            </h2>

            <p className="mt-1 text-[12px] text-[#9999a3]">
              Add the details now. You can edit them later.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="mb-2 block text-[11px] font-semibold text-[#666670]">
                Task title
              </span>

              <input
                className={fieldClass}
                placeholder="What needs to get done?"
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                required
                maxLength={200}
              />
            </label>

            <label>
              <span className="mb-2 block text-[11px] font-semibold text-[#666670]">
                Priority
              </span>

              <PrioritySelect
                value={form.priority}
                onChange={(priority) =>
                  setForm((current) => ({
                    ...current,
                    priority,
                  }))
                }
              />
            </label>

            <label>
              <span className="mb-2 block text-[11px] font-semibold text-[#666670]">
                Due date
              </span>

              <input
                className={fieldClass}
                type="date"
                value={form.dueDate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    dueDate: event.target.value,
                  }))
                }
              />
            </label>

            <label className="sm:col-span-2">
              <span className="mb-2 block text-[11px] font-semibold text-[#666670]">
                Labels
              </span>

              <input
                className={fieldClass}
                placeholder="design, frontend, urgent (comma separated)"
                value={form.labels}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    labels: event.target.value,
                  }))
                }
              />
            </label>
          </div>

          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="rounded-full border border-[#e5e5ea] px-5 py-2.5 text-[12px] font-semibold text-[#666670] hover:bg-[#f7f7f9]"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={creating}
              className="rounded-full bg-[#2563eb] px-5 py-2.5 text-[12px] font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-60"
            >
              {creating
                ? "Creating..."
                : "Create task"}
            </button>
          </div>
        </form>
      )}

      <div className="mb-6 rounded-[22px] border border-[#e9e9ed] bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              size={17}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a0a0aa]"
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search tasks..."
              aria-label="Search tasks"
              className={`${fieldClass} pl-10`}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Filter
              size={16}
              className="text-[#9999a3]"
            />

            <div className="min-w-42 flex-1">
              <PrioritySelect
                value={priorityFilter}
                onChange={setPriorityFilter}
                all
              />
            </div>

            <input
              aria-label="Filter by label"
              value={labelFilter}
              onChange={(event) =>
                setLabelFilter(event.target.value)
              }
              placeholder="Filter by label"
              className={`${fieldClass} w-42`}
            />

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-[12px] font-semibold text-[#2563eb] hover:bg-blue-50"
              >
                <X size={13} />
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[#f1f1f4] pt-4 text-[11px] text-[#92929c]">
          <span className="rounded-full bg-[#f1f4ff] px-3 py-1.5 font-semibold text-[#4264bd]">
            {hasFilters
              ? `${visibleTasks.length} shown`
              : `${total} tasks`}
          </span>

          {overdueCount > 0 && (
            <span className="inline-flex items-center gap-1 font-semibold text-rose-600">
              <CalendarDays size={13} />
              {overdueCount} overdue
            </span>
          )}

          <span className="ml-auto hidden sm:inline">
            Click a card to open · Drag anywhere to
            change status
          </span>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-[13px] text-rose-700"
        >
          {error}
        </div>
      )}

      {loading && (
        <div className="mb-5 text-[13px] text-[#92929c]">
          Loading tasks...
        </div>
      )}

      <DndContext
        sensors={sensors}
        onDragStart={({ active }) =>
          setDraggingId(active.id)
        }
        onDragCancel={() => {
          lastDragEnd.current = Date.now();
          setDraggingId(null);
        }}
        onDragEnd={onDragEnd}
      >
        <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-3 lg:gap-5">
          {COLUMNS.map((column) => (
            <Column
              key={column.id}
              column={column}
              tasks={sortTasks(
                visibleTasks.filter(
                  (task) =>
                    task.status === column.id
                ),
                column.id
              )}
              canDelete={isManager}
              onDelete={deleteTask}
              onOpen={setOpenId}
              recentlyDragged={recentlyDragged}
            />
          ))}
        </div>
      </DndContext>

      <p className="mt-8 text-center text-[11px] text-[#aaaab4]">
        TaskFlow · Move ideas forward, beautifully.
      </p>

      {openId && !draggingId && (
        <TaskModal
          taskId={openId}
          isManager={isManager}
          onClose={() => setOpenId(null)}
          onChanged={load}
        />
      )}
    </main>
  );
}
