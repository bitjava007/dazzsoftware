"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { createInvoiceFromOrderAction } from "@/actions/invoices";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FileText, Loader2 } from "lucide-react";
import Link from "next/link";

export function InvoiceButton({
  orderId,
  clientId,
  currencyId,
  hasInvoice,
  existingInvoiceId,
}: {
  orderId: string;
  clientId: string;
  currencyId: string;
  hasInvoice: boolean;
  existingInvoiceId?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  if (hasInvoice && existingInvoiceId) {
    return (
      <Button variant="outline" size="sm" asChild>
        <Link href="/factures">
          <FileText className="w-4 h-4 mr-1" />Voir facture
        </Link>
      </Button>
    );
  }

  const handleCreate = () => {
    startTransition(async () => {
      const result = await createInvoiceFromOrderAction(orderId);
      if ("error" in result && result.error) {
        toast({ title: "Erreur", description: result.error, variant: "destructive" });
      } else if ("alreadyExists" in result && result.alreadyExists) {
        toast({ title: "Facture existante", description: "Cette commande est déjà facturée" });
        router.push("/factures");
      } else {
        toast({ title: "Facture créée" });
        router.push("/factures");
      }
    });
  };

  return (
    <Button variant="outline" size="sm" onClick={handleCreate} disabled={isPending}>
      {isPending
        ? <Loader2 className="w-4 h-4 mr-1 animate-spin" />
        : <FileText className="w-4 h-4 mr-1" />}
      Générer facture
    </Button>
  );
}
