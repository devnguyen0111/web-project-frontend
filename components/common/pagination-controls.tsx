"use client";

import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  totalItems?: number;
  itemLabel?: string;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  className?: string;
}

export function PaginationControls({
  page,
  totalPages,
  totalItems,
  itemLabel = "items",
  onPageChange,
  disabled = false,
  className,
}: PaginationControlsProps) {
  const safePage = Math.max(1, page);
  const safeTotalPages = Math.max(1, totalPages);
  const canGoPrev = safePage > 1 && !disabled;
  const canGoNext = safePage < safeTotalPages && !disabled;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="space-y-0.5">
        <p className="text-sm font-semibold text-slate-900">
          Page {safePage} of {safeTotalPages}
        </p>
        <p className="text-xs text-slate-500">
          {typeof totalItems === "number" ? `${totalItems} ${itemLabel}` : `Browse ${itemLabel}`}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canGoPrev}
          onClick={() => onPageChange(safePage - 1)}
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canGoNext}
          onClick={() => onPageChange(safePage + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
