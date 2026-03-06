import { useEffect, useState } from "react";
import ThemeContext from "./theme-context";

export const ThemeProvider = ({ children }) => {
  // Initialize from localStorage or system preference
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("app-theme");
    if (saved) return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  useEffect(() => {
    // Save to local storage
    localStorage.setItem("app-theme", theme);
    
    // Apply to html element
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

