"use client";

import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { KeyRound, Monitor, Moon, Palette, RotateCcw, Sun, User } from "lucide-react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const DEFAULT_FONT_SIZE = 16;
const FONT_SIZE_STORAGE_KEY = "tracker:settings:font-size";

function getInitials(name: string) {
  const trimmedName = name.trim();

  if (!trimmedName) {
    return "US";
  }

  const words = trimmedName.split(/\s+/).filter(Boolean);
  const initials = words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

  return initials || "US";
}

function applyRootFontSize(value: number) {
  document.documentElement.style.setProperty("--base-font-size", `${value}px`);
}

function getStoredFontSize() {
  if (typeof window === "undefined") {
    return DEFAULT_FONT_SIZE;
  }

  const storedValue = Number(window.localStorage.getItem(FONT_SIZE_STORAGE_KEY));

  if (Number.isFinite(storedValue) && storedValue >= 12 && storedValue <= 24) {
    return storedValue;
  }

  return DEFAULT_FONT_SIZE;
}

export default function SettingsPage() {
  const { data: session } = authClient.useSession();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState("account");
  const [fontSize, setFontSize] = useState(() => [getStoredFontSize()]);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const userName = session?.user?.name || "Unknown User";
  const userEmail = session?.user?.email || "";
  const userImage = session?.user?.image || "";
  const userInitials = useMemo(() => getInitials(userName), [userName]);

  useEffect(() => {
    applyRootFontSize(fontSize[0] ?? DEFAULT_FONT_SIZE);
  }, [fontSize]);

  function handleFontSizeChange(size: number[]) {
    const value = size[0] ?? DEFAULT_FONT_SIZE;
    setFontSize([value]);
    applyRootFontSize(value);
    window.localStorage.setItem(FONT_SIZE_STORAGE_KEY, String(value));
  }

  function resetFontSize() {
    setFontSize([DEFAULT_FONT_SIZE]);
    applyRootFontSize(DEFAULT_FONT_SIZE);
    window.localStorage.setItem(FONT_SIZE_STORAGE_KEY, String(DEFAULT_FONT_SIZE));
  }

  async function handleResetPasswordToEmail() {
    if (isResettingPassword) {
      return;
    }

    setIsResettingPassword(true);

    try {
      const response = await fetch("/api/account/reset-password", {
        method: "POST",
      });

      const payload = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.message || "Failed to reset password.");
      }

      toast.success(payload?.message || "Password has been reset to your email.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong while resetting password.";
      toast.error(message);
    } finally {
      setIsResettingPassword(false);
    }
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your profile, appearance, and security.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <Card className="lg:col-span-1 lg:sticky lg:top-20 lg:self-start">
          <CardContent className="p-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <Avatar className="h-24 w-24 ring-4 ring-primary/15">
                <AvatarImage src={userImage} alt={userName} />
                <AvatarFallback className="bg-primary/90 text-2xl font-semibold text-primary-foreground">
                  {userInitials}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-1">
                <h2 className="text-lg font-semibold">{userName}</h2>
                <p className="text-sm text-muted-foreground">{userEmail}</p>
              </div>

              <Badge variant="secondary">Workspace Member</Badge>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-3">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="account">
                <User className="mr-2 h-4 w-4" />
                Account
              </TabsTrigger>
              <TabsTrigger value="appearance">
                <Palette className="mr-2 h-4 w-4" />
                Appearance
              </TabsTrigger>
            </TabsList>

            <TabsContent value="account">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Profile Details
                  </CardTitle>
                  <CardDescription>
                    Your core account information and security controls.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="full-name">Full Name</Label>
                      <Input id="full-name" value={userName} disabled />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email-address">Email Address</Label>
                      <Input id="email-address" type="email" value={userEmail} disabled />
                    </div>
                  </div>

                  <div className="rounded-xl border p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <KeyRound className="h-4 w-4 text-primary" />
                      <h3 className="font-medium">Reset Password</h3>
                    </div>
                    <p className="mb-4 text-sm text-muted-foreground">
                      Reset your password and set it to your current email address.
                    </p>
                    <Button onClick={handleResetPasswordToEmail} disabled={isResettingPassword}>
                      {isResettingPassword ? "Resetting..." : "Reset Password To Email"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="appearance">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5 text-primary" />
                    Theme and Display
                  </CardTitle>
                  <CardDescription>Personalize your visual workspace preferences.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <Label>Theme Mode</Label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {[
                        {
                          label: "Light",
                          value: "light",
                          icon: Sun,
                        },
                        {
                          label: "Dark",
                          value: "dark",
                          icon: Moon,
                        },
                        {
                          label: "System",
                          value: "system",
                          icon: Monitor,
                        },
                      ].map((option) => {
                        const isActive = theme === option.value;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setTheme(option.value)}
                            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                              isActive
                                ? "border-primary bg-primary/5 text-foreground"
                                : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                            }`}
                            aria-pressed={isActive}
                          >
                            <option.icon className="h-4 w-4" />
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Font Size: {fontSize[0]}px</Label>
                      <Button type="button" variant="outline" size="sm" onClick={resetFontSize}>
                        <RotateCcw className="mr-2 h-3 w-3" />
                        Reset
                      </Button>
                    </div>
                    <Slider value={fontSize} onValueChange={handleFontSizeChange} max={24} min={12} step={1} />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>12px</span>
                      <span>24px</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
