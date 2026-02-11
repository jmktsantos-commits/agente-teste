"use client"

import { BankrollManager } from "@/components/features/bankroll/bankroll-manager"

export default function BankrollPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white">Controle de Banca</h1>
            <BankrollManager />
        </div>
    )
}
