
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  FolderKanban,
  Globe2,
  LayoutGrid,
  LoaderCircle,
  Plus,
  Smartphone,
  Sparkles,
} from "lucide-react";
import api from "../api";
import { useAuth } from "../Context/useAuth";
import Notifications from "../components/Notifications";

const themes = [
  {
    background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 58%, #c7d2fe 100%)",
    accent: "#2563eb",
    glow: "rgba(99, 102, 241, 0.20)",
    icon: Smartphone,
  },
  {
    background: "linear-gradient(135deg, #fff1f2 0%, #ffe4e6 55%, #fed7aa 100%)",
    accent: "#f97316",
    glow: "rgba(251, 113, 133, 0.18)",
    icon: Globe2,
  },
  {
    background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 55%, #bbf7d0 100%)",
    accent: "#16a34a",
    glow: "rgba(34, 197, 94, 0.18)",
    icon: FolderKanban,
  },
  {
    background: "linear-gradient(135deg, #faf5ff 0%, #f3e8ff 55%, #ddd6fe 100%)",
    accent: "#9333ea",
    glow: "rgba(168, 85, 247, 0.20)",
    icon: Sparkles,
  },
  {
    background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 55%, #fde68a 100%)",
    accent: "#d97706",
    glow: "rgba(245, 158, 11, 0.20)",
    icon: LayoutGrid,
  },
];

function ProjectCard({ project, index, reducedMotion }) {
  const theme = themes[index % themes.length];
  const Icon = theme.icon;
  const taskCount = project._count?.tasks ?? 0;

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reducedMotion ? 0 : 0.48,
        delay: reducedMotion ? 0 : Math.min(index * 0.07, 0.35),
        ease: [0.22, 1, 0.36, 1],
      }}
      className="min-w-0"
    >
      <Link
        to={`/projects/${project.id}`}
        className="group flex h-full flex-col overflow-hidden rounded-[26px] border border-[#e9e9ed] bg-white p-2.25 shadow-[0_8px_28px_rgba(0,0,0,0.035)] transition-all duration-300 hover:-translate-y-1.5 hover:border-[#d9dce4] hover:shadow-[0_22px_55px_rgba(30,40,70,0.10)] focus-visible:outline-2 focus-visible:outline-blue-500"
      >
        {/* Pastel project artwork */}
        <div
          className="relative h-44 overflow-hidden rounded-[19px] sm:h-48"
          style={{ background: theme.background }}
        >
          {/* Decorative shapes */}
          <div
            className="absolute -bottom-20 -right-10 h-56 w-56 rotate-[-28deg] rounded-[65px] opacity-60 blur-[1px] transition-transform duration-700 ease-out group-hover:-translate-x-3.5 group-hover:-translate-y-3 group-hover:rotate-[-16deg]"
            style={{ background: theme.glow }}
          />

          <div className="absolute -bottom-24 right-16 h-52 w-52 rotate-45 rounded-[60px] bg-white/35 transition-transform duration-700 group-hover:-translate-y-4" />

          <div className="absolute -right-10 -top-15 h-44 w-44 rounded-full border border-white/45" />

          <div className="absolute right-5 top-5 flex items-center gap-1.5 rounded-full border border-white/60 bg-white/60 px-3 py-1.5 text-[10px] font-semibold tracking-wide text-[#64646e] backdrop-blur-md">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: theme.accent }}
            />
            PROJECT
          </div>

          <div className="absolute left-6 top-1/2 flex h-16.5 w-16.5 -translate-y-1/2 items-center justify-center rounded-[20px] border border-white/70 bg-white/65 shadow-[0_12px_25px_rgba(50,60,100,0.09)] backdrop-blur-xl transition-transform duration-500 group-hover:scale-110">
            <Icon
              size={29}
              strokeWidth={1.7}
              style={{ color: theme.accent }}
            />
          </div>
        </div>

        {/* Card information */}
        <div className="flex flex-1 flex-col px-5 pb-5 pt-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="min-w-0 wrap-break-word text-[19px] font-semibold tracking-[-0.65px] text-[#1d1d1f] sm:text-[21px]">
              {project.name}
            </h3>

            <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f5f5f7] text-[#74747b] transition-all duration-300 group-hover:bg-[#1d1d1f] group-hover:text-white">
              <ArrowRight size={16} />
            </span>
          </div>

          <p className="mt-2 text-[13px] leading-6 text-[#898992]">
            Organize tasks, collaborate, and track your work.
          </p>

          <div className="mt-auto pt-7">
            <div className="h-px w-full bg-[#f0f0f2]" />

            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center gap-2 text-[12px] font-medium text-[#85858d]">
                <LayoutGrid size={15} strokeWidth={1.8} />
                <span>
                  {taskCount} {taskCount === 1 ? "task" : "tasks"}
                </span>
              </div>

              <span
                className="flex items-center gap-1 text-[12px] font-semibold transition-all duration-300 group-hover:gap-2"
                style={{ color: theme.accent }}
              >
                Open board
                <ChevronRight size={15} />
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
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const canCreate = ["ADMIN", "PROJECT_MANAGER"].includes(
    user?.role
  );

  const load = useCallback(async () => {
    try {
      const response = await api.get("/projects");
      setProjects(response.data);
      setError("");
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
      } else {
        setError("Could not load projects. Please try again.");
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

    if (trimmedName.length < 2 || creating) {
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
      if (err.response?.status === 401) {
        logout();
      } else {
        setError("Could not create project. Please try again.");
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-362.5 px-5 pb-20 pt-9 sm:px-8 lg:px-12 lg:pt-12">
      <Notifications />

      {/* Page heading */}
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.4 }}
        className="mb-9 flex flex-col justify-between gap-5 sm:flex-row sm:items-center"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[19px] border border-[#e4e9f4] bg-linear-to-br from-white to-[#eaf1ff] text-[#2563eb] shadow-[0_5px_18px_rgba(37,99,235,0.06)]">
            <FolderKanban size={26} strokeWidth={1.7} />
          </div>

          <div>
            <h1 className="text-[30px] font-bold tracking-[-1.4px] text-[#1d1d1f] sm:text-[36px]">
              Projects
            </h1>
            <p className="mt-1 text-[13px] leading-5 text-[#898992] sm:text-[14px]">
              A beautiful place to organize everything you're working on.
            </p>
          </div>
        </div>

        {!loading && (
          <div className="flex items-center gap-2 self-start rounded-full border border-[#e7e7eb] bg-white px-4 py-2 text-[12px] font-medium text-[#73737b] shadow-sm sm:self-auto">
            <Check size={14} className="text-[#34c759]" />
            {projects.length}{" "}
            {projects.length === 1 ? "project" : "projects"}
          </div>
        )}
      </motion.div>

      {/* Create project */}
      {canCreate && (
        <form
          onSubmit={create}
          className="mb-10 flex flex-col gap-3 sm:flex-row"
        >
          <div className="flex min-h-15 flex-1 items-center gap-3 rounded-[19px] border border-[#e4e4e9] bg-white px-5 shadow-[0_3px_14px_rgba(0,0,0,0.025)] transition-all duration-200 focus-within:border-[#a7bfff] focus-within:shadow-[0_0_0_4px_rgba(59,130,246,0.07)]">
            <Plus size={20} className="shrink-0 text-[#9b9ba4]" />

            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="New project name"
              aria-label="New project name"
              minLength={2}
              required
              disabled={creating}
              className="h-full min-h-14.5 w-full min-w-0 border-0 bg-transparent text-[14px] text-[#1d1d1f] outline-none placeholder:text-[#aaaab2] focus:shadow-none"
            />
          </div>

          <button
            type="submit"
            disabled={creating || name.trim().length < 2}
            className="flex min-h-15 items-center justify-center gap-2 rounded-[19px] bg-[#2563eb] px-7 text-[14px] font-semibold text-white shadow-[0_7px_18px_rgba(37,99,235,0.17)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#1d4ed8] hover:shadow-[0_10px_25px_rgba(37,99,235,0.23)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 sm:min-w-38.75"
          >
            {creating ? (
              <>
                <LoaderCircle size={17} className="animate-spin" />
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
          className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-[13px] text-red-700"
        >
          {error}
        </div>
      )}

      {/* Loading cards */}
      {loading && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="animate-pulse rounded-[26px] border border-[#e9e9ed] bg-white p-2.25"
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

      {/* Empty state */}
      {!loading && projects.length === 0 && (
        <div className="flex min-h-82.5 flex-col items-center justify-center rounded-[28px] border border-dashed border-[#dedee4] bg-white/60 px-6 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#f1f5ff] text-[#2563eb]">
            <FolderKanban size={29} strokeWidth={1.6} />
          </div>

          <h2 className="text-[21px] font-semibold tracking-tight text-[#1d1d1f]">
            Your workspace starts here.
          </h2>

          <p className="mt-2 max-w-sm text-[14px] leading-6 text-[#898992]">
            {canCreate
              ? "Create your first project to start organizing tasks and collaborating with your team."
              : "No projects are available yet. Ask a project manager to create one."}
          </p>
        </div>
      )}

      {/* Project cards */}
      {!loading && projects.length > 0 && (
        <div className="grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project, index) => (
            <ProjectCard
              key={project.id}
              project={project}
              index={index}
              reducedMotion={reducedMotion}
            />
          ))}
        </div>
      )}

      {/* Bottom caption */}
      {!loading && projects.length > 0 && (
        <p className="mt-9 text-center text-[12px] text-[#a1a1aa]">
          Select a project to open its task board.
        </p>
      )}
    </main>
  );
}
