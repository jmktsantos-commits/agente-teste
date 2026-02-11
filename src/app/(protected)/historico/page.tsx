"use client"

import { Heatmap } from "@/components/features/history/heatmap"
import { HistoryChart } from "@/components/features/history/history-chart"
import { HistoryTable } from "@/components/features/history/history-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
// Need Tabs component. 
// I'll skip Tabs for now and just stack them or use simple layout.
// Or install Tabs.
// I'll stack them for now as per plan, maybe use Tabs for different views (Chart vs Table).
// But requirements say: "Gráfico principal... Heatmap... Tabela completa".
// I'll put Chart and Heatmap at top, Table below.

export default function HistoryPage() {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <HistoryChart />
                <Heatmap />
            </div>
            <HistoryTable />
        </div>
    )
}
