"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Mail, Phone, MoreHorizontal, MessageSquare, Send, CreditCard } from "lucide-react"
import { DBLead } from "@/services/crm"
import { cn } from "@/lib/utils"

interface LeadProfileHeaderProps {
    lead: DBLead & { last_seen_at?: string }
}

function getPresenceInfo(lastSeenAt?: string): { online: boolean; label: string } {
    if (!lastSeenAt) return { online: false, label: "Nunca visto" }
    const diffMs = Date.now() - new Date(lastSeenAt).getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 2) return { online: true, label: "Online agora" }
    if (diffMin < 60) return { online: false, label: `Visto há ${diffMin} min` }
    const diffH = Math.floor(diffMin / 60)
    if (diffH < 24) return { online: false, label: `Visto há ${diffH}h` }
    return { online: false, label: `Visto há ${Math.floor(diffH / 24)}d` }
}

export function LeadProfileHeader({ lead }: LeadProfileHeaderProps) {
    const presence = getPresenceInfo((lead as any).last_seen_at)

    return (
        <div className="flex border rounded-xl p-6 bg-card items-start justify-between shadow-sm">
            <div className="flex gap-6">
                {/* Avatar with presence dot */}
                <div className="relative">
                    <Avatar className="h-20 w-20 border-2 border-background shadow-md">
                        <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(lead.full_name)}&background=random`} />
                        <AvatarFallback className="text-2xl font-bold">{lead.full_name[0]}</AvatarFallback>
                    </Avatar>
                    {/* Presence indicator */}
                    <span
                        title={presence.label}
                        className={cn(
                            "absolute bottom-0.5 right-0.5 h-4 w-4 rounded-full border-2 border-background transition-colors",
                            presence.online
                                ? "bg-green-500 shadow-[0_0_6px_2px_rgba(34,197,94,0.4)]"
                                : "bg-slate-400"
                        )}
                    />
                </div>

                <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-2xl font-bold">{lead.full_name}</h1>
                        <Badge
                            variant="secondary"
                            className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100 border-none"
                        >
                            {lead.status?.toUpperCase()}
                        </Badge>
                        {/* Presence badge */}
                        <span className={cn(
                            "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
                            presence.online
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-muted text-muted-foreground"
                        )}>
                            <span className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                presence.online ? "bg-green-500 animate-pulse" : "bg-slate-400"
                            )} />
                            {presence.label}
                        </span>
                    </div>

                    <p className="text-muted-foreground font-medium">
                        {lead.source ? `Origem: ${lead.source}` : "Lead"}
                    </p>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground pt-1 flex-wrap">
                        {lead.email && (
                            <div className="flex items-center gap-1">
                                <Mail className="h-4 w-4" />
                                <span>{lead.email}</span>
                            </div>
                        )}
                        {lead.phone && (
                            <a
                                href={`https://wa.me/55${lead.phone.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-green-600 dark:text-green-400 hover:underline"
                            >
                                <Phone className="h-4 w-4" />
                                <span>{lead.phone}</span>
                            </a>
                        )}
                        {(lead as any).plan_name && (
                            <div className="flex items-center gap-1">
                                <CreditCard className="h-4 w-4" />
                                <Badge
                                    variant="outline"
                                    className={(lead as any).plan_name?.toLowerCase().includes("anual")
                                        ? "border-amber-500 text-amber-600 dark:text-amber-400"
                                        : "border-purple-500 text-purple-600 dark:text-purple-400"}
                                >
                                    {(lead as any).plan_name}
                                </Badge>
                            </div>
                        )}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span>Cadastro: {new Date(lead.created_at).toLocaleDateString("pt-BR")}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
                {lead.phone && (
                    <Button
                        className="bg-green-600 hover:bg-green-700 text-white gap-2"
                        onClick={() => window.open(`https://wa.me/${lead.phone?.replace(/\D/g, "")}`, "_blank")}
                    >
                        <MessageSquare className="h-4 w-4" />
                        WhatsApp
                    </Button>
                )}
                {lead.email && (
                    <Button
                        variant="default"
                        className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                        onClick={() => window.open(`mailto:${lead.email}`, "_blank")}
                    >
                        <Send className="h-4 w-4" />
                        Email
                    </Button>
                )}
                <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}
