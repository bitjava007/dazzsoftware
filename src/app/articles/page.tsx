import { getArticles } from "@/actions/articles";
import { ArticlesContent } from "./articles-content";

export default async function ArticlesPage() {
  const articles = await getArticles();
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Articles</h1>
        <p className="text-sm text-gray-500 mt-1">Gérez vos modèles de vêtements</p>
      </div>
      <ArticlesContent articles={articles} />
    </div>
  );
}
