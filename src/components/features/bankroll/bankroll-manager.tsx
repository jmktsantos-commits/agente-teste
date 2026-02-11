"use client"

import { useState } from "react"
import { Shield, TrendingUp, Target, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { calculateBankroll, type RiskProfile, type BankrollResult } from "@/lib/bankroll-calculator"

export function BankrollManager() {
    const [balance, setBalance] = useState("")
    const [selectedRisk, setSelectedRisk] = useState<RiskProfile>("moderado")
    const [result, setResult] = useState<BankrollResult | null>(null)
    const [error, setError] = useState("")

    const handleCalculate = (e: React.FormEvent) => {
        e.preventDefault()
        setError("")

        const balanceNum = Number(balance)
        if (!balance || balanceNum <= 0) {
            setError("Digite um valor válido para a banca")
            return
        }

        try {
            const calculation = calculateBankroll(balanceNum, selectedRisk)
            setResult(calculation)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Erro ao calcular")
        }
    }

    const getRiskLabel = (risk: RiskProfile) => {
        const labels = {
            conservador: { text: "Conservador (1%)", color: "green" },
            moderado: { text: "Moderado (2-3%)", color: "yellow" },
            agressivo: { text: "Agressivo (4-5%)", color: "red" }
        }
        return labels[risk]
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-slate-900 border-slate-800 text-white">
                <CardHeader>
                    <CardTitle>Calculadora de Banca</CardTitle>
                    <CardDescription className="text-slate-400">
                        Defina sua banca e perfil de risco para receber sua estratégia de apostas
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleCalculate} className="space-y-6">
                        <div className="space-y-2">
                            <Label>Valor da Banca (R$)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                placeholder="Ex: 1000.00"
                                value={balance}
                                onChange={(e) => setBalance(e.target.value)}
                                className="bg-slate-800 border-slate-700 text-white"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Perfil de Risco</Label>
                            <div className="grid grid-cols-1 gap-2">
                                {(["conservador", "moderado", "agressivo"] as const).map((risk) => {
                                    const { text, color } = getRiskLabel(risk)
                                    const isSelected = selectedRisk === risk
                                    return (
                                        <div
                                            key={risk}
                                            onClick={() => setSelectedRisk(risk)}
                                            className={`cursor-pointer rounded-md border-2 p-3 text-sm font-medium transition-all ${isSelected
                                                    ? `border-${color}-500 bg-${color}-500/10 text-${color}-500`
                                                    : "border-slate-700 bg-slate-800 hover:border-slate-600 text-slate-300"
                                                }`}
                                        >
                                            {text}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {error && (
                            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md p-2">
                                {error}
                            </div>
                        )}

                        <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
                            <Zap className="mr-2 h-4 w-4" />
                            Calcular Gestão
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {result && (
                <div className="space-y-4">
                    <Card className="bg-slate-900 border-slate-800">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <Shield className="w-5 h-5 text-green-500" />
                                Estratégia de Apostas
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-800 rounded-lg p-3">
                                    <div className="text-xs text-slate-400 mb-1">Total a Jogar</div>
                                    <div className="text-xl font-bold text-white">R$ {result.total_bet.toFixed(2)}</div>
                                    <div className="text-xs text-slate-500">{result.percentage_used}% da banca</div>
                                </div>
                                <div className="bg-slate-800 rounded-lg p-3">
                                    <div className="text-xs text-slate-400 mb-1">Proteção (60%)</div>
                                    <div className="text-xl font-bold text-green-500">R$ {result.protection_bet.toFixed(2)}</div>
                                    <div className="text-xs text-slate-500">Sair em 2.1x</div>
                                </div>
                            </div>

                            <div className="bg-slate-800 rounded-lg p-3">
                                <div className="text-xs text-slate-400 mb-1">Risco (40%)</div>
                                <div className="text-xl font-bold text-yellow-500">R$ {result.risk_bet.toFixed(2)}</div>
                                <div className="text-xs text-slate-500">Velas mais altas</div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-900 border-slate-800">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-blue-400">
                                <Target className="w-5 h-5" />
                                Dicas de Gestão
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-2 text-sm text-slate-300">
                                {result.tips.map((tip, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        <span className="text-blue-400 mt-0.5">•</span>
                                        <span>{tip}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
