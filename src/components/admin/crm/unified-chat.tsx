"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { Send, Phone, Mail, MessageSquare, Paperclip, MoreVertical, Plus, Wifi } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { CRMService, DBLead, DBConversation, DBMessage } from "@/services/crm"
import { createClient } from "@/utils/supabase/client"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface UnifiedChatProps {
    lead: DBLead
}

const CHANNEL_LABELS: Record<string, string> = {
    whatsapp: "WhatsApp",
    email: "Email",
    site_chat: "Chat do Site",
}

export function UnifiedChat({ lead }: UnifiedChatProps) {
    const [conversations, setConversations] = useState<DBConversation[]>([])
    const [activeConversation, setActiveConversation] = useState<DBConversation | null>(null)
    const [messages, setMessages] = useState<DBMessage[]>([])
    const [newMessage, setNewMessage] = useState("")
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const [realtimeConnected, setRealtimeConnected] = useState(false)
    const [leadTyping, setLeadTyping] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)
    const typingChannelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null)
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const supabase = createClient()

    // Load conversations
    useEffect(() => {
        const load = async () => {
            try {
                const data = await CRMService.getConversations(lead.id)
                setConversations(data)
                if (data.length > 0) setActiveConversation(data[0])
            } catch (err) {
                console.error("Failed to load conversations", err)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [lead.id])

    // Load messages when conversation changes
    useEffect(() => {
        if (!activeConversation) return
        const load = async () => {
            try {
                const msgs = await CRMService.getMessages(activeConversation.id)
                setMessages(msgs)
            } catch (err) {
                console.error("Failed to load messages", err)
            }
        }
        load()
    }, [activeConversation?.id])

    // Supabase Realtime subscription for new messages
    useEffect(() => {
        if (!activeConversation) return

        const channel = supabase
            .channel(`crm_messages:${activeConversation.id}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "crm_messages",
                    filter: `conversation_id=eq.${activeConversation.id}`,
                },
                (payload) => {
                    const msg = payload.new as DBMessage
                    setMessages(prev => {
                        if (prev.find(m => m.id === msg.id)) return prev
                        return [...prev, msg]
                    })
                }
            )
            .subscribe((status) => {
                setRealtimeConnected(status === "SUBSCRIBED")
            })

        return () => { supabase.removeChannel(channel) }
    }, [activeConversation?.id])

    // Typing indicator channel (Broadcast)
    useEffect(() => {
        if (!activeConversation) return

        const channel = supabase.channel(`lead_chat_typing:${activeConversation.id}`)
        channel
            .on("broadcast", { event: "typing" }, (payload) => {
                if (payload.payload?.role === "lead") {
                    setLeadTyping(true)
                    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
                    typingTimeoutRef.current = setTimeout(() => setLeadTyping(false), 3000)
                }
            })
            .subscribe()

        typingChannelRef.current = channel
        return () => {
            supabase.removeChannel(channel)
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
        }
    }, [activeConversation?.id])

    // Broadcast admin typing to lead
    const handleAdminTyping = useCallback(() => {
        if (!typingChannelRef.current) return
        typingChannelRef.current.send({
            type: "broadcast",
            event: "typing",
            payload: { role: "admin" },
        })
    }, [])

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" })
        }
    }, [messages])

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !activeConversation || sending) return
        const content = newMessage.trim()
        setNewMessage("")
        setSending(true)

        // Optimistic update
        const tempMsg: DBMessage = {
            id: `temp-${Date.now()}`,
            conversation_id: activeConversation.id,
            direction: "outbound",
            content,
            content_type: "text",
            created_at: new Date().toISOString(),
        }
        setMessages(prev => [...prev, tempMsg])

        try {
            await CRMService.sendMessage(activeConversation.id, content)
            // Realtime will add the real message; remove temp
            const msgs = await CRMService.getMessages(activeConversation.id)
            setMessages(msgs)
        } catch (err) {
            toast.error("Erro ao enviar mensagem")
            setMessages(prev => prev.filter(m => m.id !== tempMsg.id))
            setNewMessage(content)
        } finally {
            setSending(false)
        }
    }

    const handleCreateSiteChat = async () => {
        try {
            const { data, error } = await supabase
                .from("crm_conversations")
                .insert({
                    lead_id: lead.id,
                    channel: "site_chat",
                    status: "open",
                    last_message_at: new Date().toISOString(),
                })
                .select()
                .single()
            if (error) throw error
            const newConv = data as DBConversation
            setConversations(prev => [newConv, ...prev])
            setActiveConversation(newConv)
            toast.success("Conversa de chat criada!")
        } catch (err: any) {
            toast.error("Erro ao criar conversa: " + err.message)
        }
    }

    const getChannelIcon = (type: string) => {
        switch (type) {
            case "whatsapp": return <Phone className="h-4 w-4 text-green-500" />
            case "email": return <Mail className="h-4 w-4 text-blue-500" />
            default: return <MessageSquare className="h-4 w-4 text-purple-500" />
        }
    }

    if (loading) return (
        <div className="flex h-[500px] items-center justify-center text-muted-foreground text-sm">
            Carregando conversas...
        </div>
    )

    return (
        <div className="flex h-[560px] border rounded-xl overflow-hidden bg-background shadow-sm">
            {/* Sidebar */}
            <div className="w-[200px] border-r bg-muted/20 flex flex-col shrink-0">
                <div className="p-3 border-b font-medium text-sm flex justify-between items-center">
                    <span>Canais</span>
                    {realtimeConnected && (
                        <span title="Realtime ativo">
                            <Wifi className="h-3 w-3 text-green-500" />
                        </span>
                    )}
                </div>
                <ScrollArea className="flex-1">
                    {conversations.length === 0 ? (
                        <div className="p-4 text-center text-xs text-muted-foreground">
                            Nenhuma conversa
                        </div>
                    ) : (
                        conversations.map(conv => (
                            <button
                                key={conv.id}
                                onClick={() => setActiveConversation(conv)}
                                className={cn(
                                    "w-full text-left px-3 py-3 hover:bg-muted transition-colors flex items-center gap-2 border-b border-border/40 text-sm",
                                    activeConversation?.id === conv.id && "bg-muted font-medium"
                                )}
                            >
                                {getChannelIcon(conv.channel)}
                                <div className="flex-1 overflow-hidden">
                                    <p className="truncate text-xs font-medium">{CHANNEL_LABELS[conv.channel] || conv.channel}</p>
                                    <p className={cn(
                                        "text-[10px] mt-0.5",
                                        conv.status === "open" ? "text-green-600" : "text-muted-foreground"
                                    )}>
                                        {conv.status === "open" ? "Aberta" : conv.status === "closed" ? "Fechada" : "Arquivada"}
                                    </p>
                                </div>
                            </button>
                        ))
                    )}
                </ScrollArea>
                <div className="p-3 border-t">
                    <Button
                        variant="outline"
                        className="w-full text-xs h-8 gap-1"
                        onClick={handleCreateSiteChat}
                    >
                        <Plus className="h-3 w-3" /> Chat do Site
                    </Button>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {activeConversation ? (
                    <>
                        {/* Header */}
                        <div className="px-4 py-3 border-b flex justify-between items-center bg-card shrink-0">
                            <div className="flex items-center gap-2">
                                <Avatar className="h-7 w-7">
                                    <AvatarFallback className="text-xs">{lead.full_name[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-medium text-sm leading-tight">{lead.full_name}</p>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        {getChannelIcon(activeConversation.channel)}
                                        <span>{CHANNEL_LABELS[activeConversation.channel]}</span>
                                    </div>
                                </div>
                            </div>
                            <Badge
                                variant={activeConversation.status === "open" ? "default" : "secondary"}
                                className="text-xs"
                            >
                                {activeConversation.status === "open" ? "Aberta" : "Fechada"}
                            </Badge>
                        </div>

                        {/* Messages */}
                        <ScrollArea className="flex-1 p-4 bg-muted/10">
                            <div className="space-y-3">
                                {messages.length === 0 && (
                                    <div className="text-center text-xs text-muted-foreground py-8">
                                        Nenhuma mensagem ainda. Inicie a conversa!
                                    </div>
                                )}
                                {messages.map((msg) => {
                                    const isOut = msg.direction === "outbound"
                                    return (
                                        <div key={msg.id} className={cn("flex", isOut ? "justify-end" : "justify-start")}>
                                            <div className={cn(
                                                "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
                                                isOut
                                                    ? "bg-primary text-primary-foreground rounded-br-sm"
                                                    : "bg-muted text-foreground rounded-bl-sm"
                                            )}>
                                                <p>{msg.content}</p>
                                                <p className={cn(
                                                    "text-[10px] mt-1 text-right",
                                                    isOut ? "text-primary-foreground/70" : "text-muted-foreground"
                                                )}>
                                                    {new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                                </p>
                                            </div>
                                        </div>
                                    )
                                })}
                                {/* Lead typing indicator */}
                                {leadTyping && (
                                    <div className="flex justify-start">
                                        <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                                            <div className="flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
                                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
                                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={scrollRef} />
                            </div>
                        </ScrollArea>

                        {/* Input */}
                        <div className="p-3 border-t bg-card shrink-0">
                            <div className="flex items-center gap-2">
                                <Input
                                    placeholder="Digite sua mensagem..."
                                    value={newMessage}
                                    onChange={e => { setNewMessage(e.target.value); handleAdminTyping() }}
                                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                                    className="flex-1 h-9 text-sm"
                                    disabled={sending}
                                />
                                <Button
                                    onClick={handleSendMessage}
                                    size="icon"
                                    className="h-9 w-9 shrink-0"
                                    disabled={!newMessage.trim() || sending}
                                >
                                    <Send className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3 p-8">
                        <MessageSquare className="h-10 w-10 opacity-20" />
                        <p className="text-sm">Selecione um canal ou crie uma conversa</p>
                        <Button variant="outline" size="sm" onClick={handleCreateSiteChat} className="gap-1">
                            <Plus className="h-4 w-4" /> Iniciar Chat do Site
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}
