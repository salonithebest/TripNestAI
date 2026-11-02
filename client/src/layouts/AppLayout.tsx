import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Plane, Plus } from "lucide-react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { primaryButtonClass, secondaryButtonClass } from "../components/ui";
import { useAuth } from "../context/useAuth";
import { pageTransition } from "../lib/motion";

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    logout();
    navigate("/", { replace: true });
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/dashboard" className="flex items-center gap-2 font-bold text-brand-700">
            <Plane size={20} /> TripNest AI
          </Link>
          <nav className="flex items-center gap-3">
            <NavLink to="/trips/new" className={primaryButtonClass}>
              <Plus size={16} /> <span className="hidden sm:inline">New trip</span>
            </NavLink>
            <span className="hidden text-sm font-medium text-ink-700 md:inline">{user?.name}</span>
            <button onClick={handleLogout} className={secondaryButtonClass} aria-label="Log out">
              <LogOut size={16} /> <span className="hidden sm:inline">Log out</span>
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={pageTransition.initial}
            animate={pageTransition.animate}
            exit={pageTransition.exit}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
