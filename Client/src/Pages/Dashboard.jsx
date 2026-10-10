
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "motion/react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  Clock3,
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  LoaderCircle,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from "lucide-react";

import api from "../api";
import { useAuth } from "../Context/useAuth";

/* ---------------------------------------------
   STYLES AND HELPERS
--------------------------------------------- */

const cardThemes = {
  blue: {
    background: "linear-gradient(135deg, #eff6ff, #dbeafe)",
    color: "#2563eb",
  },
  green: {
    background: "linear-gradient(135deg, #ecfdf5, #d1fae5)",
    color: "#059669",
  },
  purple: {
    background: "linear-gradient(135deg, #faf5ff, #ede9fe)",
    color: "#7c3aed",
  },
  orange: {
    background: "linear-gradient(135deg, #fff7ed, #ffedd5)",
    color: "#ea580c",
  },
};

const statusStyles = {
  TODO: "bg-slate-100 text-slate-600",
  IN_PROGRESS: "bg-blue-50 text-blue-700",
  DONE: "bg-emerald-50 text-emerald-700",
};

const priorityStyles = {
  LOW: "bg-emerald-50 text-emerald-700",
  MEDIUM: "bg-amber-50 text-amber-700",
  HIGH: "bg-rose-50 text-rose-700",
};

const detailConfig = {
  total: {
    title: "All tasks",
    subtitle: "Every task across your projects",
    icon: ClipboardList,
    color: "#2563eb",
  },
  completed: {
    title: "Completed tasks",
    subtitle: "Work your team has finished",
    icon: CheckCircle2,
    color: "#059669",
  },
  progress: {
    title: "In progress",
    subtitle: "Tasks currently being worked on",
    icon: Activity,
    color: "#7c3aed",
  },
  overdue: {
    title: "Overdue tasks",
    subtitle: "Unfinished work past its due date",
    icon: Clock3,
    color: "#ea580c",
  },
};

function getLocalToday() {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

function dueInfo(task) {
  if (!task.dueDate) return null;

  const date = String(task.dueDate).slice(0, 10);
  const parsed = new Date(`${date}T12:00:00Z`);

  return {
    text: Number.isNaN(parsed.getTime())
      ? date
      : parsed.toLocaleDateString(undefined, {
          timeZone: "UTC",
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
    overdue:
      date < getLocalToday() && task.status !== "DONE",
  };
}

function formatStatus(status) {
  return String(status || "TODO").replaceAll("_", " ");
}

/* ---------------------------------------------
   REUSABLE DASHBOARD COMPONENTS
--------------------------------------------- */

function SectionHeading({
  icon: Icon,
  title,
  subtitle,
  action,
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f3f4f6] text-[#45454d]">
          <Icon size={19} strokeWidth={1.8} />
        </div>

        <div>
          <h2 className="text-[17px] font-semibold tracking-tight text-[#1d1d1f]">
            {title}
          </h2>

          {subtitle && (
            <p className="mt-1 text-xs text-[#93939c]">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {action}
    </div>
  );
}

function StatCard({
  label,
  value,
  description,
  icon: Icon,
  theme,
  index,
  onClick,
  reducedMotion,
}) {
  const colors = cardThemes[theme];

  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={`View details for ${label}`}
      initial={
        reducedMotion
          ? false
          : { opacity: 0, y: 18 }
      }
      animate={{ opacity: 1, y: 0 }}
      whileHover={
        reducedMotion ? undefined : { y: -4 }
      }
      whileTap={
        reducedMotion ? undefined : { scale: 0.98 }
      }
      transition={{
        duration: reducedMotion ? 0 : 0.4,
        delay: reducedMotion ? 0 : index * 0.06,
      }}
      className="group relative min-h-44 w-full cursor-pointer overflow-hidden rounded-[25px] border border-white/80 p-5 text-left shadow-[0_8px_30px_rgba(30,40,70,0.035)] transition-shadow hover:shadow-[0_16px_40px_rgba(30,40,70,0.10)] focus-visible:outline-2 focus-visible:outline-blue-500 sm:p-6"
      style={{ background: colors.background }}
    >
      <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full border border-white/50" />

      <div className="relative flex items-start justify-between">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/70 shadow-sm"
          style={{ color: colors.color }}
        >
          <Icon size={21} strokeWidth={1.8} />
        </div>

        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/40 text-[#777783] transition-all group-hover:bg-white/80 group-hover:text-[#1d1d1f]">
          <ArrowUpRight size={17} />
        </div>
      </div>

      <div className="relative mt-6">
        <p className="text-xs font-medium text-[#666675]">
          {label}
        </p>

        <p className="mt-1 text-[34px] font-bold tracking-[-1.5px] text-[#1d1d1f]">
          {value}
        </p>

        <p className="mt-1 text-[11px] text-[#777784]">
          {description}
        </p>
      </div>
    </motion.button>
  );
}

function ProgressBar({
  label,
  value = 0,
  max = 0,
  color,
  reducedMotion,
}) {
  const count = Math.max(0, Number(value) || 0);
  const total = Math.max(0, Number(max) || 0);

  const percent = total
    ? Math.min(100, Math.round((count / total) * 100))
    : 0;

  return (
    <div className="mb-6 last:mb-0">
      <div className="mb-3 flex justify-between gap-3 text-[13px]">
        <span className="font-medium text-[#45454d]">
          {label}
        </span>

        <span className="text-[#8d8d96]">
          {count} / {total}
        </span>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-[#f0f0f3]">
        <motion.div
          initial={
            reducedMotion ? false : { width: 0 }
          }
          animate={{ width: `${percent}%` }}
          transition={{
            duration: reducedMotion ? 0 : 0.8,
            ease: "easeOut",
          }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center rounded-[20px] bg-[#fafafa] px-5 py-8 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#a1a1aa] shadow-sm">
        <Icon size={21} />
      </div>

      <p className="text-[13px] font-semibold text-[#45454d]">
        {title}
      </p>

      <p className="mt-2 max-w-xs text-xs leading-5 text-[#a1a1aa]">
        {description}
      </p>
    </div>
  );
}

/* ---------------------------------------------
   TASK ROW INSIDE THE DETAILS PANEL
--------------------------------------------- */

function DetailTaskRow({ task, onClose }) {
  const due = dueInfo(task);

  return (
    <Link
      to={`/projects/${task.projectId}`}
      onClick={onClose}
      className="group flex items-start justify-between gap-3 border-b border-[#f0f0f2] p-4 transition-colors last:border-b-0 hover:bg-[#f8faff]"
    >
      <div className="min-w-0 flex-1">
        <p className="wrap-break-word text-[13px] font-semibold leading-5 text-[#29292f]">
          {task.title}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
              statusStyles[task.status] ||
              statusStyles.TODO
            }`}
          >
            {formatStatus(task.status)}
          </span>

          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
              priorityStyles[task.priority] ||
              priorityStyles.MEDIUM
            }`}
          >
            {task.priority || "MEDIUM"}
          </span>

          {due && (
            <span
              className={`inline-flex items-center gap-1 text-[10px] ${
                due.overdue
                  ? "font-semibold text-red-600"
                  : "text-[#92929b]"
              }`}
            >
              <CalendarDays size={12} />
              {due.text}
            </span>
          )}
        </div>
      </div>

      <ChevronRight
        size={17}
        className="mt-1 shrink-0 text-[#b0b0b8] transition-transform group-hover:translate-x-1"
      />
    </Link>
  );
}

/* ---------------------------------------------
   EXPANDABLE PROJECT SECTION
--------------------------------------------- */

function ProjectDropdown({
  group,
  expanded,
  onToggle,
  view,
  onClose,
  reducedMotion,
}) {
  return (
    <section className="mb-4 overflow-hidden rounded-[20px] border border-[#e8e8ed] bg-white shadow-[0_5px_22px_rgba(0,0,0,0.025)]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-[#f8faff]"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f3f4f8] text-[#777783]">
            <FolderKanban size={17} />
          </div>

          <span className="truncate text-[14px] font-semibold text-[#303036]">
            {group.name}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className="rounded-full bg-[#f3f3f6] px-3 py-1 text-[11px] text-[#85858d]">
            {group.tasks.length}{" "}
            {group.tasks.length === 1
              ? "task"
              : "tasks"}
          </span>

          <motion.div
            animate={{
              rotate: expanded ? 180 : 0,
            }}
            transition={{
              duration: reducedMotion ? 0 : 0.2,
            }}
          >
            <ChevronDown
              size={17}
              className="text-[#9999a3]"
            />
          </motion.div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{
              height: 0,
              opacity: 0,
            }}
            animate={{
              height: "auto",
              opacity: 1,
            }}
            exit={{
              height: 0,
              opacity: 0,
            }}
            transition={{
              duration: reducedMotion ? 0 : 0.28,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="overflow-hidden"
          >
            {view === "tasks" ? (
              <div className="border-t border-[#eeeef1]">
                {group.tasks.map((task) => (
                  <DetailTaskRow
                    key={task.id}
                    task={task}
                    onClose={onClose}
                  />
                ))}
              </div>
            ) : (
              <div className="border-t border-[#eeeef1] p-5">
                <p className="mb-3 text-xs text-[#85858d]">
                  {group.tasks.length} matching{" "}
                  {group.tasks.length === 1
                    ? "task"
                    : "tasks"}{" "}
                  in this project.
                </p>

                <Link
                  to={`/projects/${group.id}`}
                  onClick={onClose}
                  className="inline-flex items-center gap-2 rounded-full bg-[#edf2ff] px-4 py-2.5 text-xs font-semibold text-[#2563eb] transition-colors hover:bg-[#dfe9ff]"
                >
                  Open project board
                  <ArrowRight size={14} />
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/* ---------------------------------------------
   INTERACTIVE DETAILS PANEL
--------------------------------------------- */

function TaskDetailsPanel({
  type,
  onClose,
  reducedMotion,
  logout,
}) {
  const config = detailConfig[type];
  const Icon = config.icon;

  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [view, setView] = useState("tasks");
  const [expandedProjects, setExpandedProjects] =
    useState([]);

  const closePanel = useCallback(() => {
    onClose();
  }, [onClose]);

  /* Load tasks and projects */

  useEffect(() => {
    let cancelled = false;

    async function loadDetails() {
      try {
        const projectResponse = await api.get(
          "/projects"
        );

        const firstResponse = await api.get(
          "/tasks",
          {
            params: {
              page: 1,
              limit: 100,
            },
          }
        );

        const firstPage = firstResponse.data;

        const pages = Math.max(
          1,
          firstPage.pages || 1
        );

        const remainingResponses =
          await Promise.all(
            Array.from(
              { length: pages - 1 },
              (_, index) =>
                api.get("/tasks", {
                  params: {
                    page: index + 2,
                    limit: 100,
                  },
                })
            )
          );

        if (cancelled) return;

        const allTasks = [
          ...firstPage.items,
          ...remainingResponses.flatMap(
            (response) =>
              response.data.items
          ),
        ];

        setTasks(allTasks);
        setProjects(projectResponse.data);
      } catch (err) {
        if (cancelled) return;

        if (err.response?.status === 401) {
          logout();
        } else {
          setError(
            "Could not load task details. Please try again."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDetails();

    return () => {
      cancelled = true;
    };
  }, [logout]);

  /* Close with Escape and lock background scrolling */

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closePanel();
      }
    };

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );

      document.body.style.overflow =
        previousOverflow;
    };
  }, [closePanel]);

  /* Filter tasks based on selected statistic */

  const filteredTasks = tasks.filter((task) => {
    if (type === "completed") {
      return task.status === "DONE";
    }

    if (type === "progress") {
      return task.status === "IN_PROGRESS";
    }

    if (type === "overdue") {
      return dueInfo(task)?.overdue;
    }

    return true;
  });

  /* Group tasks by project */

  const projectMap = new Map(
    projects.map((project) => [
      project.id,
      project.name,
    ])
  );

  const groups = [];

  for (const task of filteredTasks) {
    let group = groups.find(
      (item) => item.id === task.projectId
    );

    if (!group) {
      group = {
        id: task.projectId,
        name:
          projectMap.get(task.projectId) ||
          "Unknown project",
        tasks: [],
      };

      groups.push(group);
    }

    group.tasks.push(task);
  }

  groups.sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  /* Expand or collapse one project */

  const toggleProject = (projectId) => {
    setExpandedProjects((current) =>
      current.includes(projectId)
        ? current.filter(
            (id) => id !== projectId
          )
        : [...current, projectId]
    );
  };

  /* Expand all projects */

  const expandAll = () => {
    setExpandedProjects(
      groups.map((group) => group.id)
    );
  };

  /* Collapse all projects */

  const collapseAll = () => {
    setExpandedProjects([]);
  };

  const allExpanded =
    groups.length > 0 &&
    groups.every((group) =>
      expandedProjects.includes(group.id)
    );

  return (
    <>
      {/* Blurred backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{
          duration: reducedMotion ? 0 : 0.2,
        }}
        onClick={closePanel}
        aria-hidden="true"
        className="fixed inset-0 z-80 bg-[#111827]/35 backdrop-blur-[5px]"
      />

      {/* Sliding panel */}
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-details-heading"
        initial={
          reducedMotion
            ? false
            : { x: "100%", opacity: 0.8 }
        }
        animate={{
          x: 0,
          opacity: 1,
        }}
        exit={
          reducedMotion
            ? { opacity: 0 }
            : { x: "100%", opacity: 0.8 }
        }
        transition={{
          duration: reducedMotion ? 0 : 0.36,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="fixed inset-y-0 right-0 z-90 flex h-dvh min-h-0 w-full max-w-[580px] flex-col overflow-hidden border-l border-white/70 bg-[#f8f8fa] shadow-[-25px_0_80px_rgba(0,0,0,0.12)]"
      >
        {/* Fixed panel header */}
        <div className="shrink-0 border-b border-[#e9e9ee] bg-white/85 px-6 py-6 backdrop-blur-xl sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className="flex h-13 w-13 shrink-0 items-center justify-center rounded-[18px] bg-white shadow-sm"
                style={{
                  color: config.color,
                }}
              >
                <Icon
                  size={25}
                  strokeWidth={1.8}
                />
              </div>

              <div>
                <h2
                  id="task-details-heading"
                  className="text-[23px] font-bold tracking-tight text-[#1d1d1f]"
                >
                  {config.title}
                </h2>

                <p className="mt-1 text-xs text-[#92929b]">
                  {config.subtitle}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={closePanel}
              aria-label="Close task details"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f1f1f4] text-[#6b6b74] transition-colors hover:bg-[#e5e5ea]"
            >
              <X size={19} />
            </button>
          </div>

          {/* Interactive view buttons */}
          {!loading && !error && (
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setView("tasks")}
                aria-pressed={view === "tasks"}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                  view === "tasks"
                    ? "bg-[#edf2ff] text-[#2563eb]"
                    : "bg-[#f1f1f4] text-[#777783] hover:bg-[#e8e8ee]"
                }`}
              >
                {filteredTasks.length}{" "}
                {filteredTasks.length === 1
                  ? "task"
                  : "tasks"}
              </button>

              <button
                type="button"
                onClick={() => setView("projects")}
                aria-pressed={view === "projects"}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${
                  view === "projects"
                    ? "bg-[#edf2ff] text-[#2563eb]"
                    : "bg-[#f1f1f4] text-[#777783] hover:bg-[#e8e8ee]"
                }`}
              >
                {groups.length}{" "}
                {groups.length === 1
                  ? "project"
                  : "projects"}
              </button>
            </div>
          )}
        </div>

        {/* Independently scrollable content */}
        <div
          className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-5 py-6 sm:px-8"
          style={{
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "thin",
          }}
        >
          {loading && (
            <div className="flex min-h-60 items-center justify-center gap-3 text-[13px] text-[#85858d]">
              <LoaderCircle
                size={19}
                className="animate-spin"
              />
              Loading tasks...
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {!loading &&
            !error &&
            groups.length === 0 && (
              <EmptyState
                icon={CheckCircle2}
                title="No tasks to display"
                description="There are currently no tasks matching this category."
              />
            )}

          {!loading &&
            !error &&
            groups.length > 0 && (
              <>
                {/* Expand/collapse controls */}
                <div className="mb-5 flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#a1a1aa]">
                    {view === "tasks"
                      ? "Tasks by project"
                      : "Project overview"}
                  </p>

                  <button
                    type="button"
                    onClick={
                      allExpanded
                        ? collapseAll
                        : expandAll
                    }
                    className="text-[11px] font-semibold text-[#2563eb] hover:underline"
                  >
                    {allExpanded
                      ? "Collapse all"
                      : "Expand all"}
                  </button>
                </div>

                {groups.map((group) => (
                  <ProjectDropdown
                    key={group.id}
                    group={group}
                    expanded={expandedProjects.includes(
                      group.id
                    )}
                    onToggle={() =>
                      toggleProject(group.id)
                    }
                    view={view}
                    onClose={closePanel}
                    reducedMotion={reducedMotion}
                  />
                ))}
              </>
            )}
        </div>

        {/* Fixed footer */}
        <div className="shrink-0 border-t border-[#e9e9ee] bg-white/85 px-6 py-4 text-center text-[11px] text-[#a1a1aa]">
          {view === "tasks"
            ? "Expand a project to view its tasks."
            : "Expand a project to open its board."}
        </div>
      </motion.aside>
    </>
  );
}

/* ---------------------------------------------
   MAIN DASHBOARD
--------------------------------------------- */

export default function Dashboard() {
  const { user, logout } = useAuth();
  const reducedMotion = useReducedMotion();

  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [activeDetails, setActiveDetails] =
    useState(null);

  const closeDetails = useCallback(() => {
    setActiveDetails(null);
  }, []);

  /* Load dashboard statistics */

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        const response = await api.get(
          "/dashboard"
        );

        if (!cancelled) {
          setData(response.data);
          setError("");
        }
      } catch (err) {
        if (cancelled) return;

        if (err.response?.status === 401) {
          logout();
        } else {
          setError(
            "Could not load dashboard."
          );
        }
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [logout]);

  const myTasks = data?.myTasks ?? [];
  const projects = data?.projects ?? [];
  const workload = data?.workload ?? [];

  const myOverdue = myTasks.filter(
    (task) => dueInfo(task)?.overdue
  ).length;

  const firstName =
    user?.name?.trim().split(/\s+/)[0] ||
    "there";

  const stats = data
    ? [
        {
          label: "Total tasks",
          value: data.total ?? 0,
          description: "Across your workspace",
          icon: ClipboardList,
          theme: "blue",
          type: "total",
        },
        {
          label: "Completion rate",
          value: `${data.completion ?? 0}%`,
          description: "View completed tasks",
          icon: CheckCircle2,
          theme: "green",
          type: "completed",
        },
        {
          label: "In progress",
          value:
            data.status?.IN_PROGRESS ?? 0,
          description:
            "Tasks currently active",
          icon: Activity,
          theme: "purple",
          type: "progress",
        },
        {
          label: "Overdue",
          value: data.overdue ?? 0,
          description:
            "Tasks past their due date",
          icon: Clock3,
          theme: "orange",
          type: "overdue",
        },
      ]
    : [];

  return (
    <>
      <main className="mx-auto w-full max-w-362.5 px-5 pb-20 pt-9 sm:px-8 lg:px-12 lg:pt-12">
        {/* Welcome heading */}
        <div className="mb-9 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[19px] border border-[#e4e9f4] bg-linear-to-br from-white to-[#eaf1ff] text-[#2563eb] shadow-sm">
              <LayoutDashboard
                size={26}
                strokeWidth={1.7}
              />
            </div>

            <div>
              <p className="mb-1 flex items-center gap-2 text-xs font-medium text-[#92929b]">
                <Sparkles size={13} />
                YOUR WORKSPACE OVERVIEW
              </p>

              <h1 className="text-[30px] font-bold tracking-[-1.4px] text-[#1d1d1f] sm:text-[36px]">
                Hello, {firstName}.
              </h1>

              <p className="mt-1 text-[13px] text-[#898992]">
                Here's what's happening across your workspace.
              </p>
            </div>
          </div>

          <Link
            to="/"
            className="inline-flex self-start items-center gap-2 rounded-full border border-[#e5e5e9] bg-white px-5 py-3 text-xs font-semibold text-[#45454d] shadow-sm transition-colors hover:bg-[#f5f5f7] sm:self-auto"
          >
            <FolderKanban size={16} />
            View projects
            <ArrowRight size={15} />
          </Link>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {!data && !error && (
          <div className="animate-pulse space-y-6">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {[1, 2, 3, 4].map(
                (item) => (
                  <div
                    key={item}
                    className="h-44 rounded-[25px] bg-[#e9e9ee]"
                  />
                )
              )}
            </div>

            <div className="h-64 rounded-[25px] bg-[#e9e9ee]" />
          </div>
        )}

        {data && (
          <>
            {/* Interactive statistics cards */}
            <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map(
                (stat, index) => (
                  <StatCard
                    key={stat.type}
                    {...stat}
                    index={index}
                    reducedMotion={
                      reducedMotion
                    }
                    onClick={() =>
                      setActiveDetails(
                        stat.type
                      )
                    }
                  />
                )
              )}
            </div>

            {/* Assigned tasks */}
            <section className="mb-6 rounded-[26px] border border-[#e9e9ed] bg-white p-5 shadow-sm sm:p-7">
              <SectionHeading
                icon={ListTodo}
                title="Your assigned tasks"
                subtitle={`${myTasks.length} tasks assigned to you`}
                action={
                  myOverdue > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-600">
                      <CircleAlert size={14} />
                      {myOverdue} overdue
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-700">
                      <Check size={14} />
                      On track
                    </span>
                  )
                }
              />

              {myTasks.length === 0 ? (
                <EmptyState
                  icon={CheckCircle2}
                  title="You're all caught up"
                  description="When someone assigns you a task, it will appear here."
                />
              ) : (
                <div className="space-y-3">
                  {myTasks.map(
                    (task) => {
                      const due =
                        dueInfo(task);

                      return (
                        <Link
                          key={task.id}
                          to={`/projects/${task.projectId}`}
                          className={`flex flex-col gap-3 rounded-[19px] border p-4 transition-colors hover:bg-[#fafbff] sm:flex-row sm:items-center sm:justify-between ${
                            due?.overdue
                              ? "border-red-200"
                              : "border-[#eeeef1]"
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f1f4ff] text-[#5372c8]">
                              <ClipboardList size={19} />
                            </div>

                            <div className="min-w-0">
                              <p className="wrap-break-word text-[13px] font-semibold text-[#28282d]">
                                {task.title}
                              </p>

                              <p className="mt-1 text-[11px] text-[#9898a1]">
                                {task.project?.name ||
                                  "Project"}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-3 py-1.5 text-[10px] font-semibold ${
                                statusStyles[
                                  task.status
                                ] ||
                                statusStyles.TODO
                              }`}
                            >
                              {formatStatus(
                                task.status
                              )}
                            </span>

                            <span
                              className={`rounded-full px-3 py-1.5 text-[10px] font-semibold ${
                                priorityStyles[
                                  task.priority
                                ] ||
                                priorityStyles.MEDIUM
                              }`}
                            >
                              {task.priority ||
                                "MEDIUM"}
                            </span>

                            {due && (
                              <span
                                className={`inline-flex items-center gap-1 text-[11px] ${
                                  due.overdue
                                    ? "font-semibold text-red-600"
                                    : "text-[#93939b]"
                                }`}
                              >
                                <CalendarDays size={13} />
                                {due.text}
                              </span>
                            )}

                            <ChevronRight
                              size={16}
                              className="text-[#a1a1aa]"
                            />
                          </div>
                        </Link>
                      );
                    }
                  )}
                </div>
              )}
            </section>

            {/* Status and priority */}
            <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <section className="rounded-[26px] border border-[#e9e9ed] bg-white p-5 shadow-sm sm:p-7">
                <SectionHeading
                  icon={Activity}
                  title="Tasks by status"
                  subtitle="Where work currently stands"
                />

                <ProgressBar
                  label="To do"
                  value={
                    data.status?.TODO
                  }
                  max={data.total}
                  color="#a1a1aa"
                  reducedMotion={
                    reducedMotion
                  }
                />

                <ProgressBar
                  label="In progress"
                  value={
                    data.status?.IN_PROGRESS
                  }
                  max={data.total}
                  color="#3b82f6"
                  reducedMotion={
                    reducedMotion
                  }
                />

                <ProgressBar
                  label="Completed"
                  value={
                    data.status?.DONE
                  }
                  max={data.total}
                  color="#34c759"
                  reducedMotion={
                    reducedMotion
                  }
                />
              </section>

              <section className="rounded-[26px] border border-[#e9e9ed] bg-white p-5 shadow-sm sm:p-7">
                <SectionHeading
                  icon={TrendingUp}
                  title="Tasks by priority"
                  subtitle="Understand what needs attention"
                />

                <ProgressBar
                  label="High priority"
                  value={
                    data.priority?.HIGH
                  }
                  max={data.total}
                  color="#f43f5e"
                  reducedMotion={
                    reducedMotion
                  }
                />

                <ProgressBar
                  label="Medium priority"
                  value={
                    data.priority?.MEDIUM
                  }
                  max={data.total}
                  color="#f59e0b"
                  reducedMotion={
                    reducedMotion
                  }
                />

                <ProgressBar
                  label="Low priority"
                  value={
                    data.priority?.LOW
                  }
                  max={data.total}
                  color="#22c55e"
                  reducedMotion={
                    reducedMotion
                  }
                />
              </section>
            </div>

            {/* Project progress */}
            <section className="mb-6 rounded-[26px] border border-[#e9e9ed] bg-white p-5 shadow-sm sm:p-7">
              <SectionHeading
                icon={FolderKanban}
                title="Project progress"
                subtitle="Completion across your projects"
                action={
                  <Link
                    to="/"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563eb] hover:underline"
                  >
                    All projects
                    <ArrowRight size={14} />
                  </Link>
                }
              />

              {projects.length === 0 ? (
                <EmptyState
                  icon={FolderKanban}
                  title="No projects yet"
                  description="Projects will appear here once created."
                />
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {projects.map(
                    (project, index) => {
                      const percent = Math.min(
                        100,
                        Math.max(
                          0,
                          Number(
                            project.percent
                          ) || 0
                        )
                      );

                      const colors = [
                        "#3b82f6",
                        "#8b5cf6",
                        "#10b981",
                        "#f59e0b",
                      ];

                      const color =
                        colors[
                          index %
                            colors.length
                        ];

                      return (
                        <Link
                          key={project.id}
                          to={`/projects/${project.id}`}
                          className="group block rounded-[20px] border border-[#ededf0] bg-[#fcfcfd] p-5 transition-colors hover:border-[#dce3f5] hover:bg-white"
                        >
                          <div className="mb-5 flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#74747d] shadow-sm">
                                <FolderKanban
                                  size={18}
                                />
                              </div>

                              <div className="min-w-0">
                                <p className="wrap-break-word text-[13px] font-semibold text-[#29292e]">
                                  {project.name}
                                </p>

                                <p className="mt-1 text-[11px] text-[#9898a1]">
                                  {project.DONE ??
                                    0}{" "}
                                  of{" "}
                                  {project.total ??
                                    0}{" "}
                                  tasks done
                                </p>
                              </div>
                            </div>

                            <ChevronRight
                              size={16}
                              className="shrink-0 text-[#aaaab2] transition-transform group-hover:translate-x-1"
                            />
                          </div>

                          <div className="mb-2 flex justify-between text-[11px]">
                            <span className="text-[#9999a1]">
                              Completion
                            </span>

                            <span className="font-bold text-[#35353c]">
                              {percent}%
                            </span>
                          </div>

                          <div className="h-2.5 overflow-hidden rounded-full bg-[#ebebef]">
                            <motion.div
                              initial={
                                reducedMotion
                                  ? false
                                  : { width: 0 }
                              }
                              animate={{
                                width: `${percent}%`,
                              }}
                              transition={{
                                duration:
                                  reducedMotion
                                    ? 0
                                    : 0.8,
                              }}
                              className="h-full rounded-full"
                              style={{
                                backgroundColor:
                                  color,
                              }}
                            />
                          </div>
                        </Link>
                      );
                    }
                  )}
                </div>
              )}
            </section>

            {/* Team workload */}
            <section className="rounded-[26px] border border-[#e9e9ed] bg-white p-5 shadow-sm sm:p-7">
              <SectionHeading
                icon={Users}
                title="Team workload"
                subtitle="An overview of everyone's assigned work"
              />

              {workload.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No workload data yet"
                  description="Team assignments will appear here as tasks are created."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[430px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-[#eeeef1] text-[11px] text-[#a1a1aa]">
                        <th className="pb-4 font-medium">
                          Team member
                        </th>

                        <th className="pb-4 text-center font-medium">
                          Open tasks
                        </th>

                        <th className="pb-4 text-right font-medium">
                          Completed
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {workload.map(
                        (person) => {
                          const initials =
                            String(
                              person.name ||
                                "User"
                            )
                              .split(" ")
                              .filter(Boolean)
                              .map(
                                (part) =>
                                  part[0]
                              )
                              .join("")
                              .slice(0, 2)
                              .toUpperCase();

                          return (
                            <tr
                              key={person.id}
                              className="border-b border-[#f1f1f3] last:border-0"
                            >
                              <td className="py-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#edf1fa] text-[11px] font-bold text-[#53658e]">
                                    {initials}
                                  </div>

                                  <span className="text-[13px] font-medium text-[#36363c]">
                                    {person.name}
                                  </span>
                                </div>
                              </td>

                              <td className="py-4 text-center">
                                <span className="inline-flex min-w-9 justify-center rounded-full bg-[#f1f5ff] px-2.5 py-1 text-xs font-semibold text-[#2563eb]">
                                  {person.open}
                                </span>
                              </td>

                              <td className="py-4 text-right">
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#16a34a]">
                                  <CheckCircle2
                                    size={15}
                                  />
                                  {person.done}
                                </span>
                              </td>
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <p className="mt-10 text-center text-[11px] text-[#a1a1aa]">
              TaskFlow · Your work, beautifully organized.
            </p>
          </>
        )}
      </main>

      {/* Animated details panel */}
      <AnimatePresence>
        {activeDetails && (
          <TaskDetailsPanel
            key={activeDetails}
            type={activeDetails}
            reducedMotion={
              reducedMotion
            }
            logout={logout}
            onClose={closeDetails}
          />
        )}
      </AnimatePresence>
    </>
  );
}
