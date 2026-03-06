import { HiMoon, HiSun } from "react-icons/hi";
import { useTheme } from "../context/useTheme";
import { cn } from "../utils/cn";

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      aria-pressed={dark}
      className={cn(
        "relative inline-flex h-8 w-14 items-center rounded-full border border-border px-1 transition-colors",
        dark ? "bg-surface-lighter" : "bg-surface-light"
      )}
    >
      <span className="absolute left-1.5 text-amber-500">
        <HiSun className="size-3.5" />
      </span>
      <span className="absolute right-1.5 text-indigo-300">
        <HiMoon className="size-3.5" />
      </span>
      <span
        className={cn(
          "relative z-10 block size-5 rounded-full border border-border bg-surface shadow-sm transition-transform",
          dark ? "translate-x-6" : "translate-x-0"
        )}
      />
    </button>
  );
};

export default ThemeToggle;
