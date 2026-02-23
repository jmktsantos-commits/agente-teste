"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Users, DollarSign, LogOut, ArrowLeft, Link as LinkIcon, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { ModeToggle } from "@/components/mode-toggle"

export function AffiliateSidebar({ className }: { className?: string }) {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push("/login")
    }

    const routes = [
        { href: "/affiliate", label: "Dashboard", icon: LayoutDashboard, active: pathname === "/affiliate" },
        { href: "/affiliate/leads", label: "Meus Leads", icon: Users, active: pathname.startsWith("/affiliate/leads") },
        { href: "/affiliate/conversations", label: "Conversas", icon: MessageSquare, active: pathname.startsWith("/affiliate/conversations") },
        { href: "/affiliate/commissions", label: "Comissões", icon: DollarSign, active: pathname.startsWith("/affiliate/commissions") },
        { href: "/affiliate/link", label: "Meu Link", icon: LinkIcon, active: pathname.startsWith("/affiliate/link") },
    ]

    return (
        <div className={cn("flex flex-col min-h-screen bg-card/80 backdrop-blur-sm", className)}>
            <div className="px-4 py-6 border-b">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
                        <Users className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold tracking-tight">Painel Afiliado</h2>
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Aviator Pro</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 px-3 py-4">
                <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Menu</p>
                <div className="space-y-1">
                    {routes.map((route) => (
                        <Link
                            key={route.href}
                            href={route.href}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                                route.active
                                    ? "bg-emerald-500/10 text-emerald-500 border-l-2 border-emerald-500"
                                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                            )}
                        >
                            <route.icon className={cn("h-4 w-4", route.active && "text-emerald-500")} />
                            {route.label}
                        </Link>
                    ))}
                </div>
            </div>

            <div className="px-3 py-4 border-t space-y-1">
                <div className="px-3 py-2">
                    <ModeToggle />
                </div>
                <Link
                    href="/dashboard"
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-all duration-200"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar ao Site
                </Link>
                <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-500 hover:text-red-600 hover:bg-red-500/10 transition-all duration-200"
                >
                    <LogOut className="h-4 w-4" />
                    Sair
                </button>
            </div>
        </div>
    )
}
