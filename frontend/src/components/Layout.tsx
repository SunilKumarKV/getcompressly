import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Moon, Sun, Zap } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const nav = [
  { to: "/compress", label: "Compress" },
  { to: "/pricing", label: "Pricing" },
  { to: "/dashboard", label: "Dashboard" }
];

export function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-600 text-white"><Zap size={18} /></span>
            <span>GetCompressly</span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            {nav.map((item) => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => `text-sm ${isActive ? "text-emerald-600" : "text-slate-600 dark:text-slate-300"}`}>
                {item.label}
              </NavLink>
            ))}
            {user?.role === "ADMIN" && <NavLink to="/admin" className="text-sm text-slate-600 dark:text-slate-300">Admin</NavLink>}
          </nav>
          <div className="flex items-center gap-2">
            <button aria-label="Toggle theme" onClick={toggleTheme} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 dark:border-slate-800">
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            {user ? (
              <button onClick={() => { logout(); navigate("/"); }} className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white dark:bg-white dark:text-slate-950">Logout</button>
            ) : (
              <Link to="/login" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white">Login</Link>
            )}
          </div>
        </div>
      </header>
      <main><Outlet /></main>
      <footer className="border-t border-slate-200 py-8 dark:border-slate-800">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 text-sm text-slate-500 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <span>© 2026 GetCompressly</span>
          <span className="flex gap-4"><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link></span>
        </div>
      </footer>
    </div>
  );
}
