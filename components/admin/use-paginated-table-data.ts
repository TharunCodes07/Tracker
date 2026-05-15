import { useMemo, useState } from "react";

interface UsePaginatedTableDataOptions<TData> {
  rows: TData[];
  searchText: (row: TData) => string;
  initialPageSize?: number;
}

export function usePaginatedTableData<TData>({
  rows,
  searchText,
  initialPageSize = 10,
}: UsePaginatedTableDataOptions<TData>) {
  const [filterValue, setFilterValueState] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const filteredRows = useMemo(() => {
    const query = filterValue.trim().toLowerCase();

    if (!query) {
      return rows;
    }

    return rows.filter((row) => searchText(row).toLowerCase().includes(query));
  }, [filterValue, rows, searchText]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const resolvedPageIndex = Math.min(pageIndex, pageCount - 1);

  const pagedRows = useMemo(() => {
    const start = resolvedPageIndex * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, pageSize, resolvedPageIndex]);

  function setFilterValue(value: string) {
    setFilterValueState(value);
    setPageIndex(0);
  }

  function setPageSize(value: number) {
    setPageSizeState(value);
    setPageIndex(0);
  }

  return {
    filterValue,
    filteredCount: filteredRows.length,
    pageCount,
    pageIndex: resolvedPageIndex,
    pagedRows,
    pageSize,
    setFilterValue,
    setPageIndex,
    setPageSize,
  };
}
