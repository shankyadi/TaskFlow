
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleAlert,
  FolderKanban,
  Globe2,
  LayoutGrid,
  LoaderCircle,
  Plus,
  Search,
  Smartphone,
  Sparkles,
  X,
} from "lucide-react";

import api from "../api";
import { useAuth } from "../Context/useAuth";
import Notifications from "../components/Notifications";

const themes = [
  {
    background: "linear-gradient(135deg,#eff6ff,#dbeafe,#c7d2fe)",
    accent: "#2563eb",
    glow: "rgba(99,102,241,.18)",
    icon: Smartphone,
  },
  {
    background: "linear-gradient(135deg,#fff1f2,#ffe4e6,#fed7aa)",
    accent: "#ea580c",
    glow: "rgba(251,113,133,.18)",
    icon: Globe2,
  },
  {
    background: "linear-gradient(135deg,#f0fdf4,#dcfce7,#bbf7d0)",
    accent: "#16a34a",
    glow: "rgba(34,197,94,.18)",
    icon: FolderKanban,
  },
  {
    background: "linear-gradient(135deg,#faf5ff,#f3e8ff,#ddd6fe)",
    accent: "#9333ea",
    glow: "rgba(168,85,247,.18)",
    icon: Sparkles,
  },
];

const taskStatuses = [
  {
    key: "TODO",
    label: "To Do",
    color: "#94a3b8",
  },
  {
    key: "IN_PROGRESS",
    label: "In Progress",
    color: "#60a5fa",
  },
  {
    key: "DONE",
    label: "Done",
    color: "#34d399",
  },
];

function ProjectStatus({ health, reducedMotion }) {
  if (!health) {
    return null;
  }

  const counts = taskStatuses.map((status) => ({
    ...status,
    count: Math.max(0, Number(health[status.key]) || 0),
  }));

  const total = counts.reduce(
    (sum, status) => sum + status.count,
    0
  );

  return (
    <div className="mb-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-medium text-[#85858d]">
          Task breakdown
        </span>

        <span className="text-[11px] text-[#a1a1aa]">
          {total} total
        </span>
      </div>

      <div
        className="flex h-[7px] w-full gap-[2px] overflow-hidden rounded-full bg-[#f0f0f3]"
        role="img"
        aria-label={counts
          .map((status) => `${status.label}: ${status.count}`)
          .join(", ")}
      >
        {counts.map((status) => {
          const percent = total
            ? (status.count / total) * 100
            : 0;

          if (percent === 0) return null;

          return (
            <motion.div
              key={status.key}
              initial={reducedMotion ? false : { scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{
                duration: reducedMotion ? 0 : 0.65,
                ease: "easeOut",
              }}
              style={{
                width: `${percent}%`,
                backgroundColor: status.color,
                transformOrigin: "left",
              }}
              className="h-full min-w-0"
            />
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {counts.map((status) => (
          <div key={status.key} className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: status.color }}
              />

              <span className="truncate text-[10px] text-[#85858d]">
                {status.label}
              </span>
            </div>

            <p className="mt-1 pl-3 text-[13px] font-semibold tabular-nums text-[#45454d]">
              {status.count}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProjectCard({
  project,
  index,
  reducedMotion,
  health,
}) {
  const theme = themes[index % themes.length];
  const Icon = theme.icon;
  const taskCount = project._count?.tasks ?? 0;
  const overdue = Math.max(0, Number(health?.overdue) || 0);

  return (
    <motion.div
      initial={
        reducedMotion ? false : { opacity: 0, y: 20 }
      }
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reducedMotion ? 0 : 0.42,
        delay: reducedMotion
          ? 0
          : Math.min(index * 0.055, 0.3),
        ease: [0.22, 1, 0.36, 1],
      }}
      className="min-w-0"
    >
      <Link
        to={`/projects/${project.id}`}
        className="group flex h-full flex-col overflow-hidden rounded-[26px] border border-[#e9e9ed] bg-white p-2 shadow-[0_8px_28px_rgba(0,0,0,0.035)] transition-all duration-300 hover:-translate-y-1 hover:border-[#d9dce4] hover:shadow-[0_22px_55px_rgba(30,40,70,0.10)] focus-visible:outline-2 focus-visible:outline-blue-500"
      >
        <div
          className="relative h-40 overflow-hidden rounded-[19px] sm:h-44"
          style={{ background: theme.background }}
        >
          <div
            className="absolute -bottom-20 -right-10 h-56 w-56 rotate-[-28deg] rounded-[65px] opacity-60 transition-transform duration-700 group-hover:-translate-x-4 group-hover:-translate-y-3"
            style={{ background: theme.glow }}
          />

          <div className="absolute -bottom-24 right-16 h-52 w-52 rotate-45 rounded-[60px] bg-white/35 transition-transform duration-700 group-hover:-translate-y-4" />

          <div className="absolute -right-10 -top-14 h-44 w-44 rounded-full border border-white/50" />

          <span className="absolute right-5 top-5 rounded-full border border-white/60 bg-white/65 px-3 py-1.5 text-[10px] font-semibold tracking-wider text-[#64646e] backdrop-blur-md">
            PROJECT
          </span>

          <div className="absolute left-6 top-1/2 flex h-16 w-16 -translate-y-1/2 items-center justify-center rounded-[20px] border border-white/70 bg-white/70 shadow-[0_12px_25px_rgba(50,60,100,0.09)] backdrop-blur-xl transition-transform duration-500 group-hover:scale-110">
            <Icon
              size={29}
              strokeWidth={1.7}
              style={{ color: theme.accent }}
            />
          </div>
        </div>

        <div className="flex flex-1 flex-col px-4 pb-4 pt-5 sm:px-5 sm:pb-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="min-w-0 break-words text-[19px] font-semibold tracking-tight text-[#1d1d1f] sm:text-[21px]">
              {project.name}
            </h3>

            <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f5f5f7] text-[#74747b] transition-colors group-hover:bg-[#1d1d1f] group-hover:text-white">
              <ArrowUpRight size={16} />
            </span>
          </div>

          <p className="mt-2 text-[12px] leading-5 text-[#898992]">
            Organize tasks, collaborate, and track progress.
          </p>

          <div className="mt-auto pt-6">
            <ProjectStatus
              health={health}
              reducedMotion={reducedMotion}
            />

            {overdue > 0 && (
              <p className="mb-3 inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600">
                <CircleAlert size={12} />
                {overdue} overdue
              </p>
            )}

            <div className="h-px bg-[#f0f0f2]" />

            <div className="flex items-center justify-between gap-2 pt-4">
              <span className="inline-flex items-center gap-2 text-[12px] font-medium text-[#85858d]">
                <LayoutGrid size={15} />
                {taskCount}{" "}
                {taskCount === 1 ? "task" : "tasks"}
              </span>

              <span
                className="inline-flex items-center gap-1 text-[12px] font-semibold transition-all group-hover:gap-2"
                style={{ color: theme.accent }}
              >
                Open board
                <ArrowRight size={15} />
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function Projects() {
  const { user, logout } = useAuth();
  const reducedMotion = useReducedMotion();

  const [projects, setProjects] = useState([]);
  const [healthMap, setHealthMap] = useState({});
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const canCreate = [
    "ADMIN",
    "PROJECT_MANAGER",
  ].includes(user?.role);

  const load = useCallback(async () => {
    try {
      const response = await api.get("/projects");

      setProjects(
        Array.isArray(response.data)
          ? response.data
          : []
      );

      setError("");

      // Additional statistics are optional.
      // Project listing remains functional without them.
      try {
        const stats = await api.get("/dashboard");

        const map = Object.fromEntries(
          (stats.data?.projects || []).map(
            (item) => [item.id, item]
          )
        );

        setHealthMap(map);
      } catch {
        setHealthMap({});
      }
    } catch (err) {
      if (err?.response?.status === 401) {
        logout();
      } else {
        setError(
          "Could not load projects. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);

    return () => clearTimeout(timer);
  }, [load]);

  const create = async (event) => {
    event.preventDefault();

    const trimmedName = name.trim();

    if (
      !canCreate ||
      trimmedName.length < 2 ||
      creating
    ) {
      return;
    }

    setCreating(true);
    setError("");

    try {
      await api.post("/projects", {
        name: trimmedName,
      });

      setName("");
      await load();
    } catch (err) {
      if (err?.response?.status === 401) {
        logout();
      } else {
        setError(
          "Could not create project. Please try again."
        );
      }
    } finally {
      setCreating(false);
    }
  };

  const visibleProjects = useMemo(() => {
    const term = query.trim().toLowerCase();

    const result = projects.filter(
      (project) =>
        project.name.toLowerCase().includes(term)
    );

    result.sort((a, b) => {
      if (sort === "name") {
        return a.name.localeCompare(b.name);
      }

      if (sort === "tasks") {
        return (
          (b._count?.tasks ?? 0) -
          (a._count?.tasks ?? 0)
        );
      }

      if (sort === "progress") {
        return (
          (healthMap[b.id]?.percent ?? -1) -
          (healthMap[a.id]?.percent ?? -1)
        );
      }

      return (
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
      );
    });

    return result;
  }, [projects, query, sort, healthMap]);

  const totalTasks = projects.reduce(
    (sum, project) =>
      sum + (project._count?.tasks ?? 0),
    0
  );

  const overdueTotal = projects.reduce(
    (sum, project) =>
      sum + (healthMap[project.id]?.overdue ?? 0),
    0
  );

  return (
    <main className="mx-auto w-full min-w-0 max-w-[1450px] px-5 pb-20 pt-9 sm:px-8 lg:px-12 lg:pt-12">
      <Notifications />

      {/* Page heading */}
      <motion.div
        initial={
          reducedMotion
            ? false
            : { opacity: 0, y: 12 }
        }
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: reducedMotion ? 0 : 0.4,
        }}
        className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-center"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[19px] border border-[#e4e9f4] bg-linear-to-br from-white to-[#eaf1ff] text-[#2563eb]">
            <FolderKanban
              size={26}
              strokeWidth={1.7}
            />
          </div>

          <div>
            <h1 className="text-[30px] font-bold tracking-[-1.4px] text-[#1d1d1f] sm:text-[36px]">
              Projects
            </h1>

            <p className="mt-1 text-[13px] leading-5 text-[#898992] sm:text-[14px]">
              Your workspace, beautifully organized.
            </p>
          </div>
        </div>

        {!loading && (
          <div className="flex items-center gap-2 self-start rounded-full border border-[#e7e7eb] bg-white px-4 py-2 text-[12px] font-medium text-[#73737b] shadow-sm">
            <Check
              size={14}
              className="text-[#34c759]"
            />
            {projects.length}{" "}
            {projects.length === 1
              ? "project"
              : "projects"}
          </div>
        )}
      </motion.div>

      {/* Workspace summary */}
      {!loading && projects.length > 0 && (
        <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-[20px] border border-[#ececf0] bg-white p-5">
            <p className="text-xs text-[#85858d]">
              Total projects
            </p>

            <p className="mt-2 text-[27px] font-bold text-[#1d1d1f]">
              {projects.length}
            </p>
          </div>

          <div className="rounded-[20px] border border-[#ececf0] bg-white p-5">
            <p className="text-xs text-[#85858d]">
              Total tasks
            </p>

            <p className="mt-2 text-[27px] font-bold text-[#2563eb]">
              {totalTasks}
            </p>
          </div>

          <div className="rounded-[20px] border border-[#ececf0] bg-white p-5">
            <p className="text-xs text-[#85858d]">
              Overdue tasks
            </p>

            <p className="mt-2 text-[27px] font-bold text-[#ea580c]">
              {Object.keys(healthMap).length
                ? overdueTotal
                : "—"}
            </p>
          </div>
        </div>
      )}

      {/* Create project */}
      {canCreate && (
        <form
          onSubmit={create}
          className="mb-8 flex flex-col gap-3 sm:flex-row"
        >
          <div className="flex min-h-15 flex-1 items-center gap-3 rounded-[19px] border border-[#e4e4e9] bg-white px-5 shadow-sm transition-all focus-within:border-[#a7bfff] focus-within:ring-4 focus-within:ring-blue-50">
            <Plus
              size={20}
              className="shrink-0 text-[#9b9ba4]"
            />

            <input
              type="text"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="New project name"
              aria-label="New project name"
              minLength={2}
              required
              disabled={creating}
              className="min-h-14 w-full min-w-0 border-0 bg-transparent text-[14px] text-[#1d1d1f] outline-none placeholder:text-[#aaaab2]"
            />
          </div>

          <button
            type="submit"
            disabled={
              creating ||
              name.trim().length < 2
            }
            className="flex min-h-15 items-center justify-center gap-2 rounded-[19px] bg-[#2563eb] px-7 text-[14px] font-semibold text-white shadow-[0_7px_18px_rgba(37,99,235,0.17)] transition-all hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {creating ? (
              <>
                <LoaderCircle
                  size={17}
                  className="animate-spin"
                />
                Creating...
              </>
            ) : (
              <>
                <Plus size={18} />
                Add Project
              </>
            )}
          </button>
        </form>
      )}

      {/* Error message */}
      {error && (
        <div
          role="alert"
          className="mb-6 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-[13px] text-red-700"
        >
          <CircleAlert size={17} />
          {error}
        </div>
      )}

      {/* Search and sorting */}
      {!loading && projects.length > 0 && (
        <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-sm">
            <Search
              size={17}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9999a3]"
            />

            <input
              type="search"
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
              placeholder="Search projects"
              aria-label="Search projects"
              className="h-12 w-full rounded-2xl border border-[#e7e7eb] bg-white pl-11 pr-4 text-[13px] text-[#303036] outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
            />
          </div>

          <div className="relative">
            <select
              value={sort}
              onChange={(event) =>
                setSort(event.target.value)
              }
              aria-label="Sort projects"
              className="h-12 w-full appearance-none rounded-2xl border border-[#e7e7eb] bg-white pl-4 pr-10 text-[13px] font-medium text-[#555561] outline-none focus:border-blue-300 sm:w-auto"
            >
              <option value="newest">
                Newest first
              </option>
              <option value="name">
                Name A–Z
              </option>
              <option value="tasks">
                Most tasks
              </option>
              <option value="progress">
                Highest completion
              </option>
            </select>

            <ChevronDown
              size={15}
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#9999a3]"
            />
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="animate-pulse rounded-[26px] border border-[#e9e9ed] bg-white p-2"
            >
              <div className="h-44 rounded-[19px] bg-[#edf0f6]" />

              <div className="space-y-3 px-5 py-6">
                <div className="h-6 w-2/3 rounded-lg bg-[#ececf0]" />
                <div className="h-4 w-full rounded-lg bg-[#f1f1f3]" />
                <div className="mt-7 h-4 w-1/2 rounded-lg bg-[#f1f1f3]" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty workspace */}
      {!loading && projects.length === 0 && (
        <div className="flex min-h-80 flex-col items-center justify-center rounded-[28px] border border-dashed border-[#dedee4] bg-white/60 px-6 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#f1f5ff] text-[#2563eb]">
            <FolderKanban size={29} />
          </div>

          <h2 className="text-[21px] font-semibold text-[#1d1d1f]">
            Your workspace starts here.
          </h2>

          <p className="mt-2 max-w-sm text-[14px] leading-6 text-[#898992]">
            {canCreate
              ? "Create your first project to start organizing tasks."
              : "No projects are available yet. Ask a project manager to create one."}
          </p>
        </div>
      )}

      {/* No search matches */}
      {!loading &&
        projects.length > 0 &&
        visibleProjects.length === 0 && (
          <div className="flex min-h-64 flex-col items-center justify-center rounded-[24px] border border-dashed border-[#dedee4] bg-white p-6 text-center">
            <Search
              size={28}
              className="text-[#9999a3]"
            />

            <h2 className="mt-3 text-lg font-semibold text-[#303036]">
              No matching projects
            </h2>

            <p className="mt-2 text-sm text-[#898992]">
              Try a different search term.
            </p>

            <button
              type="button"
              onClick={() => setQuery("")}
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-600"
            >
              <X size={15} />
              Clear search
            </button>
          </div>
        )}

      {/* Project cards */}
      {!loading && visibleProjects.length > 0 && (
        <div className="grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {visibleProjects.map(
            (project, index) => (
              <ProjectCard
                key={project.id}
                project={project}
                index={index}
                reducedMotion={reducedMotion}
                health={healthMap[project.id]}
              />
            )
          )}
        </div>
      )}

      {!loading && visibleProjects.length > 0 && (
        <p className="mt-9 text-center text-[12px] text-[#a1a1aa]">
          Select a project to open its Kanban board.
        </p>
      )}
    </main>
  );
}
