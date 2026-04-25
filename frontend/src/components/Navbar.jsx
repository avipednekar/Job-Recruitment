import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { HiMenu, HiX } from "react-icons/hi";
import { FaBrain } from "react-icons/fa";
import ThemeToggle from "./ThemeToggle";
import Button from "./ui/Button";
import Badge from "./ui/Badge";
import { useAuth } from "../context/useAuth";
import { cn } from "../utils/cn";
import NotificationDropdown from "./NotificationDropdown";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const closeMenu = () => setIsOpen(false);
  const profileLabel = user?.role === "job_seeker" ? "Dashboard" : "Profile";

  const handleLogout = async () => {
    await logout();
    closeMenu();
    navigate("/");
  };

  const linkClass = (path) =>
    cn(
      "px-3 py-2 rounded-xl text-sm font-semibold transition-colors duration-200",
      location.pathname === path
        ? "bg-primary/15 text-primary"
        : "text-text-secondary hover:text-text-primary hover:bg-surface-lighter"
    );

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-surface/85 backdrop-blur-xl">
      <nav className="section-container">
        <div className="flex h-[4.75rem] items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center gap-2.5" onClick={closeMenu}>
            <img src="/images/logo.png" alt="RecruitAI" className="size-10 rounded-2xl shadow-md" />
            <span className="font-display text-xl tracking-tight text-text-primary">RecruitAI</span>
          </Link>

          <div className="hidden md:flex items-center gap-2">
            <Link className={linkClass("/")} to="/">
              Home
            </Link>
            <Link className={linkClass("/jobs")} to="/jobs">
              Jobs
            </Link>
            <Link className={linkClass("/ats-checker")} to="/ats-checker">
              ATS Checker
            </Link>
            {isAuthenticated ? (
              <Link className={linkClass("/profile")} to="/profile">
                {profileLabel}
              </Link>
            ) : null}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            <div className="h-7 w-px bg-border" />
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <NotificationDropdown />
                <span className="hidden sm:flex items-center gap-2 rounded-xl border border-border px-2 py-1.5 ml-2">
                  <span className="grid size-8 place-items-center rounded-full bg-primary text-white text-sm font-bold">
                    {user?.name?.charAt(0)?.toUpperCase() || "U"}
                  </span>
                  <span className="max-w-28 truncate text-sm font-semibold text-text-primary">{user?.name}</span>
                  <Badge tone="brand">{user?.role === "job_seeker" ? "Seeker" : "Recruiter"}</Badge>
                </span>
                <Button variant="secondary" size="sm" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="btn btn-ghost btn-sm">
                  Log In
                </Link>
                <Link to="/register" className="btn btn-primary btn-sm">
                  Get Started
                </Link>
              </div>
            )}
          </div>

          <div className="md:hidden flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              className="btn btn-secondary btn-sm min-w-10"
              onClick={() => setIsOpen((prev) => !prev)}
              aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
            >
              {isOpen ? <HiX className="size-5" /> : <HiMenu className="size-5" />}
            </button>
          </div>
        </div>
      </nav>

      <div className={cn("md:hidden overflow-hidden transition-all duration-300", isOpen ? "max-h-96 border-t border-border" : "max-h-0")}>
        <div className="section-container space-y-2 py-3 bg-surface">
          <Link to="/" className={cn("block", linkClass("/"))} onClick={closeMenu}>
            Home
          </Link>
          <Link to="/jobs" className={cn("block", linkClass("/jobs"))} onClick={closeMenu}>
            Jobs
          </Link>
          <Link to="/ats-checker" className={cn("block", linkClass("/ats-checker"))} onClick={closeMenu}>
            ATS Checker
          </Link>
          {isAuthenticated ? (
            <Link to="/profile" className={cn("block", linkClass("/profile"))} onClick={closeMenu}>
              {profileLabel}
            </Link>
          ) : null}

          <div className="mt-3 border-t border-border pt-3 space-y-2">
            {isAuthenticated ? (
              <>
                <div className="rounded-xl border border-border bg-surface-light px-3 py-2">
                  <p className="text-sm font-semibold text-text-primary truncate">{user?.name}</p>
                  <p className="text-xs text-text-secondary truncate">{user?.email}</p>
                </div>
                <Button variant="secondary" size="md" className="w-full" onClick={handleLogout}>
                  Logout
                </Button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link to="/login" className="btn btn-secondary btn-md" onClick={closeMenu}>
                  Log In
                </Link>
                <Link to="/register" className="btn btn-primary btn-md" onClick={closeMenu}>
                  Join
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
