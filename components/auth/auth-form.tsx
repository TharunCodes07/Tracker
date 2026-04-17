"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

type AuthMode = "login" | "signup";

type AuthFormValues = {
  name: string;
  email: string;
  password: string;
};

const authCopy = {
  login: {
    eyebrow: "Welcome Back",
    title: "Sign in to Tracker",
    description: "Use your email and password to continue to the workspace.",
    cta: "Sign In",
    alternateLabel: "Need an account?",
    alternateHref: "/signup",
    alternateAction: "Create one",
  },
  signup: {
    eyebrow: "Get Started",
    title: "Create your account",
    description: "Set up access for your team and start tracking work in one place.",
    cta: "Create Account",
    alternateLabel: "Already have an account?",
    alternateHref: "/login",
    alternateAction: "Sign in",
  },
} as const;

function getErrorMessage(error: unknown) {
  if (typeof error === "object" && error && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return "Something went wrong. Please try again.";
}

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const [values, setValues] = useState<AuthFormValues>({
    name: "",
    email: "",
    password: "",
  });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const copy = useMemo(() => authCopy[mode], [mode]);
  const isSignup = mode === "signup";

  useEffect(() => {
    if (session?.user) {
      router.replace("/dashboard");
      router.refresh();
    }
  }, [router, session]);

  function updateValue(field: keyof AuthFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending || isSessionPending) {
      return;
    }

    if (isSignup && values.password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError(null);
    setPending(true);

    try {
      if (isSignup) {
        const { data, error: signUpError } = await authClient.signUp.email({
          name: values.name.trim(),
          email: values.email.trim(),
          password: values.password,
          callbackURL: "/dashboard",
        });

        if (signUpError) {
          setError(getErrorMessage(signUpError));
          return;
        }

        router.replace(data?.token ? "/dashboard" : "/login");
        router.refresh();
        return;
      }

      const { data, error: signInError } = await authClient.signIn.email({
        email: values.email.trim(),
        password: values.password,
        callbackURL: "/dashboard",
      });

      if (signInError) {
        setError(getErrorMessage(signInError));
        return;
      }

      router.replace(data?.url || "/dashboard");
      router.refresh();
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="border-border/60 bg-background/85 py-0 shadow-xl shadow-black/5 backdrop-blur dark:bg-card/85">
      <CardHeader className="border-b border-border/60 px-6 py-6">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-emerald-500/90">
            {copy.eyebrow}
          </p>
          <CardTitle className="text-2xl">{copy.title}</CardTitle>
          <CardDescription className="max-w-sm text-sm leading-6">
            {copy.description}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-6 py-7">
        <form className="space-y-4" onSubmit={handleSubmit}>
          {isSignup ? (
            <div className="space-y-2.5">
              <label className="text-sm font-medium text-foreground" htmlFor="name">
                Full name
              </label>
              <Input
                id="name"
                autoComplete="name"
                className="h-10"
                placeholder="Jane Cooper"
                required
                value={values.name}
                onChange={(event) => updateValue("name", event.target.value)}
              />
            </div>
          ) : null}

          <div className="space-y-2.5">
            <label className="text-sm font-medium text-foreground" htmlFor="email">
              Email
            </label>
            <Input
              id="email"
              autoComplete="email"
              className="h-10"
              placeholder="name@company.com"
              required
              type="email"
              value={values.email}
              onChange={(event) => updateValue("email", event.target.value)}
            />
          </div>

          <div className="space-y-2.5">
            <label className="text-sm font-medium text-foreground" htmlFor="password">
              Password
            </label>
            <Input
              id="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              className="h-10"
              minLength={8}
              placeholder={isSignup ? "Create a strong password" : "Enter your password"}
              required
              type="password"
              value={values.password}
              onChange={(event) => updateValue("password", event.target.value)}
            />
          </div>

          {isSignup ? (
            <div className="space-y-2.5">
              <label
                className="text-sm font-medium text-foreground"
                htmlFor="confirm-password"
              >
                Confirm password
              </label>
              <Input
                id="confirm-password"
                autoComplete="new-password"
                className="h-10"
                minLength={8}
                placeholder="Repeat your password"
                required
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>
          ) : null}

          {error ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <Button
            className="h-10 w-full justify-between px-4"
            disabled={pending || isSessionPending}
            size="lg"
            type="submit"
          >
            <span>{pending ? "Please wait" : copy.cta}</span>
            {pending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <ArrowRight className="size-4" />
            )}
          </Button>
        </form>

        <p className="mt-6 text-sm text-muted-foreground">
          {copy.alternateLabel}{" "}
          <Link
            className="font-medium text-foreground underline-offset-4 transition-colors hover:text-emerald-500 hover:underline"
            href={copy.alternateHref}
          >
            {copy.alternateAction}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
