import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { errorMessage } from "@/lib/data";
import { AuthLayout } from "@/components/auth/AuthLayout";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — EduPilot" },
      { name: "description", content: "Log in to EduPilot to continue your personalised learning roadmap." },
      { property: "og:title", content: "Log in — EduPilot" },
      { property: "og:description", content: "Continue your adaptive learning journey with EduPilot." },
    ],
  }),
  component: LoginPage,
});

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBackendError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (!password) {
      toast.error("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      setLoading(false);

      if (error) {
        const errorMsg = errorMessage(error, "Could not sign you in.");
        setBackendError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      toast.success("Welcome back to EduPilot!");
      navigate({ to: "/dashboard", replace: true });
    } catch (err: unknown) {
      setLoading(false);
      const errorMsg = errorMessage(err, "An unexpected server error occurred.");
      setBackendError(errorMsg);
      toast.error(errorMsg);
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue your personalized learning roadmap."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Real Backend Error Banner */}
        {backendError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive animate-in fade-in duration-200"
          >
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold">Sign-in Error</span>
              <p className="leading-relaxed">{backendError}</p>
            </div>
          </div>
        )}

        {/* Email Field */}
        <div className="space-y-1.5 text-left">
          <Label
            htmlFor="email"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Email address
          </Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-11 rounded-xl border-input bg-card pl-10 pr-4 text-base sm:text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="space-y-1.5 text-left">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="password"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Password
            </Label>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-11 rounded-xl border-input bg-card pl-10 pr-11 text-base sm:text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        {/* Remember me & Forgot Password */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked === true)}
              className="size-4 rounded border-border"
            />
            <label
              htmlFor="remember"
              className="text-xs font-normal text-muted-foreground select-none cursor-pointer hover:text-foreground"
            >
              Remember me
            </label>
          </div>

          <Link
            to="/forgot-password"
            className="text-xs font-medium text-primary transition-colors hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        {/* Sign In Button */}
        <Button
          type="submit"
          disabled={loading || !email || !password}
          className="relative mt-2 h-11 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90 btn-lift disabled:opacity-60 disabled:pointer-events-none cursor-pointer"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Signing in...
            </span>
          ) : (
            "Sign In"
          )}
        </Button>
      </form>

      {/* Register Link Footer */}
      <div className="pt-3 text-center text-xs sm:text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          to="/signup"
          className="font-semibold text-primary transition-colors hover:underline"
        >
          Create an account
        </Link>
      </div>
    </AuthLayout>
  );
}
