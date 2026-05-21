"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createArticleAction, updateArticleAction, deleteArticleAction } from "@/actions/articles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { Plus, Edit2, Trash2, Loader2 } from "lucide-react";

interface Article {
  id: string;
  name: string;
  description: string | null;
  indicativePrice: unknown;
}

export function ArticlesContent({ articles }: { articles: Article[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Article | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = editing
        ? await updateArticleAction(editing.id, formData)
        : await createArticleAction(formData);

      if (result.error) {
        toast({ title: "Erreur", description: result.error, variant: "destructive" });
      } else {
        toast({ title: editing ? "Article modifié" : "Article créé" });
        setOpen(false);
        setEditing(null);
        router.refresh();
      }
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Supprimer l'article "${name}" ?`)) return;
    startTransition(async () => {
      const result = await deleteArticleAction(id);
      if (result.error) {
        toast({ title: "Erreur", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Article supprimé" });
        router.refresh();
      }
    });
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Liste des articles</CardTitle>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-1" />
              Nouvel article
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Modifier l'article" : "Nouvel article"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-1">
                <Label htmlFor="name">Nom de l&apos;article *</Label>
                <Input id="name" name="name" defaultValue={editing?.name} required placeholder="Ex: Chemise africaine" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" defaultValue={editing?.description ?? ""} rows={3} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="indicativePrice">Prix indicatif</Label>
                <Input id="indicativePrice" name="indicativePrice" type="number" step="0.01" min="0" defaultValue={editing?.indicativePrice as number ?? ""} />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => { setOpen(false); setEditing(null); }}>Annuler</Button>
                <Button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700">
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (editing ? "Modifier" : "Créer")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Prix indicatif</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {articles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-gray-400">Aucun article</TableCell>
              </TableRow>
            ) : (
              articles.map((article) => (
                <TableRow key={article.id}>
                  <TableCell className="font-medium">{article.name}</TableCell>
                  <TableCell className="text-gray-500 text-sm">{article.description ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    {article.indicativePrice ? formatCurrency(Number(article.indicativePrice)) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setEditing(article); setOpen(true); }}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(article.id, article.name)} disabled={isPending}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
