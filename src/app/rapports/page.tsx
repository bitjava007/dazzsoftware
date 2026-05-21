import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, FileText, TrendingUp } from "lucide-react";

export default function RapportsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Rapports</h1>
        <p className="text-sm text-gray-500 mt-1">Analyses et exportations de données</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6 text-center">
            <TrendingUp className="w-10 h-10 mx-auto text-blue-600 mb-3" />
            <h3 className="font-semibold text-gray-900">Rapport de profit</h3>
            <p className="text-sm text-gray-500 mt-1 mb-4">Analyse des ventes vs dépenses</p>
            <Button variant="outline" size="sm" className="w-full">Générer</Button>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6 text-center">
            <BarChart3 className="w-10 h-10 mx-auto text-green-600 mb-3" />
            <h3 className="font-semibold text-gray-900">Rapport de commandes</h3>
            <p className="text-sm text-gray-500 mt-1 mb-4">Suivi de la production</p>
            <Button variant="outline" size="sm" className="w-full">Générer</Button>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="p-6 text-center">
            <FileText className="w-10 h-10 mx-auto text-purple-600 mb-3" />
            <h3 className="font-semibold text-gray-900">Rapport clients</h3>
            <p className="text-sm text-gray-500 mt-1 mb-4">Analyse de la clientèle</p>
            <Button variant="outline" size="sm" className="w-full">Générer</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
