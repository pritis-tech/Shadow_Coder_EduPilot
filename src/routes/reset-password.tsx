import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { errorMessage } from "@/lib/data";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — EduPilot" },
      { name: "description", content: "Set a new password for your EduPilot account." },
      { property: "og:title", content: "Reset Password — EduPilot" },
      { property: "og:description", content: "Set a new password for your EduPilot account." },
    ],
  }),
  component: ResetPasswordPage,
});

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const isPasswordTooShort = password.length > 0 && password.length < 6;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBackendError(null);

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      setLoading(false);

      if (error) {
        const errorMsg = errorMessage(error, "Could not update your password.");
        setBackendError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      setSuccess(true);
      toast.success("Password updated successfully!");
    } catch (err: unknown) {
      setLoading(false);
      const errorMsg = errorMessage(err, "An unexpected server error occurred.");
      setBackendError(errorMsg);
      toast.error(errorMsg);
    }
  }

  return (
    <AuthLayout
      title={success ? "Password Updated" : "Set New Password"}
      subtitle={
        success
          ? "Your account password has been updated successfully."
          : "Please choose a strong password to protect your account."
      }
    >
      {success ? (
        <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-success/10 border border-success/20 text-success shadow-inner">
            <CheckCircle2 className="size-8" />
          </div>

          <div className="rounded-xl border border-border bg-muted/40 p-4 text-xs text-muted-foreground leading-relaxed">
            <p>
              You can now log in to your EduPilot learning space with your new password.
            </p>
          </div>

          <Button
            asChild
            className="h-11 w-full rounded-xl bg-primary font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 btn-lift"
          >
            <Link to="/login">Continue to Log in</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          {backendError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive animate-in fade-in duration-200"
            >
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold">Update Error</span>
                <p className="leading-relaxed">{backendError}</p>
              </div>
            </div>
          )}

          {/* New Password Field */}
          <div className="space-y-1.5 text-left">
            <Label
              htmlFor="new-password"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              New Password
            </Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="new-password"
                name="new-password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
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
            {isPasswordTooShort && (
              <p className="text-[11px] text-amber-500 font-medium">Password must be at least 6 characters</p>
            )}
            <PasswordStrengthIndicator password={password} />
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-1.5 text-left">
            <Label
              htmlFor="confirm-password"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Confirm Password
            </Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="confirm-password"
                name="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                className="h-11 rounded-xl border-input bg-card pl-10 pr-11 text-base sm:text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {passwordMismatch && (
              <p className="text-[11px] text-destructive font-medium">Passwords do not match</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading || passwordMismatch || (password.length > 0 && password.length < 6)}
            className="mt-2 h-11 w-full rounded-xl bg-primary font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90 btn-lift disabled:opacity-60 disabled:pointer-events-none cursor-pointer"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" /> Updating password...
              </span>
            ) : (
              "Update Password"
            )}
          </Button>

          <div className="pt-2 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" /> Back to Login
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}
