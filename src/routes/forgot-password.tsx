import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AlertCircle, ArrowLeft, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { errorMessage } from "@/lib/data";
import { AuthLayout } from "@/components/auth/AuthLayout";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot Password — EduPilot" },
      { name: "description", content: "Reset your EduPilot account password." },
      { property: "og:title", content: "Forgot Password — EduPilot" },
      { property: "og:description", content: "Reset your EduPilot account password." },
    ],
  }),
  component: ForgotPasswordPage,
});

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBackendError(null);

    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      setLoading(false);

      if (error) {
        const errorMsg = errorMessage(error, "Could not send password reset email.");
        setBackendError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      setSent(true);
      toast.success("Reset link sent!");
    } catch (err: unknown) {
      setLoading(false);
      const errorMsg = errorMessage(err, "An unexpected server error occurred.");
      setBackendError(errorMsg);
      toast.error(errorMsg);
    }
  }

  return (
    <AuthLayout
      title={sent ? "Check your email" : "Reset your password"}
      subtitle={
        sent
          ? `We've sent a password reset link to ${email}`
          : "Enter your registered email address and we'll send you instructions to reset your password."
      }
    >
      {sent ? (
        <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary shadow-inner">
            <Mail className="size-8" />
          </div>

          <div className="rounded-xl border border-border bg-muted/40 p-4 text-xs text-muted-foreground leading-relaxed">
            <p>
              Please check your inbox and spam folder. Click the link inside to set a new password.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              asChild
              className="h-11 w-full rounded-xl bg-primary font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 btn-lift"
            >
              <Link to="/login">Back to Login</Link>
            </Button>

            <button
              type="button"
              onClick={() => setSent(false)}
              className="text-xs text-primary transition-colors hover:underline"
            >
              Didn&apos;t receive the email? Try another address
            </button>
          </div>
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
                <span className="font-bold">Reset Error</span>
                <p className="leading-relaxed">{backendError}</p>
              </div>
            </div>
          )}

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

          <Button
            type="submit"
            disabled={loading || !email}
            className="h-11 w-full rounded-xl bg-primary font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90 btn-lift disabled:opacity-60 disabled:pointer-events-none cursor-pointer"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" /> Sending link...
              </span>
            ) : (
              "Send Reset Link"
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
