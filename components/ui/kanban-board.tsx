import type { CSSProperties, ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type KanbanColumn<TStatus extends string> = {
  value: TStatus;
  label: string;
  description?: string;
};

type KanbanRenderContext<TStatus extends string> = {
  column: KanbanColumn<TStatus>;
};

export function KanbanBoard<TStatus extends string, TItem>({
  columns,
  itemsByColumn,
  getItemKey,
  renderItem,
  onItemDrop,
  emptyColumnText = "No items",
  className,
  columnClassName,
}: {
  columns: readonly KanbanColumn<TStatus>[];
  itemsByColumn: Map<TStatus, TItem[]>;
  getItemKey: (item: TItem) => string;
  renderItem: (item: TItem, context: KanbanRenderContext<TStatus>) => ReactNode;
  onItemDrop?: (column: TStatus, itemId: string) => void;
  emptyColumnText?: string;
  className?: string;
  columnClassName?: string;
}) {
  return (
    <div
      className={cn(
        "tracker-thin-scrollbar grid min-h-[32rem] gap-3 overflow-x-auto pb-2",
        className
      )}
      style={
        {
          gridTemplateColumns: `repeat(${columns.length}, minmax(17rem, 1fr))`,
        } as CSSProperties
      }
    >
      {columns.map((column) => {
        const columnItems = itemsByColumn.get(column.value) ?? [];

        return (
          <section
            key={column.value}
            onDragOver={(event) => {
              if (onItemDrop) {
                event.preventDefault();
              }
            }}
            onDrop={(event) => {
              if (!onItemDrop) {
                return;
              }

              event.preventDefault();
              const itemId = event.dataTransfer.getData("text/plain");

              if (itemId) {
                onItemDrop(column.value, itemId);
              }
            }}
            className={cn(
              "flex min-h-[30rem] min-w-0 flex-col rounded-lg border border-border/70 bg-muted/20 p-3",
              columnClassName
            )}
          >
            <div className="mb-3 flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="flex min-w-0 items-center gap-2">
                  <Badge variant="secondary" className="max-w-full capitalize">
                    <span className="truncate">{column.label}</span>
                  </Badge>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {columnItems.length}
                  </span>
                </div>
                {column.description ? (
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {column.description}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="tracker-thin-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {columnItems.length > 0 ? (
                columnItems.map((item) => (
                  <div key={getItemKey(item)} className="min-w-0">
                    {renderItem(item, { column })}
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-border/70 px-3 py-6 text-center text-sm text-muted-foreground">
                  {emptyColumnText}
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function KanbanBoardSkeleton({
  columns = 4,
  cardsPerColumn = 4,
  className,
}: {
  columns?: number;
  cardsPerColumn?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "tracker-thin-scrollbar grid min-h-[32rem] gap-3 overflow-x-auto pb-2",
        className
      )}
      style={
        {
          gridTemplateColumns: `repeat(${columns}, minmax(17rem, 1fr))`,
        } as CSSProperties
      }
    >
      {Array.from({ length: columns }).map((_, columnIndex) => (
        <section
          key={columnIndex}
          className="flex min-h-[30rem] min-w-0 flex-col rounded-lg border border-border/70 bg-muted/20 p-3"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-4 w-6 rounded-full" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: cardsPerColumn }).map((__, cardIndex) => (
              <div
                key={cardIndex}
                className="rounded-lg border border-border/70 bg-background p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="mt-3 h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-3/4" />
                <div className="mt-4 flex gap-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
