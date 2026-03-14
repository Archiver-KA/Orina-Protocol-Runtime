import { useTheme } from "./ThemeProvider";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
    >
      {/* Icon */}
      {isDark ? (
        <Moon className="w-4 h-4" />
      ) : (
        <Sun className="w-4 h-4" />
      )}

      {/* Label */}
      <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>
        {isDark ? "Dark" : "Light"}
      </span>
    </button>
  );
}