"use client";

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarSeparator,
    SidebarTrigger,
    useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    LayoutDashboard,
    Settings,
    Moon,
    Sun,
    LogOut,
    LogIn,
    ArrowLeft,
    ArrowRight,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { authClient } from "@/lib/auth-client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Zap } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const navGroups = [
    {
        label: "Main",
        items: [
            {
                title: "Dashboard",
                url: "/dashboard",
                icon: LayoutDashboard,
                color: "text-blue-500",
            },
        ],
    },
    // {
    //     label: "Academics",
    //     items: [
    //         {
    //             title: "Courses",
    //             url: "/course",
    //             icon: BookMarked,
    //             color: "text-emerald-500",
    //         },
    //         {
    //             title: "Question Bank",
    //             url: "/question-bank",
    //             icon: BookOpen,
    //             color: "text-orange-500",
    //         },
    //         {
    //             title: "Quiz",
    //             url: "/student/quiz",
    //             icon: PenTool,
    //             color: "text-amber-500",
    //         },
    //     ],
    // },
    // {
    //     label: "Management",
    //     items: [
    //         {
    //             title: "Users",
    //             url: "/admin/user",
    //             icon: Users,
    //             color: "text-purple-500",
    //         },
    //         {
    //             title: "Batches",
    //             url: "/admin/batch",
    //             icon: GraduationCap,
    //             color: "text-indigo-500",
    //         },
    //         {
    //             title: "Semester",
    //             url: "/admin/semester",
    //             icon: Calendar,
    //             color: "text-rose-500",
    //         },
    //         {
    //             title: "Departments",
    //             url: "/admin/department",
    //             icon: Building2,
    //             color: "text-cyan-500",
    //         },
    //         {
    //             title: "Labs",
    //             url: "/admin/lab",
    //             icon: Beaker,
    //             color: "text-teal-500",
    //         },
    //     ],
    // },
    {
        label: "System",
        items: [
            {
                title: "Settings",
                url: "/settings",
                icon: Settings,
                color: "text-slate-500",
            },
        ],
    },
];

function capitalizeWord(word: string) {
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function ThemeToggle({ mounted }: { mounted: boolean }) {
    const { setTheme, resolvedTheme } = useTheme();
    const isDark = mounted ? resolvedTheme === "dark" : false;

    return (
        <SidebarMenuItem>
            <SidebarMenuButton
                onClick={() => setTheme(isDark ? "light" : "dark")}
                tooltip={mounted ? `Switch to ${isDark ? "light" : "dark"} mode` : "Toggle theme"}
                disabled={!mounted}
                className="group/item transition-all duration-200 hover:bg-sidebar-accent/80"
            >
                {mounted && isDark ? (
                    <Sun className="h-4 w-4 text-yellow-500 group-hover/item:text-sidebar-accent-foreground transition-colors" />
                ) : (
                    <Moon className="h-4 w-4 text-indigo-500 group-hover/item:text-sidebar-accent-foreground transition-colors" />
                )}
                <span className="font-medium">
                    {mounted ? (isDark ? "Light Mode" : "Dark Mode") : "Theme"}
                </span>
            </SidebarMenuButton>
        </SidebarMenuItem>
    );
}

export function AppSidebar() {
    const pathname = usePathname();
    const { data: session, isPending } = authClient.useSession();
    const { open } = useSidebar();
    const [mounted, setMounted] = useState(false);

    // This is a valid use case for detecting client-side mounting to prevent hydration mismatches
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
    }, []);

    return (
        <Sidebar collapsible="icon" side="left" className="group relative">
            <SidebarHeader className="border-b border-sidebar-border bg-linear-to-br from-sidebar/40 via-sidebar/60 to-sidebar/80 dark:from-sidebar/60 dark:via-sidebar/80 dark:to-sidebar backdrop-blur-sm p-0">
                <Link href="/" className="block">
                    <div className="flex items-center p-2 min-h-16 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-3">
                        {/* <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primary to-primary/80 text-primary-foreground shadow-lg ring-2 ring-primary/20 transition-all duration-200 hover:scale-105 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8 p-1.5"> */}
                        <Zap
                            size={40}
                            strokeWidth={2.5}
                            className="
                                text-emerald-400

                                drop-shadow-[0_0_6px_rgba(16,185,129,0.9)]
                                drop-shadow-[0_0_12px_rgba(16,185,129,0.7)]
                                drop-shadow-[0_0_20px_rgba(16,185,129,0.6)]
                            "
                            />
                        {/* </div> */}
                        <div className="ml-3 flex flex-col min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                            <span className="font-bold text-xl bg-linear-to-r from-primary to-primary/70 bg-clip-text text-transparent truncate">
                                Tracker
                            </span>
                            <span className="text-xs text-muted-foreground truncate">
                                Project Management Tool
                            </span>
                        </div>
                    </div>
                </Link>
            </SidebarHeader>

            {/* Sidebar Toggle Button - Positioned for left sidebar */}
            <div className="absolute top-1/2 -right-3 transform -translate-y-1/2 z-20 hidden md:block">
                <SidebarTrigger className="h-6 w-6 rounded-md bg-sidebar-border/50 hover:bg-sidebar-border text-sidebar-foreground border border-sidebar-border/30 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-1 focus:ring-primary/30">
                    {open ? <ArrowLeft className="h-3 w-3" /> : <ArrowRight className="h-3 w-3" />}
                </SidebarTrigger>
            </div>

            <SidebarContent className="bg-linear-to-b from-sidebar via-sidebar/50 to-sidebar dark:from-sidebar dark:via-sidebar/80 dark:to-sidebar scrollbar-thin scrollbar-track-transparent scrollbar-thumb-sidebar-border/50 hover:scrollbar-thumb-sidebar-border overflow-x-hidden p-0">
                {navGroups.map((group, groupIndex) => (
                    <div key={group.label}>
                        <SidebarGroup className="px-2 py-4">
                            <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/70 px-2 group-data-[collapsible=icon]:sr-only">
                                {group.label}
                            </SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {group.items.map((item) => (
                                        <SidebarMenuItem key={item.title}>
                                            <SidebarMenuButton
                                                asChild
                                                isActive={pathname === item.url}
                                                tooltip={item.title}
                                                className="group/item transition-all duration-200 hover:bg-sidebar-accent/80"
                                            >
                                                <Link href={item.url} className="flex items-center">
                                                    <item.icon
                                                        className={`h-4 w-4 transition-colors ${
                                                            pathname === item.url
                                                                ? "text-sidebar-accent-foreground"
                                                                : `${item.color} group-hover/item:text-sidebar-accent-foreground`
                                                        }`}
                                                    />
                                                    <span className="font-medium">{item.title}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    ))}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>

                        {groupIndex !== navGroups.length - 1 && (
                            <SidebarSeparator className="bg-linear-to-r from-transparent via-sidebar-border to-transparent mx-2" />
                        )}
                    </div>
                ))}

                <SidebarSeparator className="bg-linear-to-r from-transparent via-sidebar-border to-transparent mx-2" />

                <SidebarGroup className="px-2 py-4">
                    <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/70 px-2 group-data-[collapsible=icon]:sr-only">
                        Theme
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <ThemeToggle mounted={mounted} />
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="border-t border-sidebar-border bg-linear-to-r from-sidebar via-sidebar/80 to-sidebar backdrop-blur-sm p-2 overflow-hidden">
                <SidebarMenu className="overflow-hidden">
                    {mounted && !isPending && session?.user ? (
                        <SidebarMenuItem>
                            <div className="group relative w-full overflow-hidden">
                                <div className="flex items-center p-2 rounded-lg hover:bg-sidebar-accent/50 transition-all duration-200 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-3">
                                    <Avatar className="h-8 w-8 shrink-0 rounded-lg ring-2 ring-primary/20 transition-all duration-200 hover:ring-primary/40 group-data-[collapsible=icon]:h-7 group-data-[collapsible=icon]:w-7">
                                        <AvatarImage
                                            src={session.user.image || ""}
                                            alt={session.user.name || ""}
                                            className="object-cover"
                                        />
                                        <AvatarFallback className="rounded-lg bg-linear-to-br from-primary to-primary/80 text-primary-foreground text-sm font-semibold group-data-[collapsible=icon]:text-xs">
                                            {session.user.name?.slice(0, 2).toUpperCase() || "U"}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="ml-3 flex items-center justify-between flex-1 min-w-0 group-data-[collapsible=icon]:hidden overflow-hidden">
                                        <div className="flex-1 min-w-0 overflow-hidden">
                                            <div className="font-semibold text-sm truncate">
                                                {capitalizeWord(session.user.name || "")}
                                            </div>
                                            <div className="text-xs text-muted-foreground truncate">
                                                {session.user.email}
                                            </div>
                                        </div>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <button
                                                className="
                                                    shrink-0 px-2 py-1.5 rounded-md

                                                    bg-black text-white
                                                    dark:bg-white dark:text-black

                                                    border border-black/10 dark:border-white/20

                                                    hover:bg-black/90 dark:hover:bg-white/90
                                                    hover:text-white dark:hover:text-black

                                                    transition-all duration-200
                                                    transform-gpu
                                                    hover:scale-[1.02] active:scale-[0.98]

                                                    flex items-center gap-1
                                                "
                                                >
                                                <LogOut className="h-4 w-4" />
                                                <span className="text-xs hidden md:inline">Logout</span>
                                                </button>
                                            </AlertDialogTrigger>

                                            <AlertDialogContent size="sm">
                                                <AlertDialogHeader>
                                                <AlertDialogTitle>Logout</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Are you sure you want to sign out?
                                                </AlertDialogDescription>
                                                </AlertDialogHeader>

                                                <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => authClient.signOut()}>
                                                    Logout
                                                </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                            </AlertDialog>
                                    </div>
                                </div>
                                {/* Tooltip for collapsed state */}
                                <div className="absolute left-full ml-2 px-3 py-2 bg-popover text-popover-foreground rounded-md shadow-lg border opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200 whitespace-nowrap z-50 group-data-[collapsible=expanded]:hidden">
                                    <div className="font-semibold text-sm">
                                        {capitalizeWord(session.user.name || "")}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {session.user.email}
                                    </div>
                                    <div className="mt-2 pt-2 border-t">
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <button
                                                className="
                                                    flex items-center gap-2

                                                    text-black dark:text-white
                                                    hover:opacity-70
                                                    hover:text-black/70 dark:hover:text-white/70

                                                    transition-all duration-200
                                                    transform-gpu
                                                    hover:translate-x-0.5
                                                    text-xs
                                                "
                                                >
                                                <LogOut className="h-3 w-3" />
                                                Sign out
                                                </button>
                                            </AlertDialogTrigger>

                                            <AlertDialogContent size="sm">
                                                <AlertDialogHeader>
                                                <AlertDialogTitle>Logout</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Are you sure you want to sign out?
                                                </AlertDialogDescription>
                                                </AlertDialogHeader>

                                                <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => authClient.signOut()}>
                                                    Logout
                                                </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                            </AlertDialog>
                                    </div>
                                </div>
                            </div>
                        </SidebarMenuItem>
                    ) : mounted && !isPending ? (
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                asChild
                                tooltip="Sign in"
                                className="
                                    w-full justify-center gap-2

                                    !bg-black !text-white
                                    dark:!bg-white dark:!text-black

                                    border border-black/10 dark:border-white/20

                                    hover:!bg-black/90 dark:hover:!bg-white/90
                                    hover:!text-white dark:hover:!text-black

                                    transition-all duration-200
                                    transform-gpu
                                    hover:scale-[1.001] active:scale-[0.98]
                                    rounded-lg

                                    group-data-[collapsible=icon]:p-3
                                "
                            >
                                <Link href="/login">
                                    <LogIn className="h-4 w-4" />
                                    <span className="font-medium group-data-[collapsible=icon]:hidden">
                                        Sign In
                                    </span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ) : (
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                tooltip="Loading..."
                                disabled
                                className="group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-3"
                            >
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent shrink-0" />
                                <span className="group-data-[collapsible=icon]:hidden">
                                    Loading...
                                </span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    )}
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}
