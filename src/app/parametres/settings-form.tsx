"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useTransition } from "react";
import {
  upsertSettingsAction,
  uploadLogoAction,
  deleteLogoAction,
  uploadFaviconAction,
  deleteFaviconAction,
} from "@/actions/settings";
import { sendTestNotificationAction } from "@/actions/notifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Upload, Trash2, ImageIcon, MessageSquare, Send } from "lucide-react";

interface Currency { id: string; code: string; name: string; symbol: string; }
interface Settings {
  appName: string;
  companyName: string;
  logo: string | null;
  favicon: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  whatsappNumber: string | null;
  email: string | null;
  website: string | null;
  slogan: string | null;
  primaryColor: string;
  secondaryColor: string;
  buttonColor: string;
  sidebarColor: string;
  taxNumber: string | null;
  defaultCurrencyId: string | null;
  invoicePrefix: string;
  receiptPrefix: string;
  whatsappEnabled: boolean;
  whatsappApiKey: string | null;
  whatsappPhoneNumberId: string | null;
  whatsappBusinessAccountId: string | null;
  companySenderName: string | null;
  smsEnabled: boolean;
  smsProvider: string | null;
  smsApiKey: string | null;
  emailEnabled: boolean;
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
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingFavicon, setIsUploadingFavicon] = useState(false);
  const [isDeletingFavicon, setIsDeletingFavicon] = useState(false);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(settings?.favicon ?? null);
  const [primaryColor, setPrimaryColor] = useState(settings?.primaryColor ?? "#2563eb");
  const [secondaryColor, setSecondaryColor] = useState(settings?.secondaryColor ?? "#0f172a");
  const [buttonColor, setButtonColor] = useState(settings?.buttonColor ?? "#2563eb");
  const [sidebarColor, setSidebarColor] = useState(settings?.sidebarColor ?? "#0f172a");
  const [whatsappEnabled, setWhatsappEnabled] = useState(settings?.whatsappEnabled ?? false);
  const [smsEnabled, setSmsEnabled] = useState(settings?.smsEnabled ?? false);
  const [emailEnabled, setEmailEnabled] = useState(settings?.emailEnabled ?? false);
  const [testRecipient, setTestRecipient] = useState("");
  const [isTestPending, startTestTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    if (currencyId) formData.set("defaultCurrencyId", currencyId);
    formData.set("primaryColor", primaryColor);
    formData.set("secondaryColor", secondaryColor);
    formData.set("buttonColor", buttonColor);
    formData.set("sidebarColor", sidebarColor);
    formData.set("whatsappEnabled", String(whatsappEnabled));
    formData.set("smsEnabled", String(smsEnabled));
    formData.set("emailEnabled", String(emailEnabled));
    const result = await upsertSettingsAction(formData);
    setIsLoading(false);
    if (result.error) {
      toast({ title: "Erreur", description: result.error, variant: "destructive" });
    } else {
      toast({ title: "Paramètres sauvegardés" });
      router.refresh();
    }
  };

  const handleTestNotification = () => {
    if (!testRecipient.trim()) {
      toast({ title: "Erreur", description: "Saisissez un numéro de test", variant: "destructive" });
      return;
    }
    startTestTransition(async () => {
      const fd = new FormData();
      fd.set("channel", "whatsapp");
      fd.set("recipient", testRecipient);
      const result = await sendTestNotificationAction(fd);
      if (result.error) {
        toast({ title: "Test échoué", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Test envoyé", description: `Message de test envoyé à ${testRecipient}` });
      }
    });
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

  const handleFaviconChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingFavicon(true);
    const formData = new FormData();
    formData.append("favicon", file);
    const result = await uploadFaviconAction(formData);
    setIsUploadingFavicon(false);
    if (result.error) {
      toast({ title: "Erreur", description: result.error, variant: "destructive" });
    } else if (result.url) {
      setFaviconUrl(result.url);
      toast({ title: "Favicon mis à jour" });
    }
    if (faviconInputRef.current) faviconInputRef.current.value = "";
  };

  const handleDeleteFavicon = async () => {
    if (!confirm("Supprimer le favicon ?")) return;
    setIsDeletingFavicon(true);
    const result = await deleteFaviconAction();
    setIsDeletingFavicon(false);
    if (result.error) {
      toast({ title: "Erreur", description: result.error, variant: "destructive" });
    } else {
      setFaviconUrl(null);
      toast({ title: "Favicon supprimé" });
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

          <Separator />

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-16 h-16 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center bg-gray-50 shrink-0 overflow-hidden">
              {faviconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={faviconUrl} alt="Favicon" className="w-full h-full object-contain p-1" />
              ) : (
                <ImageIcon className="w-5 h-5 text-gray-400" />
              )}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Favicon</p>
              <p className="text-xs text-gray-500">Formats : PNG, ICO, SVG, JPEG · Max 1 Mo</p>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={faviconInputRef}
                  type="file"
                  accept="image/png,image/x-icon,image/svg+xml,image/jpeg"
                  className="hidden"
                  onChange={handleFaviconChange}
                />
                <Button type="button" variant="outline" size="sm" disabled={isUploadingFavicon}
                  onClick={() => faviconInputRef.current?.click()}>
                  {isUploadingFavicon
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Upload...</>
                    : <><Upload className="w-4 h-4 mr-2" />{faviconUrl ? "Remplacer" : "Téléverser"}</>
                  }
                </Button>
                {faviconUrl && (
                  <Button type="button" variant="outline" size="sm"
                    className="text-red-500 hover:text-red-700" disabled={isDeletingFavicon}
                    onClick={handleDeleteFavicon}>
                    {isDeletingFavicon
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <><Trash2 className="w-4 h-4 mr-2" />Supprimer</>
                    }
                  </Button>
                )}
              </div>
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
              <Label htmlFor="appName">Nom de l&apos;application *</Label>
              <Input id="appName" name="appName" defaultValue={settings?.appName ?? "DazzUrembo App"} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="companyName">Nom de l&apos;entreprise *</Label>
              <Input id="companyName" name="companyName" defaultValue={settings?.companyName ?? "DazzUrembo App"} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="slogan">Slogan</Label>
              <Input id="slogan" name="slogan" defaultValue={settings?.slogan ?? ""} placeholder="Votre slogan" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="phone">Téléphone</Label>
                <Input id="phone" name="phone" defaultValue={settings?.phone ?? ""} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="whatsappNumber">WhatsApp</Label>
                <Input id="whatsappNumber" name="whatsappNumber" defaultValue={settings?.whatsappNumber ?? ""} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" defaultValue={settings?.email ?? ""} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="website">Site web</Label>
                <Input id="website" name="website" defaultValue={settings?.website ?? ""} placeholder="https://..." />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="address">Adresse</Label>
              <Input id="address" name="address" defaultValue={settings?.address ?? ""} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="city">Ville</Label>
                <Input id="city" name="city" defaultValue={settings?.city ?? ""} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="country">Pays</Label>
                <Input id="country" name="country" defaultValue={settings?.country ?? ""} />
              </div>
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
            <Separator />
            <div>
              <p className="font-medium text-sm mb-3">Couleurs de l&apos;application</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="primaryColor">Principale</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" id="primaryColor" value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-9 h-9 rounded border border-gray-200 cursor-pointer" />
                    <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="text-xs" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="secondaryColor">Secondaire</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" id="secondaryColor" value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-9 h-9 rounded border border-gray-200 cursor-pointer" />
                    <Input value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="text-xs" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="buttonColor">Boutons</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" id="buttonColor" value={buttonColor}
                      onChange={(e) => setButtonColor(e.target.value)}
                      className="w-9 h-9 rounded border border-gray-200 cursor-pointer" />
                    <Input value={buttonColor} onChange={(e) => setButtonColor(e.target.value)} className="text-xs" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="sidebarColor">Sidebar</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" id="sidebarColor" value={sidebarColor}
                      onChange={(e) => setSidebarColor(e.target.value)}
                      className="w-9 h-9 rounded border border-gray-200 cursor-pointer" />
                    <Input value={sidebarColor} onChange={(e) => setSidebarColor(e.target.value)} className="text-xs" />
                  </div>
                </div>
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
      {/* Notifications */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-600" />
            Notifications clients
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* WhatsApp */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">WhatsApp Business</p>
                <p className="text-xs text-gray-500">Notifications via Meta WhatsApp Business API</p>
              </div>
              <Switch checked={whatsappEnabled} onCheckedChange={setWhatsappEnabled} />
            </div>
            {whatsappEnabled && (
              <div className="pl-4 border-l-2 border-blue-100 space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="whatsappApiKey">Access Token</Label>
                  <Input
                    id="whatsappApiKey"
                    name="whatsappApiKey"
                    type="password"
                    defaultValue={settings?.whatsappApiKey ?? ""}
                    placeholder="EAAxxxxxxxx..."
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="whatsappPhoneNumberId">Phone Number ID</Label>
                    <Input
                      id="whatsappPhoneNumberId"
                      name="whatsappPhoneNumberId"
                      defaultValue={settings?.whatsappPhoneNumberId ?? ""}
                      placeholder="123456789..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="whatsappBusinessAccountId">Business Account ID</Label>
                    <Input
                      id="whatsappBusinessAccountId"
                      name="whatsappBusinessAccountId"
                      defaultValue={settings?.whatsappBusinessAccountId ?? ""}
                      placeholder="987654321..."
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="companySenderName">Nom expéditeur</Label>
                  <Input
                    id="companySenderName"
                    name="companySenderName"
                    defaultValue={settings?.companySenderName ?? ""}
                    placeholder="DazzUrembo App"
                  />
                </div>
                <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
                  <p className="font-medium mb-1">Sans clés API configurées :</p>
                  <p>Les messages seront enregistrés en mode simulation (mock) et loggués côté serveur.</p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* SMS */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">SMS</p>
                <p className="text-xs text-gray-500">Notifications par SMS (Twilio, etc.)</p>
              </div>
              <Switch checked={smsEnabled} onCheckedChange={setSmsEnabled} />
            </div>
            {smsEnabled && (
              <div className="pl-4 border-l-2 border-gray-100 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="smsProvider">Fournisseur</Label>
                    <Input
                      id="smsProvider"
                      name="smsProvider"
                      defaultValue={settings?.smsProvider ?? ""}
                      placeholder="twilio, vonage..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="smsApiKey">Clé API</Label>
                    <Input
                      id="smsApiKey"
                      name="smsApiKey"
                      type="password"
                      defaultValue={settings?.smsApiKey ?? ""}
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-400">SMS : intégration en cours de développement</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Email */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Email</p>
              <p className="text-xs text-gray-500">Notifications par email (intégration à venir)</p>
            </div>
            <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
          </div>

          <Separator />

          {/* Test */}
          <div className="space-y-3">
            <p className="font-medium text-sm">Tester une notification</p>
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder="Numéro WhatsApp (+243...)"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                className="flex-1 min-w-48"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleTestNotification}
                disabled={isTestPending}
              >
                {isTestPending
                  ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  : <Send className="w-4 h-4 mr-2" />}
                Tester
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
