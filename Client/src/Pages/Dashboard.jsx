
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "motion/react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  Clock3,
  FolderKanban,
  History,
  LayoutDashboard,
  ListTodo,
  LoaderCircle,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  X,
} from "lucide-react";

import api from "../api";
import { useAuth } from "../Context/useAuth";

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

const priorityRank = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

const cardThemes = {
  blue: {
    background: "linear-gradient(135deg,#eff6ff,#dbeafe)",
    color: "#2563eb",
  },
  green: {
    background: "linear-gradient(135deg,#ecfdf5,#d1fae5)",
    color: "#059669",
  },
  purple: {
    background: "linear-gradient(135deg,#faf5ff,#ede9fe)",
    color: "#7c3aed",
  },
  orange: {
    background: "linear-gradient(135deg,#fff7ed,#ffedd5)",
    color: "#ea580c",
  },
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

function todayKey() {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

function dateKey(value) {
  return value ? String(value).slice(0, 10) : "";
}

function formatDate(value) {
  if (!value) return "No deadline";

  const key = dateKey(value);
  const date = new Date(`${key}T12:00:00Z`);

  if (Number.isNaN(date.getTime())) return key;

  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatDateTime(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("en-US", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function isOverdue(task) {
  return (
    task.status !== "DONE" &&
    Boolean(task.dueDate) &&
    dateKey(task.dueDate) < todayKey()
  );
}

function formatStatus(status) {
  return String(status || "TODO").replaceAll("_", " ");
}

function sortFocus(a, b) {
  const aOverdue = isOverdue(a);
  const bOverdue = isOverdue(b);

  if (aOverdue !== bOverdue) {
    return aOverdue ? -1 : 1;
  }

  const aDue = a.dueDate
    ? dateKey(a.dueDate)
    : "9999-12-31";

  const bDue = b.dueDate
    ? dateKey(b.dueDate)
    : "9999-12-31";

  if (aDue !== bDue) {
    return aDue.localeCompare(bDue);
  }

  return (
    (priorityRank[a.priority] ?? 3) -
    (priorityRank[b.priority] ?? 3)
  );
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.error ||
    error?.message ||
    "Something went wrong."
  );
}

function Panel({ children, className = "" }) {
  return (
    <div
      className={`rounded-[25px] border border-[#ededf0] bg-white p-5 shadow-[0_8px_30px_rgba(30,40,70,0.035)] sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

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
        reducedMotion ? false : { opacity: 0, y: 18 }
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

function TaskRow({ task, onClick }) {
  const overdue = isOverdue(task);

  return (
    <Link
      to={`/projects/${task.projectId}`}
      onClick={onClick}
      className="group flex items-start justify-between gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-[#f8faff]"
    >
      <div className="min-w-0 flex-1">
        <p className="break-words text-[13px] font-semibold leading-5 text-[#29292f]">
          {task.title}
        </p>

        <p className="mt-1 truncate text-[11px] text-[#9999a3]">
          {task.project?.name || "Project"}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
              statusStyles[task.status] || statusStyles.TODO
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

          {task.dueDate && (
            <span
              className={`inline-flex items-center gap-1 text-[10px] ${
                overdue
                  ? "font-semibold text-red-600"
                  : "text-[#92929b]"
              }`}
            >
              <CalendarDays size={12} />
              {formatDate(task.dueDate)}
            </span>
          )}

          {overdue && (
            <span className="rounded-full bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-600">
              Overdue
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

function ProjectDropdown({
  group,
  expanded,
  onToggle,
  view,
  onClose,
  reducedMotion,
}) {
  return (
    <section className="mb-4 overflow-hidden rounded-[20px] border border-[#e8e8ed] bg-white">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-[#f8faff]"
      >
        <div className="flex min-w-0 items-center gap-3">
          <FolderKanban
            size={18}
            className="shrink-0 text-blue-600"
          />

          <span className="truncate text-[14px] font-semibold text-[#303036]">
            {group.name}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className="rounded-full bg-[#f3f3f6] px-3 py-1 text-[11px] text-[#85858d]">
            {group.tasks.length} tasks
          </span>

          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
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
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              duration: reducedMotion ? 0 : 0.25,
            }}
            className="overflow-hidden border-t border-[#eeeef1]"
          >
            {view === "tasks" ? (
              <div className="divide-y divide-[#f0f0f2] p-2">
                {group.tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onClick={onClose}
                  />
                ))}
              </div>
            ) : (
              <div className="p-5">
                <p className="mb-4 text-xs text-[#85858d]">
                  {group.tasks.length} matching tasks
                </p>

                <Link
                  to={`/projects/${group.id}`}
                  onClick={onClose}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  Open project
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

function TaskDetailsPanel({
  type,
  onClose,
  reducedMotion,
  logout,
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [view, setView] = useState("tasks");
  const [expanded, setExpanded] = useState({});

  const config = detailConfig[type] || detailConfig.total;
  const Icon = config.icon;

  // Close on Escape and restore scrolling on cleanup.
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);

    const previousBodyOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);

      document.body.style.overflow =
        previousBodyOverflow;
    };
  }, [onClose]);

  // Load all task pages for the details panel.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const projectsResponse = await api.get("/projects");

        const projectList = Array.isArray(
          projectsResponse.data
        )
          ? projectsResponse.data
          : projectsResponse.data?.items || [];

        const firstResponse = await api.get("/tasks", {
          params: { page: 1, limit: 100 },
        });

        const first = firstResponse.data || {};
        const allTasks = [...(first.items || [])];

        const totalPages = Math.max(
          1,
          Number(first.pages) || 1
        );

        if (totalPages > 1) {
          const remaining = await Promise.all(
            Array.from(
              { length: totalPages - 1 },
              (_, index) =>
                api.get("/tasks", {
                  params: {
                    page: index + 2,
                    limit: 100,
                  },
                })
            )
          );

          remaining.forEach((response) => {
            allTasks.push(
              ...(response.data?.items || [])
            );
          });
        }

        if (!cancelled) {
          setProjects(projectList);
          setTasks(allTasks);
        }
      } catch (err) {
        if (cancelled) return;

        if (err?.response?.status === 401) {
          logout?.();
        }

        setError(getErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [logout]);

  const filteredTasks = tasks.filter((task) => {
    if (type === "completed") return task.status === "DONE";
    if (type === "progress")
      return task.status === "IN_PROGRESS";
    if (type === "overdue") return isOverdue(task);
    return true;
  });

  const projectNames = Object.fromEntries(
    projects.map((project) => [
      project.id,
      project.name,
    ])
  );

  const groupedMap = new Map();

  filteredTasks.forEach((task) => {
    const id = task.projectId;

    if (!groupedMap.has(id)) {
      groupedMap.set(id, {
        id,
        name:
          task.project?.name ||
          projectNames[id] ||
          "Project",
        tasks: [],
      });
    }

    groupedMap.get(id).tasks.push(task);
  });

  const groups = Array.from(groupedMap.values()).sort(
    (a, b) => a.name.localeCompare(b.name)
  );

  const toggleGroup = (id) => {
    setExpanded((previous) => ({
      ...previous,
      [id]: !(previous[id] ?? true),
    }));
  };

  const allExpanded = groups.every(
    (group) => expanded[group.id] ?? true
  );

  return createPortal(
  <motion.div
    className="fixed inset-0 z-[100]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: reducedMotion ? 0 : 0.2,
      }}
    >
      {/* Background overlay */}
      <button
        type="button"
        aria-label="Close task details"
        onClick={onClose}
        className="absolute inset-0 bg-[#161621]/45 backdrop-blur-[3px]"
      />

      {/* Scrollable side panel */}
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label={config.title}
        initial={
          reducedMotion ? false : { x: "100%" }
        }
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{
          duration: reducedMotion ? 0 : 0.35,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="absolute inset-y-0 right-0 flex h-dvh min-h-0 w-full max-w-[590px] flex-col overflow-hidden bg-[#f9f9fb] shadow-2xl"
      >
        {/* Fixed header */}
        <div className="shrink-0 border-b border-[#eaeaf0] bg-white px-6 py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-2xl"
                style={{
                  backgroundColor: `${config.color}15`,
                  color: config.color,
                }}
              >
                <Icon size={21} />
              </div>

              <div>
                <h2 className="text-xl font-bold text-[#1d1d1f]">
                  {config.title}
                </h2>

                <p className="mt-1 text-xs text-[#93939c]">
                  {config.subtitle}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close panel"
              className="rounded-xl p-2 text-[#777783] hover:bg-[#f3f3f6]"
            >
              <X size={20} />
            </button>
          </div>

          {!loading && !error && (
            <div className="mt-5 flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-[#777783]">
                {filteredTasks.length} matching tasks
              </span>

              <div className="flex rounded-xl bg-[#f2f2f5] p-1">
                {["tasks", "projects"].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setView(option)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                      view === option
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-[#8d8d96]"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* This section scrolls independently */}
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-5 py-6">
          {loading ? (
            <div className="flex min-h-52 items-center justify-center">
              <LoaderCircle
                size={25}
                className="animate-spin text-blue-600"
              />
            </div>
          ) : error ? (
            <EmptyState
              icon={CircleAlert}
              title="Could not load tasks"
              description={error}
            />
          ) : groups.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No matching tasks"
              description="There are no tasks in this category yet."
            />
          ) : (
            <>
              <div className="mb-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    const next = {};

                    groups.forEach((group) => {
                      next[group.id] = !allExpanded;
                    });

                    setExpanded(next);
                  }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700"
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
                  expanded={expanded[group.id] ?? true}
                  onToggle={() => toggleGroup(group.id)}
                  view={view}
                  onClose={onClose}
                  reducedMotion={reducedMotion}
                />
              ))}
            </>
          )}
        </div>
      </motion.aside>
    </motion.div>,
    document.body
  );
}

function WeeklyProductivity({
  items,
  reducedMotion,
}) {
  const days = Array.isArray(items) ? items : [];

  const max = Math.max(
    1,
    ...days.map((day) => Number(day.completed) || 0)
  );

  const total = days.reduce(
    (sum, day) => sum + (Number(day.completed) || 0),
    0
  );

  return (
    <Panel>
      <SectionHeading
        icon={BarChart3}
        title="Weekly productivity"
        subtitle="Tasks completed over the last 7 days"
        action={
          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            {total} completed
          </span>
        }
      />

      {days.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No productivity data"
          description="Your completion history will appear here."
        />
      ) : (
        <div>
          <div className="flex h-52 items-end justify-between gap-2 border-b border-[#ededf0] pb-3 sm:gap-4">
            {days.map((day) => {
              const count = Number(day.completed) || 0;

              const height = Math.max(
                4,
                (count / max) * 100
              );

              return (
                <div
                  key={day.date}
                  className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
                  title={`${day.date}: ${count} completed`}
                >
                  <span className="text-xs font-semibold text-[#777783]">
                    {count}
                  </span>

                  <div className="flex h-[155px] w-full max-w-12 items-end rounded-xl bg-[#f5f7fb]">
                    <motion.div
                      initial={
                        reducedMotion
                          ? false
                          : { height: 0 }
                      }
                      animate={{
                        height: `${height}%`,
                      }}
                      transition={{
                        duration: reducedMotion ? 0 : 0.75,
                        ease: "easeOut",
                      }}
                      className="w-full rounded-xl bg-gradient-to-t from-blue-600 to-blue-400"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex justify-between gap-2">
            {days.map((day) => (
              <span
                key={day.date}
                className="flex-1 text-center text-[11px] font-medium text-[#93939c]"
              >
                {day.day}
              </span>
            ))}
          </div>

          <p className="mt-5 text-[11px] leading-5 text-[#a1a1aa]">
            Based on recorded task completion dates.
            Older completed tasks without a completion
            timestamp are not included.
          </p>
        </div>
      )}
    </Panel>
  );
}

function ProjectHealth({
  projects,
  reducedMotion,
}) {
  const items = Array.isArray(projects) ? projects : [];

  return (
    <Panel>
      <SectionHeading
        icon={FolderKanban}
        title="Project health"
        subtitle="Progress and overdue work across projects"
        action={
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            All projects
            <ArrowRight size={14} />
          </Link>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create a project to start tracking progress."
        />
      ) : (
        <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
          {items.map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="block rounded-[18px] border border-[#f0f0f2] p-4 transition-colors hover:bg-[#fafbff]"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-[13px] font-semibold text-[#303036]">
                    {project.name}
                  </h3>

                  <p className="mt-1 text-[11px] text-[#9999a3]">
                    {project.DONE || 0} of{" "}
                    {project.total || 0} tasks completed
                  </p>
                </div>

                <span className="text-sm font-bold text-blue-600">
                  {project.percent || 0}%
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-[#f0f0f3]">
                <motion.div
                  initial={
                    reducedMotion
                      ? false
                      : { width: 0 }
                  }
                  animate={{
                    width: `${Math.min(
                      100,
                      Math.max(0, project.percent || 0)
                    )}%`,
                  }}
                  transition={{
                    duration: reducedMotion ? 0 : 0.8,
                  }}
                  className="h-full rounded-full bg-blue-500"
                />
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-[11px] text-[#9999a3]">
                  {project.IN_PROGRESS || 0} in progress
                </span>

                {(project.overdue || 0) > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-semibold text-red-600">
                    <CircleAlert size={12} />
                    {project.overdue} overdue
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-emerald-600">
                    On track
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </Panel>
  );
}

function UpcomingDeadlines({ tasks }) {
  const items = Array.isArray(tasks) ? tasks : [];

  return (
    <Panel>
      <SectionHeading
        icon={CalendarDays}
        title="Upcoming deadlines"
        subtitle="Unfinished tasks due in the next 7 days"
      />

      {items.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No upcoming deadlines"
          description="There are no unfinished tasks due this week."
        />
      ) : (
        <div className="max-h-[390px] divide-y divide-[#f1f1f4] overflow-y-auto">
          {items.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </div>
      )}
    </Panel>
  );
}

function RecentActivity({ activities }) {
  const items = Array.isArray(activities)
    ? activities
    : [];

  return (
    <Panel>
      <SectionHeading
        icon={History}
        title="Recent activity"
        subtitle="Latest changes across your workspace"
      />

      {items.length === 0 ? (
        <EmptyState
          icon={History}
          title="No recent activity"
          description="Task updates will appear here."
        />
      ) : (
        <div className="max-h-[430px] overflow-y-auto">
          {items.map((activity, index) => (
            <div
              key={activity.id}
              className="relative flex gap-3 pb-5 last:pb-0"
            >
              {index < items.length - 1 && (
                <div className="absolute bottom-0 left-[17px] top-9 w-px bg-[#ececf0]" />
              )}

              <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <Activity size={15} />
              </div>

              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-[12px] leading-5 text-[#565661]">
                  <span className="font-semibold text-[#303036]">
                    {activity.user?.name || "Someone"}
                  </span>{" "}
                  {activity.action || "updated a task"}
                </p>

                {activity.task && (
                  <Link
                    to={`/projects/${activity.task.projectId}`}
                    className="mt-1 block truncate text-[12px] font-semibold text-blue-600 hover:underline"
                  >
                    {activity.task.title}
                  </Link>
                )}

                <p className="mt-1 text-[11px] text-[#a1a1aa]">
                  {activity.task?.project?.name || ""}
                  {activity.task?.project?.name &&
                  activity.createdAt
                    ? " · "
                    : ""}
                  {formatDateTime(activity.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function MyFocus({ tasks }) {
  const items = Array.isArray(tasks)
    ? [...tasks].sort(sortFocus).slice(0, 8)
    : [];

  return (
    <Panel>
      <SectionHeading
        icon={Target}
        title="My Focus"
        subtitle="Your most urgent unfinished assignments"
      />

      {items.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="You're all caught up"
          description="You have no unfinished tasks assigned to you."
        />
      ) : (
        <div className="divide-y divide-[#f1f1f4]">
          {items.map((task, index) => (
            <div
              key={task.id}
              className="flex items-start gap-2 py-1"
            >
              <span className="mt-4 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#f3f4f8] text-[10px] font-semibold text-[#888894]">
                {index + 1}
              </span>

              <div className="min-w-0 flex-1">
                <TaskRow task={task} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function TeamWorkload({ workload }) {
  const items = Array.isArray(workload)
    ? workload
    : [];

  return (
    <Panel>
      <SectionHeading
        icon={Users}
        title="Team workload"
        subtitle="Open and completed tasks by team member"
      />

      {items.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No workload data"
          description="Assign tasks to see team workload."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[350px] text-left">
            <thead>
              <tr className="border-b border-[#ededf0] text-[11px] uppercase tracking-wide text-[#a1a1aa]">
                <th className="pb-4 font-semibold">
                  Team member
                </th>
                <th className="pb-4 text-center font-semibold">
                  Open
                </th>
                <th className="pb-4 text-center font-semibold">
                  Done
                </th>
                <th className="pb-4 text-right font-semibold">
                  Total
                </th>
              </tr>
            </thead>

            <tbody>
              {items.map((person) => (
                <tr
                  key={person.id}
                  className="border-b border-[#f3f3f5] last:border-b-0"
                >
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600">
                        {String(person.name || "U")
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <span className="text-[12px] font-semibold text-[#45454d]">
                        {person.name}
                      </span>
                    </div>
                  </td>

                  <td className="py-4 text-center">
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                      {person.open || 0}
                    </span>
                  </td>

                  <td className="py-4 text-center">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      {person.done || 0}
                    </span>
                  </td>

                  <td className="py-4 text-right text-xs font-semibold text-[#45454d]">
                    {(person.open || 0) +
                      (person.done || 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const reducedMotion = useReducedMotion();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeDetail, setActiveDetail] = useState(null);

  const closeDetails = useCallback(() => {
    setActiveDetail(null);
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/dashboard");
      setData(response.data);
    } catch (err) {
      if (err?.response?.status === 401) {
        logout?.();
      }

      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [logout]);

  // Schedule the request after the effect callback.
  // This avoids synchronous state updates inside useEffect.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void loadDashboard();
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [loadDashboard]);

  const firstName = String(user?.name || "there")
    .trim()
    .split(/\s+/)[0];

  const total = data?.total || 0;
  const status = data?.status || {};
  const priority = data?.priority || {};

  const stats = [
    {
      key: "total",
      label: "Total tasks",
      value: total,
      description: "Across all your projects",
      icon: ClipboardList,
      theme: "blue",
    },
    {
      key: "completed",
      label: "Completion rate",
      value: `${data?.completion || 0}%`,
      description: `${status.DONE || 0} tasks completed`,
      icon: CheckCircle2,
      theme: "green",
    },
    {
      key: "progress",
      label: "In progress",
      value: status.IN_PROGRESS || 0,
      description: "Tasks currently being worked on",
      icon: Activity,
      theme: "purple",
    },
    {
      key: "overdue",
      label: "Overdue",
      value: data?.overdue || 0,
      description: "Tasks needing attention",
      icon: Clock3,
      theme: "orange",
    },
  ];

  if (loading && !data) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4">
        <LoaderCircle
          size={32}
          className="animate-spin text-blue-600"
        />

        <p className="text-sm text-[#9999a3]">
          Loading your dashboard...
        </p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="mx-auto max-w-lg py-20">
        <Panel>
          <EmptyState
            icon={CircleAlert}
            title="Could not load dashboard"
            description={error}
          />

          <button
            type="button"
            onClick={loadDashboard}
            className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Try again
          </button>
        </Panel>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1600px] space-y-7 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-blue-600">
            <Sparkles size={13} />
            Workspace overview
          </div>

          <h1 className="text-[28px] font-bold tracking-[-1px] text-[#1d1d1f] sm:text-[34px]">
            Hello, {firstName}
            <span className="ml-2">👋</span>
          </h1>

          <p className="mt-2 text-[13px] text-[#92929b]">
            Here's what's happening across your projects.
          </p>
        </div>

        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-2xl bg-[#1d1d1f] px-5 py-3 text-xs font-semibold text-white transition-colors hover:bg-blue-600"
        >
          <FolderKanban size={16} />
          View projects
          <ArrowRight size={15} />
        </Link>
      </div>

      {/* Overview statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat, index) => (
          <StatCard
            key={stat.key}
            {...stat}
            index={index}
            reducedMotion={reducedMotion}
            onClick={() => setActiveDetail(stat.key)}
          />
        ))}
      </div>

      {/* Weekly productivity and My Focus */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <WeeklyProductivity
          items={data?.weeklyProductivity}
          reducedMotion={reducedMotion}
        />

        <MyFocus tasks={data?.myTasks} />
      </div>

      {/* Project health and upcoming deadlines */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <ProjectHealth
          projects={data?.projects}
          reducedMotion={reducedMotion}
        />

        <UpcomingDeadlines
          tasks={data?.upcomingDeadlines}
        />
      </div>

      {/* Status and priority */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Panel>
          <SectionHeading
            icon={LayoutDashboard}
            title="Tasks by status"
            subtitle="How work is moving through your board"
          />

          <ProgressBar
            label="To do"
            value={status.TODO}
            max={total}
            color="#94a3b8"
            reducedMotion={reducedMotion}
          />

          <ProgressBar
            label="In progress"
            value={status.IN_PROGRESS}
            max={total}
            color="#3b82f6"
            reducedMotion={reducedMotion}
          />

          <ProgressBar
            label="Done"
            value={status.DONE}
            max={total}
            color="#10b981"
            reducedMotion={reducedMotion}
          />
        </Panel>

        <Panel>
          <SectionHeading
            icon={TrendingUp}
            title="Tasks by priority"
            subtitle="Distribution of task importance"
          />

          <ProgressBar
            label="High priority"
            value={priority.HIGH}
            max={total}
            color="#f43f5e"
            reducedMotion={reducedMotion}
          />

          <ProgressBar
            label="Medium priority"
            value={priority.MEDIUM}
            max={total}
            color="#f59e0b"
            reducedMotion={reducedMotion}
          />

          <ProgressBar
            label="Low priority"
            value={priority.LOW}
            max={total}
            color="#10b981"
            reducedMotion={reducedMotion}
          />
        </Panel>
      </div>

      {/* Assigned tasks */}
      <Panel>
        <SectionHeading
          icon={ListTodo}
          title="Your assigned tasks"
          subtitle="All your unfinished assignments, ordered by urgency"
        />

        {!data?.myTasks?.length ? (
          <EmptyState
            icon={CheckCircle2}
            title="No pending assignments"
            description="You're all caught up with your assigned tasks."
          />
        ) : (
          <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
            {data.myTasks.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </div>
        )}
      </Panel>

      {/* Project progress */}
      <Panel>
        <SectionHeading
          icon={FolderKanban}
          title="Project progress"
          subtitle="Completion across your projects"
          action={
            <Link
              to="/"
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              View all
              <ArrowRight size={14} />
            </Link>
          }
        />

        {!data?.projects?.length ? (
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            description="Create a project to see its progress."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.projects.map((project) => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="rounded-[18px] border border-[#ededf0] p-5 transition-colors hover:bg-[#fafbff]"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="truncate text-[13px] font-semibold text-[#303036]">
                    {project.name}
                  </h3>

                  <ArrowUpRight
                    size={16}
                    className="shrink-0 text-[#a1a1aa]"
                  />
                </div>

                <div className="mb-3 flex items-end justify-between">
                  <span className="text-2xl font-bold text-[#1d1d1f]">
                    {project.percent || 0}%
                  </span>

                  <span className="text-[11px] text-[#93939c]">
                    {project.DONE || 0}/
                    {project.total || 0} tasks
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-[#f0f0f3]">
                  <motion.div
                    initial={
                      reducedMotion
                        ? false
                        : { width: 0 }
                    }
                    animate={{
                      width: `${Math.min(
                        100,
                        Math.max(0, project.percent || 0)
                      )}%`,
                    }}
                    transition={{
                      duration: reducedMotion ? 0 : 0.8,
                    }}
                    className="h-full rounded-full bg-blue-500"
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-[10px]">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                    {project.TODO || 0} to do
                  </span>

                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">
                    {project.IN_PROGRESS || 0} active
                  </span>

                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
                    {project.DONE || 0} done
                  </span>

                  {(project.overdue || 0) > 0 && (
                    <span className="rounded-full bg-red-50 px-2.5 py-1 text-red-600">
                      {project.overdue} overdue
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </Panel>

      {/* Recent activity and workload */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <RecentActivity
          activities={data?.recentActivities}
        />

        <TeamWorkload
          workload={data?.workload}
        />
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-[11px] text-[#a1a1aa]">
        <span>
          TaskFlow · Your workspace at a glance
        </span>

        <button
          type="button"
          onClick={loadDashboard}
          disabled={loading}
          className="inline-flex items-center gap-2 font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50"
        >
          {loading ? (
            <LoaderCircle
              size={13}
              className="animate-spin"
            />
          ) : (
            <Activity size={13} />
          )}
          Refresh dashboard
        </button>
      </div>

      {/* Sliding details panel */}
      <AnimatePresence>
        {activeDetail && (
          <TaskDetailsPanel
            key={activeDetail}
            type={activeDetail}
            onClose={closeDetails}
            reducedMotion={reducedMotion}
            logout={logout}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
