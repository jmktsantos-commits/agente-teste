"use client"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Filter } from "lucide-react"

const mockDetailedHistory = Array.from({ length: 15 }, (_, i) => ({
    id: i,
    time: `2023-10-25 14:${(30 - i).toString().padStart(2, '0')}:15`,
    multiplier: (Math.random() * 10 + 1).toFixed(2),
    platform: i % 3 === 0 ? "Bravobet" : "Superbet",
    status: Math.random() > 0.5 ? "green" : "blue"
}))

export function HistoryTable() {
    return (
        <Card className="bg-slate-900 border-slate-800 text-white">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Histórico Detalhado</CardTitle>
                <Button variant="outline" size="sm" className="gap-2">
                    <Filter className="w-4 h-4" />
                    Filtros
                </Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow className="border-slate-800 hover:bg-slate-800/50">
                            <TableHead className="text-slate-400">Data/Hora</TableHead>
                            <TableHead className="text-slate-400">Multiplicador</TableHead>
                            <TableHead className="text-slate-400">Plataforma</TableHead>
                            <TableHead className="text-slate-400">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {mockDetailedHistory.map((row) => (
                            <TableRow key={row.id} className="border-slate-800 hover:bg-slate-800/50">
                                <TableCell className="font-mono text-slate-300">{row.time}</TableCell>
                                <TableCell>
                                    <span className={Number(row.multiplier) >= 10 ? "text-primary font-bold" : Number(row.multiplier) >= 2 ? "text-green-500" : "text-blue-400"}>
                                        {row.multiplier}x
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="border-slate-700 text-slate-300">
                                        {row.platform}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={Number(row.multiplier) >= 2 ? "default" : "secondary"}>
                                        {Number(row.multiplier) >= 2 ? "Win" : "Normal"}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
