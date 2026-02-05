"use client";

import { useState, useMemo } from "react";
import { clsx } from "clsx";

interface TableViewProps {
  content: string;
  className?: string;
}

interface ParsedCSV {
  headers: string[];
  rows: string[][];
}

type SortDirection = "asc" | "desc" | null;

interface SortState {
  column: number | null;
  direction: SortDirection;
}

/**
 * Parse CSV content into headers and rows.
 * Handles basic CSV format (comma-separated, no quoted commas).
 */
export function parseCSV(content: string): ParsedCSV {
  const lines = content
    .trim()
    .split("\n")
    .filter((line) => line.trim());

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows = lines
    .slice(1)
    .map((line) => line.split(",").map((cell) => cell.trim()));

  return { headers, rows };
}

/**
 * Sort rows by a column index.
 */
function sortRows(
  rows: string[][],
  column: number,
  direction: SortDirection
): string[][] {
  if (direction === null || column === null) {
    return rows;
  }

  return [...rows].sort((a, b) => {
    const aVal = a[column] || "";
    const bVal = b[column] || "";

    // Try numeric comparison first
    const aNum = parseFloat(aVal);
    const bNum = parseFloat(bVal);

    if (!isNaN(aNum) && !isNaN(bNum)) {
      return direction === "asc" ? aNum - bNum : bNum - aNum;
    }

    // Fall back to string comparison
    const comparison = aVal.localeCompare(bVal);
    return direction === "asc" ? comparison : -comparison;
  });
}

/**
 * TableView component renders CSV content as a sortable table.
 */
export function TableView({ content, className }: TableViewProps) {
  const [sortState, setSortState] = useState<SortState>({
    column: null,
    direction: null,
  });

  const { headers, rows } = useMemo(() => parseCSV(content), [content]);

  const sortedRows = useMemo(
    () => sortRows(rows, sortState.column!, sortState.direction),
    [rows, sortState.column, sortState.direction]
  );

  const handleHeaderClick = (columnIndex: number) => {
    setSortState((prev) => {
      if (prev.column !== columnIndex) {
        // New column: start with ascending
        return { column: columnIndex, direction: "asc" };
      }

      // Same column: cycle through asc -> desc -> null
      if (prev.direction === "asc") {
        return { column: columnIndex, direction: "desc" };
      }
      if (prev.direction === "desc") {
        return { column: null, direction: null };
      }
      return { column: columnIndex, direction: "asc" };
    });
  };

  const getSortIndicator = (columnIndex: number): string => {
    if (sortState.column !== columnIndex) {
      return "";
    }
    return sortState.direction === "asc" ? " ↑" : " ↓";
  };

  if (headers.length === 0) {
    return (
      <div className={clsx("text-tt-muted text-sm", className)}>
        No data to display
      </div>
    );
  }

  return (
    <div className={clsx("overflow-x-auto", className)}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {headers.map((header, i) => (
              <th
                key={i}
                onClick={() => handleHeaderClick(i)}
                className={clsx(
                  "px-3 py-2 text-left font-semibold text-tt-text",
                  "bg-tt-bg border-b border-tt-border",
                  "cursor-pointer hover:bg-tt-accent/10 transition-colors",
                  "select-none whitespace-nowrap"
                )}
              >
                {header}
                <span className="text-tt-accent ml-1">
                  {getSortIndicator(i)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={clsx(
                "border-b border-tt-border/50",
                "hover:bg-tt-surface/50 transition-colors"
              )}
            >
              {headers.map((_, cellIndex) => (
                <td key={cellIndex} className="px-3 py-2 text-tt-text/90">
                  {row[cellIndex] || ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-2 text-xs text-tt-muted">
        {sortedRows.length} {sortedRows.length === 1 ? "row" : "rows"}
        {sortState.column !== null && (
          <span className="ml-2">
            • Sorted by {headers[sortState.column]} ({sortState.direction})
          </span>
        )}
      </div>
    </div>
  );
}
