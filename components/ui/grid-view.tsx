import * as React from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface GridViewProps<T> {
  items: T[];
  getKey: (item: T) => React.Key;
  renderItem: (item: T) => React.ReactNode;
  emptyState?: React.ReactNode;
  className?: string;
  itemClassName?: string;
  itemContentClassName?: string;
}

export function GridView<T>({
  items,
  getKey,
  renderItem,
  emptyState = null,
  className,
  itemClassName,
  itemContentClassName,
}: GridViewProps<T>) {
  if (!items.length) {
    return <>{emptyState}</>;
  }

  return (
    <div className={cn("grid gap-4 md:grid-cols-2 2xl:grid-cols-3", className)}>
      {items.map((item) => (
        <Card
          key={getKey(item)}
          className={cn(
            "relative min-h-[232px] min-w-0 border-border/60 bg-linear-to-br from-card via-card to-card shadow-[0_20px_40px_-36px_rgba(15,23,42,0.42)]",
            itemClassName
          )}
        >
          <CardContent className={cn("flex h-full min-w-0 flex-col p-0", itemContentClassName)}>
            {renderItem(item)}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
