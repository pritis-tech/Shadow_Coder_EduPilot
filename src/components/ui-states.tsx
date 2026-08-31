import { AlertCircle, HelpCircle, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { statusFor, STATUS_LABEL } from "@/lib/edupilot-types";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground animate-in fade-in duration-300">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Loader2 className="size-6 animate-spin" />
      </div>
      <p className="text-sm font-semibold text-foreground">{label}</p>
    </div>
  );
}

export function CardSkeletons({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-32 w-full rounded-2xl bg-muted/60" />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="surface flex flex-col items-center gap-3.5 px-6 py-14 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <HelpCircle className="size-6" />
      </div>
      <h3 className="text-lg font-bold text-foreground">{title}</h3>
      <p className="max-w-md text-xs sm:text-sm text-muted-foreground leading-relaxed">{description}</p>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="surface flex flex-col items-center gap-3.5 border-destructive/30 bg-destructive/5 px-6 py-12 text-center rounded-2xl">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertCircle className="size-6" />
      </div>
      <h3 className="text-base font-bold text-destructive">Something went wrong</h3>
      <p className="max-w-md text-xs sm:text-sm text-muted-foreground leading-relaxed">{message}</p>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

export function MasteryBar({ value }: { value: number }) {
  const tone =
    value >= 80 ? "bg-success" : value >= 60 ? "bg-primary" : value >= 45 ? "bg-warning" : "bg-destructive";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary border border-border/50">
      <div
        className={cn("h-full rounded-full transition-all duration-300", tone)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function StatusBadge({ mastery, status }: { mastery: number; status?: string }) {
  const key = (status && status in STATUS_LABEL ? status : statusFor(mastery)) as keyof typeof STATUS_LABEL;
  const tone =
    key === "mastered"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-success/40 dark:bg-success/10 dark:text-success"
      : key === "improving"
        ? "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-primary/40 dark:bg-primary/10 dark:text-primary"
        : key === "needs_practice"
          ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-warning/50 dark:bg-warning/15 dark:text-amber-400"
          : key === "not_started"
            ? "border-border bg-secondary text-muted-foreground"
            : "border-rose-200 bg-rose-50 text-rose-700 dark:border-destructive/40 dark:bg-destructive/10 dark:text-destructive";
  return (
    <Badge variant="outline" className={cn("text-xs font-semibold px-2.5 py-0.5 shadow-2xs", tone)}>
      {STATUS_LABEL[key]}
    </Badge>
  );
}
