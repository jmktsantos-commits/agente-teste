"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Users, MessageSquare, Settings, LogOut, LayoutDashboard, ArrowLeft, Shield, GitMerge, Gift } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { ModeToggle } from "@/components/mode-toggle"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> { }

export function AdminSidebar({ className }: SidebarProps) {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push("/login")
    }

    const routes = [
        {
            href: "/admin",
            label: "Dashboard",
            icon: LayoutDashboard,
            active: pathname === "/admin",
        },
        {
            href: "/admin/users",
            label: "Usuários",
            icon: Users,
            active: pathname === "/admin/users",
        },
        {
            href: "/admin/affiliates",
            label: "Afiliados",
            icon: GitMerge,
            active: pathname.startsWith("/admin/affiliates"),
        },
        {
            href: "/admin/trials",
            label: "Free Trials",
            icon: Gift,
            active: pathname.startsWith("/admin/trials"),
        },
        {
            href: "/admin/communications",
            label: "Comunicações",
            icon: MessageSquare,
            active: pathname === "/admin/communications",
        },
        {
            href: "/crm",
            label: "CRM / Leads",
            icon: Users,
            active: pathname.startsWith("/crm"),
        },
        {
            href: "/admin/settings",
            label: "Configurações",
            icon: Settings,
            active: pathname === "/admin/settings",
        },
    ]


    return (
        <div className={cn("flex flex-col min-h-screen bg-card/80 backdrop-blur-sm", className)}>
            {/* Branding */}
            <div className="px-4 py-6 border-b">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
                        <Shield className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold tracking-tight">Admin Panel</h2>
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Aviator Pro</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
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
                                    ? "bg-primary/10 text-primary border-l-2 border-primary"
                                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                            )}
                        >
                            <route.icon className={cn("h-4 w-4", route.active && "text-primary")} />
                            {route.label}
                        </Link>
                    ))}
                </div>
            </div>

            {/* Footer */}
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
