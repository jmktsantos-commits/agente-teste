"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MessageSquare, Mail, Globe, Loader2, Inbox } from "lucide-react"
import { CRMService, DBConversation, DBMessage, ConversationType } from "@/services/crm"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"

interface LeadActivityFeedProps {
    leadId: string
}

// Each flattened item to display in the timeline
interface ActivityItem {
    id: string
    channel: ConversationType
    direction: "inbound" | "outbound"
    content: string
    created_at: string
}

const CHANNEL_ICON: Record<ConversationType, React.ReactNode> = {
    whatsapp: <MessageSquare className="h-4 w-4 text-green-600" />,
    email: <Mail className="h-4 w-4 text-blue-600" />,
    site_chat: <Globe className="h-4 w-4 text-purple-600" />,
}

const CHANNEL_BG: Record<ConversationType, string> = {
    whatsapp: "bg-green-100 dark:bg-green-900/30",
    email: "bg-blue-100 dark:bg-blue-900/30",
    site_chat: "bg-purple-100 dark:bg-purple-900/30",
}

const CHANNEL_LABEL: Record<ConversationType, string> = {
    whatsapp: "WhatsApp",
    email: "Email",
    site_chat: "Chat do Site",
}

function timeAgo(dateStr: string) {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ptBR })
}

export function LeadActivityFeed({ leadId }: LeadActivityFeedProps) {
    const [items, setItems] = useState<ActivityItem[]>([])
    const [loading, setLoading] = useState(true)
    const [displayCount, setDisplayCount] = useState(10)

    useEffect(() => {
        const load = async () => {
            try {
                // Fetch all conversations for this lead
                const conversations = await CRMService.getConversations(leadId)

                // Fetch messages from all conversations in parallel
                const allMessages: ActivityItem[] = []
                await Promise.all(
                    conversations.map(async (conv: DBConversation) => {
                        const msgs = await CRMService.getMessages(conv.id)
                        msgs.forEach((msg: DBMessage) => {
                            allMessages.push({
                                id: msg.id,
                                channel: conv.channel,
                                direction: msg.direction,
                                content: msg.content,
                                created_at: msg.created_at,
                            })
                        })
                    })
                )

                // Sort newest first
                allMessages.sort(
                    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                )

                setItems(allMessages)
            } catch (err) {
                console.error("Failed to load activity feed", err)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [leadId])

    const visible = items.slice(0, displayCount)
    const hasMore = displayCount < items.length

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex gap-2">
                    <Button
                        variant="secondary"
                        size="sm"
                        className="bg-primary/10 text-primary hover:bg-primary/20"
                    >
                        Toda Atividade
                    </Button>
                </div>
                {!loading && items.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                        {items.length} registro(s)
                    </span>
                )}
            </div>

            {/* Timeline */}
            {loading ? (
                <div className="flex h-40 items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : visible.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
                    <Inbox className="h-8 w-8 opacity-40" />
                    <p className="text-sm">Nenhuma atividade registrada ainda.</p>
                </div>
            ) : (
                <div className="relative pl-6 space-y-6 border-l-2 ml-4 md:ml-6 border-muted">
                    {visible.map((item) => (
                        <div key={item.id} className="relative">
                            {/* Icon bubble */}
                            <div
                                className={`absolute -left-[33px] p-2 rounded-full border-4 border-background ${CHANNEL_BG[item.channel]}`}
                            >
                                {CHANNEL_ICON[item.channel]}
                            </div>

                            <Card className="border shadow-sm">
                                <CardContent className="p-4 space-y-1.5">
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className="text-sm font-semibold">
                                                {CHANNEL_LABEL[item.channel]}
                                            </h4>
                                            <Badge
                                                variant="outline"
                                                className={
                                                    item.direction === "inbound"
                                                        ? "text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300"
                                                        : "text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300"
                                                }
                                            >
                                                {item.direction === "inbound" ? "Recebida" : "Enviada"}
                                            </Badge>
                                        </div>
                                        <span className="text-xs text-muted-foreground shrink-0">
                                            {timeAgo(item.created_at)}
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                                        {item.content}
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    ))}
                </div>
            )}

            {/* Load More */}
            {hasMore && (
                <div className="flex justify-center pt-2">
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => setDisplayCount((c) => c + 10)}
                    >
                        Carregar mais atividades
                    </Button>
                </div>
            )}
        </div>
    )
}
