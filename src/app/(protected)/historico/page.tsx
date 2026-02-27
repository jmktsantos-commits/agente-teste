"use client"

import { Heatmap } from "@/components/features/history/heatmap"
import { HistoryChart } from "@/components/features/history/history-chart"
import { HistoryTable } from "@/components/features/history/history-table"

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
