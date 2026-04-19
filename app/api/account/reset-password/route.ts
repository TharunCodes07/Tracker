import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

export async function POST() {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session?.user?.email) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const newPassword = session.user.email.trim();

  if (newPassword.length < 8) {
    return NextResponse.json(
      {
        message:
          "Cannot reset password to email because the email is shorter than 8 characters.",
      },
      { status: 400 }
    );
  }

  try {
    await auth.api.setPassword({
      headers: requestHeaders,
      body: { newPassword },
    });

    return NextResponse.json({
      message: "Password reset successful. Your new password is your email address.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to reset password at the moment.";

    return NextResponse.json({ message }, { status: 500 });
  }
}
