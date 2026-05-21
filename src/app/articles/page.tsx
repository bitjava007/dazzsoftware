import { getArticles, getArticleTypes } from "@/actions/articles";
import { ArticlesContent } from "./articles-content";

export default async function ArticlesPage() {
  const [articles, articleTypes] = await Promise.all([
    getArticles(),
    getArticleTypes(),
  ]);
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Articles</h1>
        <p className="text-sm text-gray-500 mt-1">Gérez vos modèles de vêtements et types d&apos;articles</p>
      </div>
      <ArticlesContent articles={articles} articleTypes={articleTypes} />
    </div>
  );
}
