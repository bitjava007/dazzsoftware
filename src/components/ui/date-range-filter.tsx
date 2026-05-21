"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CalendarRange, X, Check } from "lucide-react";

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onReset: () => void;
  onApply?: () => void;
  className?: string;
}

export function DateRangeFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onReset,
  onApply,
  className = "",
}: DateRangeFilterProps) {
  const hasFilter = startDate || endDate;

  return (
    <div className={`flex flex-wrap items-end gap-2 ${className}`}>
      <div className="flex items-center gap-1 text-gray-400">
        <CalendarRange className="w-4 h-4" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-gray-500">Du</Label>
        <Input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="h-8 text-sm w-36"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-gray-500">Au</Label>
        <Input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          className="h-8 text-sm w-36"
        />
      </div>
      {onApply && (
        <Button size="sm" onClick={onApply} className="h-8 bg-blue-600 hover:bg-blue-700 text-white">
          <Check className="w-3.5 h-3.5 mr-1" />
          Appliquer
        </Button>
      )}
      {hasFilter && (
        <Button size="sm" variant="ghost" onClick={onReset} className="h-8 text-gray-500 hover:text-gray-900">
          <X className="w-3.5 h-3.5 mr-1" />
          Réinitialiser
        </Button>
      )}
    </div>
  );
}
