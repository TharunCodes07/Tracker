import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = {
  title: "Sign Up | Tracker",
  description: "Create a Tracker account for your team workspace.",
};

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}
