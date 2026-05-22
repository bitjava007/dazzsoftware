"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createArticleAction, updateArticleAction, deleteArticleAction,
  createArticleTypeAction, updateArticleTypeAction, deleteArticleTypeAction,
} from "@/actions/articles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { Plus, Edit2, Trash2, Loader2 } from "lucide-react";

interface Article {
  id: string;
  name: string;
  description: string | null;
  indicativePrice: unknown;
  isActive: boolean;
  articleTypeId: string | null;
  articleType: { id: string; name: string } | null;
}

interface ArticleType {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export function ArticlesContent({ articles, articleTypes }: { articles: Article[]; articleTypes: ArticleType[] }) {
  const [articleOpen, setArticleOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [editingType, setEditingType] = useState<ArticleType | null>(null);
  const [articleTypeId, setArticleTypeId] = useState("");
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const handleArticleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (articleTypeId) formData.set("articleTypeId", articleTypeId);

    startTransition(async () => {
      const result = editingArticle
        ? await updateArticleAction(editingArticle.id, formData)
        : await createArticleAction(formData);

      if (result.error) {
        toast({ title: "Erreur", description: result.error, variant: "destructive" });
      } else {
        toast({ title: editingArticle ? "Article modifié" : "Article créé" });
        setArticleOpen(false);
        setEditingArticle(null);
        setArticleTypeId("");
        router.refresh();
      }
    });
  };

  const handleTypeSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = editingType
        ? await updateArticleTypeAction(editingType.id, formData)
        : await createArticleTypeAction(formData);

      if (result.error) {
        toast({ title: "Erreur", description: result.error, variant: "destructive" });
      } else {
        toast({ title: editingType ? "Type modifié" : "Type créé" });
        setTypeOpen(false);
        setEditingType(null);
        router.refresh();
      }
    });
  };

  const handleDeleteArticle = (id: string, name: string) => {
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

  const handleDeleteType = (id: string, name: string) => {
    if (!confirm(`Supprimer le type "${name}" ?`)) return;
    startTransition(async () => {
      const result = await deleteArticleTypeAction(id);
      if (result.error) {
        toast({ title: "Erreur", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Type supprimé" });
        router.refresh();
      }
    });
  };

  return (
    <Tabs defaultValue="articles">
      <TabsList>
        <TabsTrigger value="articles">Articles ({articles.length})</TabsTrigger>
        <TabsTrigger value="types">Types ({articleTypes.length})</TabsTrigger>
      </TabsList>

      {/* Articles Tab */}
      <TabsContent value="articles" className="mt-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Liste des articles</CardTitle>
            <Dialog open={articleOpen} onOpenChange={(v) => { setArticleOpen(v); if (!v) { setEditingArticle(null); setArticleTypeId(""); } }}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-1" />Nouvel article
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingArticle ? "Modifier l'article" : "Nouvel article"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleArticleSubmit} className="space-y-4 mt-2">
                  <div className="space-y-1">
                    <Label htmlFor="name">Nom *</Label>
                    <Input id="name" name="name" defaultValue={editingArticle?.name} required />
                  </div>
                  <div className="space-y-1">
                    <Label>Type d&apos;article</Label>
                    <Select
                      value={articleTypeId || editingArticle?.articleTypeId || ""}
                      onValueChange={setArticleTypeId}
                    >
                      <SelectTrigger><SelectValue placeholder="Sélectionner un type..." /></SelectTrigger>
                      <SelectContent>
                        {articleTypes.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" name="description" defaultValue={editingArticle?.description ?? ""} rows={2} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="indicativePrice">Prix indicatif</Label>
                    <Input id="indicativePrice" name="indicativePrice" type="number" step="0.01" min="0" defaultValue={editingArticle?.indicativePrice as number ?? ""} />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => { setArticleOpen(false); setEditingArticle(null); }}>Annuler</Button>
                    <Button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700">
                      {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingArticle ? "Modifier" : "Créer")}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead className="hidden sm:table-cell">Type</TableHead>
                  <TableHead className="hidden md:table-cell">Description</TableHead>
                  <TableHead className="text-right">Prix indicatif</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {articles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-gray-400">Aucun article</TableCell>
                  </TableRow>
                ) : articles.map((article) => (
                  <TableRow key={article.id} className={!article.isActive ? "opacity-50" : ""}>
                    <TableCell className="font-medium">{article.name}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {article.articleType ? (
                        <Badge variant="outline" className="text-xs">{article.articleType.name}</Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-gray-500 text-sm">{article.description ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      {article.indicativePrice ? formatCurrency(Number(article.indicativePrice)) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setEditingArticle(article); setArticleTypeId(article.articleTypeId ?? ""); setArticleOpen(true); }}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleDeleteArticle(article.id, article.name)} disabled={isPending}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Article Types Tab */}
      <TabsContent value="types" className="mt-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Types d&apos;articles</CardTitle>
            <Dialog open={typeOpen} onOpenChange={(v) => { setTypeOpen(v); if (!v) setEditingType(null); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-1" />Nouveau type
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingType ? "Modifier le type" : "Nouveau type d'article"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleTypeSubmit} className="space-y-4 mt-2">
                  <div className="space-y-1">
                    <Label htmlFor="typeName">Nom *</Label>
                    <Input id="typeName" name="name" defaultValue={editingType?.name} required placeholder="Ex: Vêtements" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="typeDescription">Description</Label>
                    <Textarea id="typeDescription" name="description" defaultValue={editingType?.description ?? ""} rows={2} />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => { setTypeOpen(false); setEditingType(null); }}>Annuler</Button>
                    <Button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700">
                      {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingType ? "Modifier" : "Créer")}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead className="hidden sm:table-cell">Description</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {articleTypes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-gray-400">Aucun type</TableCell>
                  </TableRow>
                ) : articleTypes.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell className="font-medium">{type.name}</TableCell>
                    <TableCell className="hidden sm:table-cell text-gray-500 text-sm">{type.description ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={type.isActive ? "default" : "outline"} className="text-xs">
                        {type.isActive ? "Actif" : "Inactif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setEditingType(type); setTypeOpen(true); }}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleDeleteType(type.id, type.name)} disabled={isPending}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
