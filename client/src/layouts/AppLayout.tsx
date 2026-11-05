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
    <div className="travel-night min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#07132f]/85 text-white backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/dashboard" className="flex items-center gap-2 font-bold tracking-tight text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-300 to-blue-500 text-blue-950">
              <Plane size={18} />
            </span>
            <span>TripNest <span className="text-cyan-300">AI</span></span>
          </Link>
          <nav className="flex items-center gap-3">
            <NavLink
              to="/dashboard"
              className={({ isActive }) => `hidden rounded-xl px-3 py-2 text-sm font-semibold transition sm:inline-flex ${isActive ? "bg-white/10 text-cyan-100" : "text-blue-100/70 hover:bg-white/[0.06] hover:text-white"}`}
            >
              Trips
            </NavLink>
            <NavLink to="/trips/new" className={primaryButtonClass}>
              <Plus size={16} /> <span className="hidden sm:inline">New trip</span>
            </NavLink>
            <span className="hidden text-sm font-medium text-blue-100/80 md:inline">{user?.name}</span>
            <button
              onClick={handleLogout}
              className={`${secondaryButtonClass} border-white/15 bg-white/[0.06] text-white hover:border-cyan-200 hover:bg-white/10 hover:text-white`}
              aria-label="Log out"
            >
              <LogOut size={16} /> <span className="hidden sm:inline">Log out</span>
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-3 py-6 sm:px-5 sm:py-8">
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
