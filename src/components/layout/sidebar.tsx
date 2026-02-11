"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
    LayoutDashboard,
    History,
    Wallet,
    Gamepad2,
    MessageSquare,
    GraduationCap,
    LifeBuoy,
    Bell
} from "lucide-react"

const routes = [
    {
        label: "Dashboard",
        icon: LayoutDashboard,
        href: "/dashboard",
        color: "text-sky-500",
    },
    {
        label: "Histórico",
        icon: History,
        href: "/historico",
        color: "text-violet-500",
    },
    {
        label: "Banca",
        icon: Wallet,
        href: "/banca",
        color: "text-pink-700",
    },
    {
        label: "Cassino",
        icon: Gamepad2,
        href: "/cassino",
        color: "text-orange-700",
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

export function Sidebar() {
    const pathname = usePathname()

    return (
        <div className="space-y-4 py-4 flex flex-col h-full bg-slate-900 text-white">
            <div className="px-3 py-2 flex-1">
                <Link href="/dashboard" className="flex items-center pl-3 mb-14">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                        Aviator Pro
                    </h1>
                </Link>
                <div className="space-y-1">
                    {routes.map((route) => (
                        <Link
                            key={route.href}
                            href={route.href}
                            className={cn(
                                "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
                                pathname === route.href
                                    ? "text-white bg-white/10"
                                    : "text-zinc-400"
                            )}
                        >
                            <div className="flex items-center flex-1">
                                <route.icon className={cn("h-5 w-5 mr-3", route.color)} />
                                {route.label}
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    )
}

export function MobileNav() {
    const pathname = usePathname()

    return (
        <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-background border-t border-border flex justify-around items-center md:hidden">
            {routes.slice(0, 5).map((route) => { // Limit to 5 items for mobile
                const isActive = pathname === route.href
                return (
                    <Link
                        key={route.href}
                        href={route.href}
                        className={cn(
                            "flex flex-col items-center justify-center w-full h-full space-y-1",
                            isActive ? "text-primary" : "text-muted-foreground"
                        )}
                    >
                        <route.icon className={cn("h-5 w-5", isActive && "fill-current")} />
                        <span className="text-[10px]">{route.label}</span>
                    </Link>
                )
            })}
        </div>
    )
}
