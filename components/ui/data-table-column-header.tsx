"use client";

import { Column } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DataTableColumnHeaderProps<TData, TValue> {
    column: Column<TData, TValue>;
    title: string;
    className?: string;
}

export function DataTableColumnHeader<TData, TValue>({
    column,
    title,
    className,
}: DataTableColumnHeaderProps<TData, TValue>) {
    if (!column.getCanSort()) {
        return (
            <div
                className={cn(
                    "line-clamp-2 max-w-full break-words text-center leading-5",
                    className
                )}
                title={title}
            >
                {title}
            </div>
        );
    }

    return (
        <div className={cn("flex min-w-0 max-w-full items-center justify-center", className)}>
            <Button
                variant="ghost"
                size="sm"
                className="h-auto max-w-full px-2 py-1.5 whitespace-normal data-[state=open]:bg-accent"
                onClick={() => column.toggleSorting()}
                title={title}
            >
                <span className="line-clamp-2 break-words text-center leading-5">{title}</span>
                {column.getIsSorted() === "desc" ? (
                    <ArrowDown className="h-4 w-4 shrink-0" />
                ) : column.getIsSorted() === "asc" ? (
                    <ArrowUp className="h-4 w-4 shrink-0" />
                ) : (
                    <ChevronsUpDown className="h-4 w-4 shrink-0" />
                )}
            </Button>
        </div>
    );
}
