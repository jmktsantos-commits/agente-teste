"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function CRMLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()

    // Determine current tab based on path
    const currentTab = pathname?.split("/").pop() || "leads"
    const value = ["leads", "analytics", "settings", "conversations", "broadcast"].includes(currentTab) ? currentTab : "leads"

    return (
        <div className="flex flex-col space-y-6">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">CRM</h2>
                    <p className="text-muted-foreground">
                        Gerencie leads, conversas e automações.
                    </p>
                </div>
            </div>

            <Tabs defaultValue="leads" value={value} className="space-y-4">
                <TabsList>
                    <Link href="/crm">
                        <TabsTrigger value="leads">Leads</TabsTrigger>
                    </Link>
                    <Link href="/crm/conversations">
                        <TabsTrigger value="conversations">Conversas</TabsTrigger>
                    </Link>
                    <Link href="/crm/broadcast">
                        <TabsTrigger value="broadcast">Transmissão</TabsTrigger>
                    </Link>
                    <Link href="/crm/analytics">
                        <TabsTrigger value="analytics">Analytics</TabsTrigger>
                    </Link>
                    <Link href="/crm/settings">
                        <TabsTrigger value="settings">Configurações</TabsTrigger>
                    </Link>
                </TabsList>
                <div className="pt-4">
                    {children}
                </div>
            </Tabs>
        </div>
    )
}
