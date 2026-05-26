"use client";

import * as React from "react";
import {
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
    type ColumnDef,
    type SortingState,
    type ColumnFiltersState,
    type VisibilityState,
    type RowSelectionState,
    type CellContext,
    type HeaderContext,
    type OnChangeFn,
    type Header,
    type Row,
} from "@tanstack/react-table";

import {
    Table,
    TableHeader,
    TableRow,
    TableHead,
    TableBody,
    TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectValue,
    SelectItem,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { GripVertical, Maximize2, Minimize2 } from "lucide-react";

export type DataTableColumnTextMode = "default" | "truncate" | "wrap" | "full";
export type DataTableVisualMode = "default" | "excel";

type DataTableColumnMeta = {
    label?: string;
    textMode?: DataTableColumnTextMode;
    align?: "left" | "center" | "right";
    headerClassName?: string;
    cellClassName?: string;
    cellInnerClassName?: string;
};

function DataTableResizer<TData, TValue>({ header }: { header: Header<TData, TValue> }) {
    const isResizing = header.column.getIsResizing();

    return (
        <div
            onMouseDown={header.getResizeHandler()}
            onTouchStart={header.getResizeHandler()}
            className={`absolute right-0 top-0 flex h-full w-4 cursor-col-resize select-none touch-none items-center justify-center opacity-0 group-hover/th:opacity-100 z-10 ${
                isResizing ? "opacity-100" : ""
            }`}
            aria-hidden="true"
            data-resizing={isResizing ? "true" : undefined}
        >
            <div className="flex h-4/5 items-center justify-center">
                <Separator
                    orientation="vertical"
                    decorative={false}
                    className={`h-4/5 w-0.5 transition-colors duration-200 ${
                        isResizing ? "bg-primary" : "bg-border"
                    }`}
                />
                <GripVertical
                    className={`absolute h-4 w-4 ${
                        isResizing ? "text-primary" : "text-muted-foreground/70"
                    }`}
                    strokeWidth={1.5}
                />
            </div>
        </div>
    );
}

function DataTableSkeleton(props: { columns: number; rows?: number }) {
    const rows = props.rows ?? 10;
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        {Array.from({ length: props.columns }).map((_, i) => (
                            <TableHead key={i} className="text-center">
                                <Skeleton className="h-5 w-24 mx-auto" />
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {Array.from({ length: rows }).map((_, r) => (
                        <TableRow key={r}>
                            {Array.from({ length: props.columns }).map((__, c) => (
                                <TableCell key={c} className="text-center">
                                    <Skeleton className="h-5 w-full" />
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

export type DataTableProps<TData, TValue> = {
    columns: ColumnDef<TData, TValue>[];
    data: TData[];
    filterColumn?: string;
    filterPlaceholder?: string;
    initialPageSize?: number;
    defaultSorting?: SortingState;
    initialFilter?: string;
    enableRowSelection?: boolean;
    rowSelection?: RowSelectionState;
    onRowSelectionChange?: OnChangeFn<RowSelectionState>;
    getRowId?: (originalRow: TData, index: number, parent?: Row<TData>) => string;
    isLoading?: boolean;
    skeletonRowCount?: number;

    pageIndex?: number;
    pageSize?: number;
    pageCount?: number;
    onPageIndexChange?: (index: number) => void;
    onPageSizeChange?: (size: number) => void;

    sorting?: SortingState;
    onSortingChange?: OnChangeFn<SortingState>;
    columnVisibility?: VisibilityState;
    onColumnVisibilityChange?: OnChangeFn<VisibilityState>;

    filterValue?: string;
    onFilterChange?: (value: string) => void;

    onRowClick?: (row: TData) => void;

    /** Additional elements to render in the toolbar after the filter input */
    toolbarExtras?: React.ReactNode;
    /** Additional elements to render at the far end of the toolbar */
    toolbarEndExtras?: React.ReactNode;
    /** Rendered below the toolbar when one or more visible rows are selected. */
    selectionToolbar?: (selectedRows: TData[]) => React.ReactNode;

    visualMode?: DataTableVisualMode;
    fullTextColumnIds?: string[];
    columnTextModes?: Partial<Record<string, DataTableColumnTextMode>>;
    showRowNumbers?: boolean;
    showToolbar?: boolean;
    showColumnViewControl?: boolean;
    enableFullscreen?: boolean;
    showPagination?: boolean;
    maxTableHeight?: string;
    className?: string;
    toolbarClassName?: string;
    tableContainerClassName?: string;
    emptyMessage?: React.ReactNode;
    paginationPageSizes?: number[];
    fillHeight?: boolean;
};

function getColumnMeta(column: { columnDef: { meta?: unknown } }) {
    return (column.columnDef.meta ?? {}) as DataTableColumnMeta;
}

function getColumnToggleLabel(column: { id: string; columnDef: { meta?: unknown } }) {
    const meta = getColumnMeta(column);

    if (meta?.label?.trim()) {
        return meta.label;
    }

    return String(column.id)
        .replace(/[_-]+/g, " ")
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/^./, (char) => char.toUpperCase());
}

function getAlignmentClassName(align: DataTableColumnMeta["align"]) {
    switch (align) {
        case "left":
            return "text-left justify-start";
        case "right":
            return "text-right justify-end";
        case "center":
        default:
            return "text-center justify-center";
    }
}

function getTextModeClassName(textMode: DataTableColumnTextMode) {
    switch (textMode) {
        case "truncate":
            return "overflow-hidden text-ellipsis whitespace-nowrap";
        case "wrap":
            return "whitespace-normal break-words";
        case "full":
            return "whitespace-normal break-words leading-5";
        case "default":
        default:
            return "";
    }
}

export function DataTable<TData, TValue>({
    columns,
    data,
    filterColumn,
    filterPlaceholder,
    initialPageSize = 10,
    defaultSorting = [],
    initialFilter = "",
    enableRowSelection = false,
    rowSelection: cRowSelection,
    onRowSelectionChange: cOnRowSelectionChange,
    getRowId,
    isLoading = false,
    skeletonRowCount = 10,

    pageIndex: cPageIndex,
    pageSize: cPageSize,
    pageCount: cPageCount,
    onPageIndexChange,
    onPageSizeChange,

    sorting: cSorting,
    onSortingChange: cOnSortingChange,
    columnVisibility: cColumnVisibility,
    onColumnVisibilityChange: cOnColumnVisibilityChange,

    filterValue: cFilterValue,
    onFilterChange,

    onRowClick,

    toolbarExtras,
    toolbarEndExtras,
    selectionToolbar,
    visualMode = "default",
    fullTextColumnIds = [],
    columnTextModes,
    showRowNumbers = false,
    showToolbar = true,
    showColumnViewControl = true,
    enableFullscreen = false,
    showPagination = true,
    maxTableHeight,
    className,
    toolbarClassName,
    tableContainerClassName,
    emptyMessage = "No results.",
    paginationPageSizes = [10, 20, 30, 40, 50, 100],
    fillHeight = false,
}: DataTableProps<TData, TValue>) {
    const [iSorting, iSetSorting] = React.useState<SortingState>(defaultSorting);
    const [iColumnFilters, iSetColumnFilters] = React.useState<ColumnFiltersState>(
        filterColumn && initialFilter ? [{ id: filterColumn, value: initialFilter }] : []
    );
    const [iColumnVisibility, iSetColumnVisibility] = React.useState<VisibilityState>({});
    const [iRowSelection, iSetRowSelection] = React.useState<RowSelectionState>({});
    const [iPageIndex, iSetPageIndex] = React.useState<number>(0);
    const [iPageSize, iSetPageSize] = React.useState<number>(initialPageSize);
    const [columnSizing, setColumnSizing] = React.useState({});
    const [isFullscreen, setIsFullscreen] = React.useState(false);

    const sorting = cSorting ?? iSorting;
    const pageIndex = cPageIndex ?? iPageIndex;
    const pageSize = cPageSize ?? iPageSize;
    const pageCount = cPageCount ?? -1;

    const columnFilters = iColumnFilters;
    const columnVisibility = cColumnVisibility ?? iColumnVisibility;
    const rowSelection = cRowSelection ?? iRowSelection;
    const isExcelMode = visualMode === "excel";
    const fullTextColumnIdSet = React.useMemo(
        () => new Set(fullTextColumnIds),
        [fullTextColumnIds]
    );

    const boundFilter =
        cFilterValue ??
        (filterColumn
            ? ((columnFilters.find((f) => f.id === filterColumn)?.value as string | null) ?? "")
            : "");

    const setBoundFilter = (val: string) => {
        if (onFilterChange) {
            onFilterChange(val);
            return;
        }
        if (!filterColumn) return;
        const base = columnFilters.filter((f) => f.id !== filterColumn);
        const next = val ? [...base, { id: filterColumn, value: val }] : base;
        iSetColumnFilters(next);
        (onPageIndexChange ?? iSetPageIndex)(0);
    };

    const computedColumns = React.useMemo<ColumnDef<TData, TValue>[]>(() => {
        const nextColumns: ColumnDef<TData, TValue>[] = [...columns];

        if (showRowNumbers) {
            const rowNumberCol: ColumnDef<TData, TValue> = {
                id: "__row_number",
                header: () => <div className="text-center">#</div>,
                cell: (ctx: CellContext<TData, TValue>) => (
                    <span className="tabular-nums text-muted-foreground">
                        {pageIndex * pageSize + ctx.row.index + 1}
                    </span>
                ),
                enableSorting: false,
                enableHiding: false,
                enableResizing: false,
                size: 52,
                meta: {
                    label: "Row",
                    align: "center",
                    textMode: "truncate",
                },
            };

            nextColumns.unshift(rowNumberCol);
        }

        if (!enableRowSelection) return nextColumns;

        const selectCol: ColumnDef<TData, TValue> = {
            id: "__select",
            header: (ctx: HeaderContext<TData, TValue>) => (
                <div className="flex justify-center">
                    <Checkbox
                        checked={
                            ctx.table.getIsAllPageRowsSelected() ||
                            (ctx.table.getIsSomePageRowsSelected() ? "indeterminate" : false)
                        }
                        onCheckedChange={(val) => ctx.table.toggleAllPageRowsSelected(Boolean(val))}
                        aria-label="Select all"
                    />
                </div>
            ),
            cell: (ctx: CellContext<TData, TValue>) => (
                <div className="flex justify-center">
                    <Checkbox
                        checked={ctx.row.getIsSelected()}
                        onCheckedChange={(val) => ctx.row.toggleSelected(Boolean(val))}
                        aria-label="Select row"
                    />
                </div>
            ),
            enableSorting: false,
            enableHiding: false,
            size: 60,
            enableResizing: false,
        };
        return [selectCol, ...nextColumns];
    }, [columns, enableRowSelection, pageIndex, pageSize, showRowNumbers]);

    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data,
        columns: computedColumns,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
            pagination: { pageIndex, pageSize },
            columnSizing,
        },

        getRowId,
        onColumnSizingChange: setColumnSizing,
        columnResizeMode: "onChange",
        enableColumnResizing: true,

        onSortingChange: (updater) => {
            const next = typeof updater === "function" ? updater(sorting) : updater;
            if (cOnSortingChange) cOnSortingChange(next);
            else iSetSorting(next);
        },

        onColumnFiltersChange: (updater) => {
            const next = typeof updater === "function" ? updater(columnFilters) : updater;
            iSetColumnFilters(next);
            (onPageIndexChange ?? iSetPageIndex)(0);
        },

        onColumnVisibilityChange: (updater) => {
            const next = typeof updater === "function" ? updater(columnVisibility) : updater;
            if (cOnColumnVisibilityChange) cOnColumnVisibilityChange(next);
            else iSetColumnVisibility(next);
        },

        onRowSelectionChange: (updater) => {
            const next = typeof updater === "function" ? updater(rowSelection) : updater;
            if (cOnRowSelectionChange) cOnRowSelectionChange(next);
            else iSetRowSelection(next);
        },

        onPaginationChange: (updater) => {
            const current = { pageIndex, pageSize };
            const next = typeof updater === "function" ? updater(current) : updater;

            // Check if pageSize changed - if so, reset to first page
            if ("pageSize" in next && next.pageSize !== current.pageSize) {
                (onPageSizeChange ?? iSetPageSize)(next.pageSize);
                (onPageIndexChange ?? iSetPageIndex)(0);
            } else if ("pageIndex" in next && next.pageIndex !== current.pageIndex) {
                // Only pageIndex changed
                (onPageIndexChange ?? iSetPageIndex)(next.pageIndex);
            }
        },

        manualPagination: true,
        manualSorting: true,
        manualFiltering: true,
        pageCount,

        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    const showToolbarRow =
        showToolbar &&
        (filterColumn ||
            toolbarExtras ||
            showColumnViewControl ||
            toolbarEndExtras ||
            (enableFullscreen && isExcelMode));
    const selectedRows = table.getSelectedRowModel().rows.map((row) => row.original);

    const resolveTextMode = (columnId: string, meta: DataTableColumnMeta) =>
        columnTextModes?.[columnId] ??
        (fullTextColumnIdSet.has(columnId) ? "full" : meta.textMode ?? "default");

    return (
        <div
            className={cn(
                fillHeight
                    ? "flex h-full min-h-0 flex-col gap-3"
                    : isExcelMode
                      ? "space-y-3"
                      : "space-y-4",
                isFullscreen &&
                    "fixed inset-3 z-50 flex min-h-0 flex-col rounded-xl border border-border bg-background p-3 shadow-2xl sm:inset-6",
                className
            )}
        >
            {showToolbarRow ? (
            <div
                className={cn(
                    "flex items-center gap-2",
                    isExcelMode &&
                        "rounded-xl border border-border/70 bg-muted/25 p-2 shadow-sm",
                    toolbarClassName
                )}
            >
                {filterColumn ? (
                    <Input
                        placeholder={filterPlaceholder ?? `Filter ${filterColumn}...`}
                        value={boundFilter}
                        onChange={(e) => setBoundFilter(e.target.value)}
                        className="w-60"
                    />
                ) : null}

                {toolbarExtras}

                {showColumnViewControl ? (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant={isExcelMode ? "secondary" : "outline"} size="sm">
                                View
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-44">
                            {table
                                .getAllLeafColumns()
                                .filter((c) => c.id !== "__select" && c.id !== "__row_number")
                                .map((column) => (
                                    <DropdownMenuCheckboxItem
                                        key={column.id}
                                        className="capitalize"
                                        checked={column.getIsVisible()}
                                        disabled={!column.getCanHide()}
                                        onCheckedChange={(val) =>
                                            column.toggleVisibility(Boolean(val))
                                        }
                                    >
                                        {getColumnToggleLabel(column)}
                                    </DropdownMenuCheckboxItem>
                                ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                ) : null}

                {enableFullscreen && isExcelMode ? (
                    <Button
                        type="button"
                        variant={isExcelMode ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => setIsFullscreen((currentValue) => !currentValue)}
                    >
                        {isFullscreen ? (
                            <Minimize2 className="h-3.5 w-3.5" />
                        ) : (
                            <Maximize2 className="h-3.5 w-3.5" />
                        )}
                        {isFullscreen ? "Exit full screen" : "Full screen"}
                    </Button>
                ) : null}

                {toolbarEndExtras}
            </div>
            ) : null}

            {selectionToolbar && selectedRows.length > 0 ? selectionToolbar(selectedRows) : null}

            {isLoading ? (
                <DataTableSkeleton columns={computedColumns.length} rows={skeletonRowCount} />
            ) : (
                <div
                    className={cn(
                        isExcelMode
                            ? "tracker-thin-scrollbar relative isolate overflow-auto rounded-xl border border-border/70 bg-background shadow-inner [&_[data-slot=table-container]]:overflow-visible"
                            : "rounded-md border overflow-x-auto",
                        (fillHeight || isFullscreen) && "min-h-0 flex-1",
                        tableContainerClassName
                    )}
                    style={
                        isFullscreen
                            ? { maxHeight: "calc(100svh - 12rem)" }
                            : maxTableHeight
                              ? { maxHeight: maxTableHeight }
                              : undefined
                    }
                >
                    <Table
                        className={cn(
                            isExcelMode && "min-w-max border-separate border-spacing-0"
                        )}
                    >
                        <TableHeader>
                            {table.getHeaderGroups().map((hg) => (
                                <TableRow key={hg.id} className={cn(isExcelMode && "hover:bg-transparent")}>
                                    {hg.headers.map((header) => {
                                        const meta = getColumnMeta(header.column);
                                        const alignClassName = getAlignmentClassName(meta.align);

                                        return (
                                            <TableHead
                                                key={header.id}
                                                className={cn(
                                                    "relative group/th whitespace-normal text-center",
                                                    isExcelMode &&
                                                        "sticky top-0 z-40 h-9 border-r border-b border-border/70 bg-muted px-1 text-xs uppercase shadow-[0_1px_0_var(--border)]",
                                                    meta.headerClassName
                                                )}
                                                style={{
                                                    width: header.getSize(),
                                                }}
                                            >
                                                <div
                                                    className={cn(
                                                        "flex min-w-0 items-center px-2",
                                                        alignClassName
                                                    )}
                                                >
                                                    {header.isPlaceholder
                                                        ? null
                                                        : flexRender(
                                                              header.column.columnDef.header,
                                                              header.getContext()
                                                          )}
                                                </div>
                                                {header.column.getCanResize() && (
                                                    <DataTableResizer header={header} />
                                                )}
                                            </TableHead>
                                        );
                                    })}
                                </TableRow>
                            ))}
                        </TableHeader>

                        <TableBody>
                            {table.getRowModel().rows.length > 0 ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        data-state={row.getIsSelected() && "selected"}
                                        onClick={() => onRowClick?.(row.original)}
                                        className={cn(
                                            onRowClick &&
                                                "cursor-pointer transition-colors hover:bg-muted/30",
                                            isExcelMode &&
                                                "h-10 odd:bg-muted/[0.12] hover:bg-emerald-500/5"
                                        )}
                                    >
                                        {row.getVisibleCells().map((cell) => {
                                            const meta = getColumnMeta(cell.column);
                                            const textMode = resolveTextMode(cell.column.id, meta);
                                            const alignClassName = getAlignmentClassName(meta.align);

                                            return (
                                                <TableCell
                                                    key={cell.id}
                                                    className={cn(
                                                        "whitespace-normal text-center align-top",
                                                        isExcelMode &&
                                                            "border-r border-b border-border/60 p-0",
                                                        meta.cellClassName
                                                    )}
                                                    style={{
                                                        width: cell.column.getSize(),
                                                    }}
                                                >
                                                    <div
                                                        className={cn(
                                                            "min-w-0 px-2",
                                                            isExcelMode && "px-2 py-2",
                                                            alignClassName,
                                                            getTextModeClassName(textMode),
                                                            meta.cellInnerClassName
                                                        )}
                                                    >
                                                        {flexRender(
                                                            cell.column.columnDef.cell,
                                                            cell.getContext()
                                                        )}
                                                    </div>
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell
                                        colSpan={computedColumns.length}
                                        className="h-24 text-center"
                                    >
                                        {emptyMessage}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            {showPagination ? (
            <div className="flex items-center justify-end gap-3">
                <div className="flex items-center gap-1">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.setPageIndex(0)}
                        disabled={!table.getCanPreviousPage()}
                        aria-label="First page"
                        title="First page"
                    >
                        «
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                        aria-label="Previous page"
                        title="Previous page"
                    >
                        ‹
                    </Button>

                    <span className="mx-1 text-sm tabular-nums text-muted-foreground">
                        {table.getState().pagination.pageIndex + 1} /{" "}
                        {table.getPageCount() > 0 ? table.getPageCount() : 1}
                    </span>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                        aria-label="Next page"
                        title="Next page"
                    >
                        ›
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.setPageIndex(Math.max(0, table.getPageCount() - 1))}
                        disabled={!table.getCanNextPage()}
                        aria-label="Last page"
                        title="Last page"
                    >
                        »
                    </Button>
                </div>

                <Select
                    value={String(table.getState().pagination.pageSize)}
                    onValueChange={(v) => {
                        const size = Number(v);
                        table.setPageSize(size);
                    }}
                >
                    <SelectTrigger className="h-8 w-[110px]">
                        <SelectValue>{table.getState().pagination.pageSize} / page</SelectValue>
                    </SelectTrigger>
                    <SelectContent align="end">
                        {paginationPageSizes.map((ps) => (
                            <SelectItem key={ps} value={String(ps)}>
                                {ps} / page
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            ) : null}
        </div>
    );
}
