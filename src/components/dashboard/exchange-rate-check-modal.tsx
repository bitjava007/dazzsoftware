"use client";

import { useState, useEffect, useTransition } from "react";
import { updateExchangeRateFromLive } from "@/actions/exchange-rate-check";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TrendingUp, RefreshCw, Check, AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Props {
  storedRate: number | null;
  liveRate: number | null;
  liveSource: string;
  lastUpdatedAt: string | null;
}

const DIFF_THRESHOLD_PCT = 1; // Show modal only if diff > 1%
const STORAGE_KEY = "rate-check-dismissed";

export function ExchangeRateCheckModal({ storedRate, liveRate, liveSource, lastUpdatedAt }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [updated, setUpdated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!storedRate || !liveRate) return;
    const diff = Math.abs((liveRate - storedRate) / storedRate) * 100;
    if (diff <= DIFF_THRESHOLD_PCT) return;

    // Don't show again if already dismissed today
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (dismissed === new Date().toDateString()) return;
    } catch { /* ignore storage errors */ }

    setOpen(true);
  }, [storedRate, liveRate]);

  if (!storedRate || !liveRate) return null;

  const diff = liveRate - storedRate;
  const diffPct = ((diff / storedRate) * 100).toFixed(1);
  const isIncrease = diff > 0;

  const handleKeep = () => {
    try { localStorage.setItem(STORAGE_KEY, new Date().toDateString()); } catch { /* ignore */ }
    setOpen(false);
  };

  const handleUpdate = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateExchangeRateFromLive(liveRate);
      if (result.ok) {
        setUpdated(true);
        setTimeout(() => setOpen(false), 1500);
      } else {
        setError(result.error ?? "Erreur inconnue");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleKeep(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Vérification du taux de change
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700">
              Le taux de marché actuel diffère du taux enregistré.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-lg p-3 border">
              <p className="text-xs text-gray-500 mb-1">Taux enregistré</p>
              <p className="text-lg font-bold">{storedRate.toLocaleString("fr-FR")}</p>
              <p className="text-xs text-gray-400">
                1 USD = {storedRate.toLocaleString("fr-FR")} XOF
              </p>
              {lastUpdatedAt && (
                <p className="text-xs text-gray-400 mt-1">Mis à jour le {formatDate(lastUpdatedAt)}</p>
              )}
            </div>
            <div className={`rounded-lg p-3 border ${isIncrease ? "bg-green-50 border-green-200" : "bg-orange-50 border-orange-200"}`}>
              <p className="text-xs text-gray-500 mb-1">Taux du marché</p>
              <p className={`text-lg font-bold ${isIncrease ? "text-green-700" : "text-orange-700"}`}>
                {liveRate.toLocaleString("fr-FR")}
              </p>
              <p className="text-xs text-gray-500">
                1 USD = {liveRate.toLocaleString("fr-FR")} XOF
              </p>
              <p className={`text-xs mt-1 font-medium ${isIncrease ? "text-green-600" : "text-orange-600"}`}>
                {isIncrease ? "▲" : "▼"} {Math.abs(Number(diffPct))}% ({isIncrease ? "+" : ""}{diff.toLocaleString("fr-FR")} XOF)
              </p>
            </div>
          </div>

          <p className="text-xs text-gray-400">
            Source : {liveSource}. Ce taux n&apos;affecte pas les transactions historiques déjà validées.
          </p>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 p-2 rounded">{error}</p>
          )}

          {updated && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-2 rounded">
              <Check className="w-4 h-4" />
              Taux mis à jour avec succès
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleKeep} disabled={isPending}>
            Conserver ({storedRate.toLocaleString("fr-FR")} XOF)
          </Button>
          <Button onClick={handleUpdate} disabled={isPending || updated} className="gap-1.5">
            {isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
            Mettre à jour ({liveRate.toLocaleString("fr-FR")} XOF)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
