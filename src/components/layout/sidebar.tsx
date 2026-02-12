"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { createClient } from "@/utils/supabase/client"
import {
    LayoutDashboard,
    History,
    Wallet,
    Gamepad2,
    MessageSquare,
    GraduationCap,
    LifeBuoy,
    Rocket,
    LogOut,
    Menu
} from "lucide-react"

const routes = [
    {
        label: "Início",
        icon: History,
        href: "/historico",
        color: "text-violet-500",
    },
    {
        label: "Histórico + Análises",
        icon: LayoutDashboard,
        href: "/dashboard",
        color: "text-sky-500",
    },
    {
        label: "Gestão de Banca",
        icon: Wallet,
        href: "/banca",
        color: "text-pink-500",
    },
    {
        label: "Cassino",
        icon: Gamepad2,
        href: "/cassino",
        color: "text-orange-500",
    },
    {
        label: "Chat",
        icon: MessageSquare,
        href: "/chat",
        color: "text-emerald-500",
    },
    {
        label: "Aprender",
        icon: GraduationCap,
        href: "/aprender",
        color: "text-yellow-500",
    },
    {
        label: "Suporte",
        icon: LifeBuoy,
        href: "/suporte",
        color: "text-blue-500",
    },
]

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> { }

export function Sidebar({ className }: SidebarProps) {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push("/login")
    }

    return (
        <div className={cn("flex flex-col h-full bg-card/80 backdrop-blur-sm border-r border-border", className)}>
            {/* Branding */}
            <div className="px-6 py-8 border-b border-border/50">
                <Link href="/dashboard" className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-pink-600 to-purple-600 shadow-lg shadow-pink-500/20">
                        <Rocket className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
                            Aviator Pro
                        </h1>
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                            Plataforma de Sinais
                        </p>
                    </div>
                </Link>
            </div>

            {/* Navigation */}
            <div className="flex-1 px-4 py-6 overflow-y-auto">
                <p className="px-2 mb-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                    Menu Principal
                </p>
                <div className="space-y-1">
                    {routes.map((route) => {
                        const isActive = pathname === route.href
                        return (
                            <Link
                                key={route.href}
                                href={route.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200 group relative overflow-hidden",
                                    isActive
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                                )}
                            >
                                {isActive && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
                                )}
                                <route.icon className={cn("h-5 w-5 transition-colors", isActive ? "text-primary" : route.color)} />
                                <span className="relative z-10">{route.label}</span>
                            </Link>
                        )
                    })}
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border/50 bg-card/50">
                <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-red-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 group"
                >
                    <LogOut className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                    Sair da Conta
                </button>
            </div>
        </div>
    )
}

export function MobileNav() {
    const pathname = usePathname()

    return (
        <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-background/95 backdrop-blur-xl border-t border-border flex justify-around items-center md:hidden px-2 shadow-[0_-5px_20px_rgba(0,0,0,0.3)]">
            {routes.slice(0, 5).map((route) => {
                const isActive = pathname === route.href
                return (
                    <Link
                        key={route.href}
                        href={route.href}
                        className={cn(
                            "flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-200 relative",
                            isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {isActive && (
                            <div className="absolute -top-[1px] w-8 h-[2px] bg-primary rounded-full shadow-[0_0_10px_rgba(236,72,153,0.5)]" />
                        )}
                        <route.icon className={cn("h-5 w-5", isActive && "animate-pulse")} />
                        <span className="text-[9px] font-medium">{route.label.split(' ')[0]}</span>
                    </Link>
                )
            })}
        </div>
    )
}
