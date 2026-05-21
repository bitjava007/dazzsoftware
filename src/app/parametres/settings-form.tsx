"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { upsertSettingsAction } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";

interface Currency { id: string; code: string; name: string; symbol: string; }
interface Settings {
  companyName: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  taxNumber: string | null;
  defaultCurrencyId: string | null;
  invoicePrefix: string;
  receiptPrefix: string;
}

interface SettingsFormProps {
  settings: Settings | null;
  currencies: Currency[];
}

export function SettingsForm({ settings, currencies }: SettingsFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [currencyId, setCurrencyId] = useState(settings?.defaultCurrencyId ?? "");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    if (currencyId) formData.set("defaultCurrencyId", currencyId);

    const result = await upsertSettingsAction(formData);
    setIsLoading(false);

    if (result.error) {
      toast({ title: "Erreur", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Paramètres sauvegardés" });
      router.refresh();
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Informations de l&apos;entreprise</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="companyName">Nom de l&apos;entreprise *</Label>
            <Input id="companyName" name="companyName" defaultValue={settings?.companyName ?? "Dazzling Tailor"} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="phone">Téléphone</Label>
              <Input id="phone" name="phone" defaultValue={settings?.phone ?? ""} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={settings?.email ?? ""} />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="address">Adresse</Label>
            <Input id="address" name="address" defaultValue={settings?.address ?? ""} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="taxNumber">Numéro fiscal</Label>
            <Input id="taxNumber" name="taxNumber" defaultValue={settings?.taxNumber ?? ""} />
          </div>

          <div className="space-y-1">
            <Label>Devise par défaut</Label>
            <Select value={currencyId} onValueChange={setCurrencyId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une devise" />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.code} - {c.name} ({c.symbol})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="invoicePrefix">Préfixe facture</Label>
              <Input id="invoicePrefix" name="invoicePrefix" defaultValue={settings?.invoicePrefix ?? "FACT-"} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="receiptPrefix">Préfixe reçu</Label>
              <Input id="receiptPrefix" name="receiptPrefix" defaultValue={settings?.receiptPrefix ?? "RECU-"} />
            </div>
          </div>

          <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
            {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sauvegarde...</> : <><Save className="w-4 h-4 mr-2" />Sauvegarder</>}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
