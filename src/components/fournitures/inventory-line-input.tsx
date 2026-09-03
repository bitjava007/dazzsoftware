"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateInventoryLine } from "@/actions/stock-inventaire";

const UNIT_LABELS: Record<string, string> = {
  piece: "pcs", metre: "m", centimetre: "cm", bobine: "bob.",
  rouleau: "rou.", kilogramme: "kg", gramme: "g", litre: "L",
  paquet: "pqt", boite: "bte", autre: "—",
};

interface Props {
  lineId: string;
  theoreticalQty: number;
  initialPhysicalQty: number | null;
  unit: string;
}

export function InventoryLineInput({ lineId, theoreticalQty, initialPhysicalQty, unit }: Props) {
  const [physicalQty, setPhysicalQty] = useState<string>(
    initialPhysicalQty !== null ? String(initialPhysicalQty) : ""
  );
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const unitLabel = UNIT_LABELS[unit] ?? unit;
  const parsed = parseFloat(physicalQty);
  const variance = !isNaN(parsed) && physicalQty !== "" ? parsed - theoreticalQty : null;

  const handleSave = () => {
    if (isNaN(parsed) || physicalQty === "") return;
    setSaved(false);
    startTransition(async () => {
      await updateInventoryLine(lineId, parsed);
      setSaved(true);
    });
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1 justify-end">
        <Input
          type="number"
          min="0"
          step="0.001"
          value={physicalQty}
          onChange={(e) => { setPhysicalQty(e.target.value); setSaved(false); }}
          className="w-24 h-8 text-right"
          placeholder="0"
        />
        <span className="text-xs text-gray-400 shrink-0">{unitLabel}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs"
          onClick={handleSave}
          disabled={isPending || physicalQty === ""}
        >
          {isPending ? "…" : saved ? "✓" : "OK"}
        </Button>
      </div>
      {/* Real-time variance preview */}
      {variance !== null && (
        <p className={`text-xs text-right font-medium ${
          variance < 0 ? "text-red-500" : variance > 0 ? "text-green-600" : "text-gray-400"
        }`}>
          Écart : {variance > 0 ? "+" : ""}{variance.toLocaleString("fr-FR")} {unitLabel}
        </p>
      )}
    </div>
  );
}
