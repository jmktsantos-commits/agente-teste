"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, Calculator, DollarSign, ChevronDown, ChevronUp, Target, CheckCircle2 } from "lucide-react"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

type ProjectionDay = {
    day: number
    balance: number
    profit: number
    cumulativeProfit: number
    stoploss: number
}

export function CompoundCalculator() {
    const [initialBalance, setInitialBalance] = useState<string>("1000")
    const [days, setDays] = useState<string>("30")
    const [dailyPercent, setDailyPercent] = useState<string>("2")
    const [stoplossPercent, setStoplossPercent] = useState<string>("5")
    const [projection, setProjection] = useState<ProjectionDay[]>([])
    const [calculated, setCalculated] = useState(false)
    const [isTableOpen, setIsTableOpen] = useState(true)
    const [checkedDays, setCheckedDays] = useState<Set<number>>(new Set())

    // Load saved checked days from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('aviator_bankroll_checked_days')
        if (saved) {
            try {
                const parsed = JSON.parse(saved)
                setCheckedDays(new Set(parsed))
            } catch (e) {
                console.error("Failed to load progress", e)
            }
        }
    }, [])

    // Save checked days to localStorage when changed
    useEffect(() => {
        const array = Array.from(checkedDays)
        localStorage.setItem('aviator_bankroll_checked_days', JSON.stringify(array))
    }, [checkedDays])

    const calculateProjection = () => {
        const initial = parseFloat(initialBalance) || 0
        const numDays = parseInt(days) || 0
        const percent = parseFloat(dailyPercent) || 0
        const slPercent = parseFloat(stoplossPercent) || 0

        if (initial <= 0 || numDays <= 0 || percent <= 0) {
            return
        }

        const results: ProjectionDay[] = []
        let currentBalance = initial
        let totalProfit = 0

        for (let day = 1; day <= numDays; day++) {
            const startBalance = currentBalance
            const dailyProfit = currentBalance * (percent / 100)
            currentBalance += dailyProfit
            totalProfit += dailyProfit
            const dailyStoploss = startBalance * (slPercent / 100)

            results.push({
                day,
                balance: currentBalance,
                profit: dailyProfit,
                cumulativeProfit: totalProfit,
                stoploss: dailyStoploss
            })
        }

        setProjection(results)
        setCalculated(true)
        setIsTableOpen(true)
    }

    const toggleDay = (day: number) => {
        const newChecked = new Set(checkedDays)
        if (newChecked.has(day)) {
            newChecked.delete(day)
        } else {
            newChecked.add(day)
        }
        setCheckedDays(newChecked)
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value)
    }

    const finalBalance = projection.length > 0 ? projection[projection.length - 1].balance : 0
    const totalProfit = projection.length > 0 ? projection[projection.length - 1].cumulativeProfit : 0
    const roi = initialBalance ? ((totalProfit / parseFloat(initialBalance)) * 100) : 0

    // Progress calculation based on days checked vs total projected days
    const totalDays = projection.length
    const daysCompleted = Array.from(checkedDays).filter(d => d <= totalDays).length
    const progressPercentage = totalDays > 0 ? (daysCompleted / totalDays) * 100 : 0

    return (
        <div className="space-y-6">
            {/* Calculator Input Card */}
            <Card className="bg-gradient-to-br from-slate-900 via-slate-900 to-pink-950/20 border-slate-800">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl">
                        <Calculator className="w-6 h-6 text-pink-500" />
                        Calculadora de Juros Compostos
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                        Simule o crescimento da sua banca com ganhos diários consistentes
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {/* Initial Balance */}
                        <div className="space-y-2">
                            <Label htmlFor="initial" className="text-slate-300 flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-green-500" />
                                Banca Inicial (R$)
                            </Label>
                            <Input
                                id="initial"
                                type="number"
                                value={initialBalance}
                                onChange={(e) => setInitialBalance(e.target.value)}
                                className="bg-slate-800 border-slate-700 text-white text-lg font-mono"
                                placeholder="1000"
                                min="0"
                                step="100"
                            />
                        </div>

                        {/* Days */}
                        <div className="space-y-2">
                            <Label htmlFor="days" className="text-slate-300 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-blue-500" />
                                Quantidade de Dias
                            </Label>
                            <Input
                                id="days"
                                type="number"
                                value={days}
                                onChange={(e) => setDays(e.target.value)}
                                className="bg-slate-800 border-slate-700 text-white text-lg font-mono"
                                placeholder="30"
                                min="1"
                                max="365"
                            />
                        </div>

                        {/* Daily Percent */}
                        <div className="space-y-2">
                            <Label htmlFor="percent" className="text-slate-300 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-purple-500" />
                                % de Ganho por Dia
                            </Label>
                            <Input
                                id="percent"
                                type="number"
                                value={dailyPercent}
                                onChange={(e) => setDailyPercent(e.target.value)}
                                className="bg-slate-800 border-slate-700 text-white text-lg font-mono"
                                placeholder="2"
                                min="0.1"
                                max="100"
                                step="0.5"
                            />
                        </div>

                        {/* Stoploss Percent */}
                        <div className="space-y-2">
                            <Label htmlFor="stoploss" className="text-slate-300">
                                % de Stoploss
                            </Label>
                            <Input
                                id="stoploss"
                                type="number"
                                value={stoplossPercent}
                                onChange={(e) => setStoplossPercent(e.target.value)}
                                className="bg-slate-800 border-red-900/50 text-white text-lg font-mono focus-visible:ring-red-500"
                                placeholder="5"
                                min="0.1"
                                max="100"
                                step="0.5"
                            />
                        </div>

                    </div>

                    <Button
                        onClick={calculateProjection}
                        className="w-full mt-6 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold h-12 text-lg"
                    >
                        <Calculator className="mr-2 h-5 w-5" />
                        Calcular Projeção
                    </Button>
                </CardContent>
            </Card>

            {/* Results Summary */}
            {calculated && projection.length > 0 && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="bg-gradient-to-br from-green-950/30 to-slate-900 border-green-800/50">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-slate-400">Banca Final</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-400">
                                    {formatCurrency(finalBalance)}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-blue-950/30 to-slate-900 border-blue-800/50">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-slate-400">Lucro Total</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-blue-400">
                                    {formatCurrency(totalProfit)}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-purple-950/30 to-slate-900 border-purple-800/50">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-slate-400">ROI</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-purple-400">
                                    {roi.toFixed(2)}%
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-yellow-950/30 to-slate-900 border-yellow-800/50">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-slate-400 flex items-center justify-between">
                                    <span>Progresso</span>
                                    <span className="text-xs text-slate-500">{daysCompleted}/{totalDays} dias</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-yellow-400 mb-2">
                                    {progressPercentage.toFixed(0)}%
                                </div>
                                <Progress value={progressPercentage} className="h-2 bg-slate-800" />
                            </CardContent>
                        </Card>

                    </div>

                    {/* Collapsible Projection Table */}
                    <Collapsible open={isTableOpen} onOpenChange={setIsTableOpen}>
                        <Card className="bg-slate-900 border-slate-800">
                            <CardHeader>
                                <CollapsibleTrigger asChild>
                                    <div className="flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity">
                                        <div>
                                            <CardTitle className="text-xl flex items-center gap-2">
                                                Projeção Dia a Dia
                                                {isTableOpen ? (
                                                    <ChevronUp className="w-5 h-5 text-slate-400" />
                                                ) : (
                                                    <ChevronDown className="w-5 h-5 text-slate-400" />
                                                )}
                                            </CardTitle>
                                            <CardDescription>
                                                {isTableOpen ? 'Clique para ocultar' : `Clique para ver evolução de ${days} dias`}
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CollapsibleTrigger>
                            </CardHeader>
                            <CollapsibleContent>
                                <CardContent>
                                    <div className="rounded-md border border-slate-800 max-h-[500px] overflow-y-auto">
                                        <Table>
                                            <TableHeader className="sticky top-0 bg-slate-900 z-10">
                                                <TableRow className="border-slate-800 hover:bg-slate-800/50">
                                                    <TableHead className="w-[50px]"></TableHead>
                                                    <TableHead className="text-slate-400 font-bold">Dia</TableHead>
                                                    <TableHead className="text-slate-400 font-bold text-right">Meta / Saldo</TableHead>
                                                    <TableHead className="text-slate-400 font-bold text-right">Ganho do Dia</TableHead>
                                                    <TableHead className="text-slate-400 font-bold text-right">Lucro Acumulado</TableHead>
                                                    <TableHead className="text-slate-400 font-bold text-right">Stop Loss</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {projection.map((day) => {
                                                    const isChecked = checkedDays.has(day.day)
                                                    return (
                                                        <TableRow
                                                            key={day.day}
                                                            className={`border-slate-800 transition-colors ${isChecked
                                                                ? 'bg-green-950/10 hover:bg-green-950/20'
                                                                : 'hover:bg-slate-800/50'
                                                                }`}
                                                        >
                                                            <TableCell>
                                                                <Checkbox
                                                                    checked={isChecked}
                                                                    onCheckedChange={() => toggleDay(day.day)}
                                                                    className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600 border-slate-600"
                                                                />
                                                            </TableCell>
                                                            <TableCell className="font-bold text-white">
                                                                Dia {day.day}
                                                            </TableCell>
                                                            <TableCell className={`text-right font-mono ${isChecked ? 'text-green-400' : 'text-slate-300'}`}>
                                                                {formatCurrency(day.balance)}
                                                            </TableCell>
                                                            <TableCell className="text-right font-mono text-blue-400">
                                                                +{formatCurrency(day.profit)}
                                                            </TableCell>
                                                            <TableCell className="text-right font-mono text-purple-400">
                                                                {formatCurrency(day.cumulativeProfit)}
                                                            </TableCell>
                                                            <TableCell className="text-right font-mono text-red-400">
                                                                -{formatCurrency(day.stoploss)}
                                                            </TableCell>
                                                        </TableRow>
                                                    )
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </CollapsibleContent>
                        </Card>
                    </Collapsible>
                </>
            )}

            {/* Helper Info */}
            {!calculated && (
                <Card className="bg-slate-900/50 border-slate-800 border-dashed">
                    <CardContent className="pt-6">
                        <div className="text-center text-slate-400 space-y-2">
                            <p className="text-sm">
                                💡 <strong>Dica:</strong> Configure os valores acima e clique em "Calcular Projeção" para ver o crescimento da sua banca
                            </p>
                            <p className="text-xs">
                                Exemplo: R$ 1.000 inicial + 2% ao dia por 30 dias = R$ 1.811,36 (lucro de R$ 811,36)
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
