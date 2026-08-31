import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme, type Theme } from "@/lib/theme";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  variant?: "ghost" | "outline" | "default";
  size?: "sm" | "icon" | "default";
}

export function ThemeToggle({ className, variant = "outline", size = "icon" }: ThemeToggleProps) {
  const { theme, setTheme, isDark } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={cn(
            "relative size-9 rounded-xl border border-border bg-card/90 text-foreground shadow-sm backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            className,
          )}
          aria-label={`Current theme: ${theme}. Click to change theme`}
        >
          {theme === "system" ? (
            <Laptop className="size-4 transition-transform duration-200" />
          ) : isDark ? (
            <Moon className="size-4 text-indigo-400 transition-transform duration-300 hover:-rotate-12" />
          ) : (
            <Sun className="size-4 text-amber-500 transition-transform duration-300 hover:rotate-45" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36 rounded-xl border border-border bg-popover p-1.5 shadow-lg">
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className={cn(
            "flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors",
            theme === "light" && "bg-secondary font-bold text-foreground",
          )}
        >
          <Sun className="size-4 text-amber-500" />
          <span>Light</span>
          {theme === "light" && <span className="ml-auto text-[10px] text-primary">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className={cn(
            "flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors",
            theme === "dark" && "bg-secondary font-bold text-foreground",
          )}
        >
          <Moon className="size-4 text-indigo-400" />
          <span>Dark</span>
          {theme === "dark" && <span className="ml-auto text-[10px] text-primary">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className={cn(
            "flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors",
            theme === "system" && "bg-secondary font-bold text-foreground",
          )}
        >
          <Laptop className="size-4 text-muted-foreground" />
          <span>System</span>
          {theme === "system" && <span className="ml-auto text-[10px] text-primary">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
