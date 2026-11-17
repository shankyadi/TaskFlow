
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  Bell,
  ChartNoAxesCombined,
  ChevronRight,
  Command,
  FolderKanban,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import api from "../api";
import { useAuth } from "../Context/useAuth";

const navigation = [
  {
    to: "/",
    label: "Projects",
    icon: FolderKanban,
    end: true,
  },
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: ChartNoAxesCombined,
  },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const reducedMotion = useReducedMotion();

  const [unread, setUnread] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let active = true;

    const loadNotifications = async () => {
      try {
        const response = await api.get("/notifications");

        if (active) {
          setUnread(response.data.unread ?? 0);
        }
      } catch {
        // Notification polling should not interrupt navigation.
      }
    };

    void loadNotifications();

    const timer = setInterval(loadNotifications, 10000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const initials = (user?.name || "User")
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const role = user?.role?.replaceAll("_", " ") || "Member";

  const pageTitle =
    location.pathname === "/dashboard"
      ? "Dashboard"
      : location.pathname.startsWith("/projects/")
        ? "Project board"
        : "Projects";

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="tf-app-shell">
      {/* Mobile navigation bar */}
      <header className="tf-mobile-header">
        <div className="tf-brand">
          <span className="tf-brand-mark">
            <Command size={19} strokeWidth={2.2} />
          </span>
          <span>TaskFlow</span>
        </div>

        <button
          type="button"
          className="tf-icon-button"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </header>

      {mobileOpen && (
        <button
          type="button"
          className="tf-mobile-backdrop"
          aria-label="Close navigation"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`tf-sidebar ${mobileOpen ? "tf-sidebar-open" : ""}`}
      >
        <div className="tf-sidebar-top">
          <NavLink
            to="/"
            className="tf-brand tf-desktop-brand"
            onClick={closeMobile}
          >
            <span className="tf-brand-mark">
              <Command size={19} strokeWidth={2.2} />
            </span>
            <span>TaskFlow</span>
          </NavLink>

          <div className="tf-workspace-label">
            WORKSPACE
          </div>

          <nav className="tf-nav" aria-label="Main navigation">
            {navigation.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={closeMobile}
                className={({ isActive }) =>
                  `tf-nav-link ${isActive ? "tf-nav-active" : ""}`
                }
              >
                <Icon size={19} strokeWidth={1.8} />
                <span>{label}</span>
                <ChevronRight size={15} className="tf-nav-chevron" />
              </NavLink>
            ))}
          </nav>

          <div className="tf-sidebar-divider" />

          <div className="tf-sidebar-section-title">
            ACTIVITY
          </div>

          <NavLink
            to="/"
            end
            onClick={closeMobile}
            className="tf-nav-link"
          >
            <Bell size={19} strokeWidth={1.8} />
            <span>Notifications</span>
            {unread > 0 && (
              <span className="tf-notification-count">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </NavLink>

          <div className="tf-sidebar-note">
            <span className="tf-note-dot" />
            Your workspace, in sync.
          </div>
        </div>

        {/* Profile */}
        <div className="tf-sidebar-bottom">
          <div className="tf-profile">
            <div className="tf-avatar">{initials}</div>

            <div className="tf-profile-info">
              <span className="tf-profile-name">
                {user?.name || "User"}
              </span>
              <span className="tf-profile-role">{role}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="tf-logout"
          >
            <LogOut size={17} strokeWidth={1.8} />
            <span>Sign out</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </aside>

      {/* Main workspace */}
      <div className="tf-main-area">
        <div className="tf-topbar">
          <div className="tf-breadcrumb">
            <span>Workspace</span>
            <ChevronRight size={15} />
            <strong>{pageTitle}</strong>
          </div>

          <div className="tf-topbar-right">
            <span className="tf-status-dot" />
            <span>TaskFlow Workspace</span>
          </div>
        </div>

        <div className="tf-page-viewport">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              className="tf-page-transition"
              initial={
                reducedMotion
                  ? false
                  : { opacity: 0, y: 12 }
              }
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={
                reducedMotion
                  ? { opacity: 1 }
                  : { opacity: 0, y: -7 }
              }
              transition={{
                duration: reducedMotion ? 0 : 0.28,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
