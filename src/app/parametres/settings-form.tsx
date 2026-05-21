"use client";

import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { upsertSettingsAction, uploadLogoAction, deleteLogoAction } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Upload, Trash2, ImageIcon } from "lucide-react";

interface Currency { id: string; code: string; name: string; symbol: string; }
interface Settings {
  companyName: string;
  logo: string | null;
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currencyId, setCurrencyId] = useState(settings?.defaultCurrencyId ?? "");
  const [logoUrl, setLogoUrl] = useState<string | null>(settings?.logo ?? null);

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

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append("logo", file);
    const result = await uploadLogoAction(formData);
    setIsUploading(false);
    if (result.error) {
      toast({ title: "Erreur", description: result.error, variant: "destructive" });
    } else if (result.url) {
      setLogoUrl(result.url);
      toast({ title: "Logo mis à jour" });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDeleteLogo = async () => {
    if (!confirm("Supprimer le logo ?")) return;
    setIsDeleting(true);
    const result = await deleteLogoAction();
    setIsDeleting(false);
    if (result.error) {
      toast({ title: "Erreur", description: result.error, variant: "destructive" });
    } else {
      setLogoUrl(null);
      toast({ title: "Logo supprimé" });
    }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Logo */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Logo de l&apos;entreprise</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-28 h-28 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center bg-gray-50 shrink-0 overflow-hidden">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
              ) : (
                <div className="text-center text-gray-400">
                  <ImageIcon className="w-8 h-8 mx-auto mb-1" />
                  <p className="text-xs">Aucun logo</p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-500">Formats : JPEG, PNG, WebP, SVG · Max 2 Mo</p>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={handleLogoChange}
                />
                <Button type="button" variant="outline" size="sm" disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}>
                  {isUploading
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Upload...</>
                    : <><Upload className="w-4 h-4 mr-2" />{logoUrl ? "Remplacer" : "Téléverser"}</>
                  }
                </Button>
                {logoUrl && (
                  <Button type="button" variant="outline" size="sm"
                    className="text-red-500 hover:text-red-700" disabled={isDeleting}
                    onClick={handleDeleteLogo}>
                    {isDeleting
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <><Trash2 className="w-4 h-4 mr-2" />Supprimer</>
                    }
                  </Button>
                )}
              </div>
              <p className="text-xs text-gray-400">Apparaît sur les factures PDF et le tableau de bord.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company info */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Informations de l&apos;entreprise</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="companyName">Nom de l&apos;entreprise *</Label>
              <Input id="companyName" name="companyName" defaultValue={settings?.companyName ?? "Dazzling Tailor"} required />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <SelectItem key={c.id} value={c.id}>{c.code} - {c.name} ({c.symbol})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              {isLoading
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sauvegarde...</>
                : <><Save className="w-4 h-4 mr-2" />Sauvegarder</>
              }
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
