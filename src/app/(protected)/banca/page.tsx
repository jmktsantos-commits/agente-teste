"use client"

import { CompoundCalculator } from "@/components/features/bankroll/compound-calculator"
import { BankrollManager } from "@/components/features/bankroll/bankroll-manager"
import { Wallet, TrendingUp } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function BancaPage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col items-center gap-4 py-6">
                <div className="flex items-center gap-3">
                    <Wallet className="w-8 h-8 text-pink-500" />
                    <h1 className="text-3xl md:text-4xl font-black uppercase tracking-wider bg-gradient-to-r from-pink-400 to-purple-600 bg-clip-text text-transparent text-center">
                        Gestão de Banca
                    </h1>
                </div>
                <p className="text-slate-400 text-center max-w-2xl">
                    Gerencie e projete o crescimento da sua banca com nossas ferramentas profissionais
                </p>
            </div>

            {/* Tabs for different tools */}
            <Tabs defaultValue="calculator" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-slate-900 border border-slate-800 h-14">
                    <TabsTrigger
                        value="calculator"
                        className="text-sm font-bold data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-600 data-[state=active]:to-purple-600 data-[state=active]:text-white h-full flex items-center gap-2"
                    >
                        <TrendingUp className="w-4 h-4" />
                        Projeção de Crescimento
                    </TabsTrigger>
                    <TabsTrigger
                        value="manager"
                        className="text-sm font-bold data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-600 data-[state=active]:to-purple-600 data-[state=active]:text-white h-full flex items-center gap-2"
                    >
                        <Wallet className="w-4 h-4" />
                        Gestão de Apostas
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="calculator" className="mt-6">
                    <CompoundCalculator />
                </TabsContent>

                <TabsContent value="manager" className="mt-6">
                    <BankrollManager />
                </TabsContent>
            </Tabs>
        </div>
    )
}
