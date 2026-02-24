"use client"

import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import { CRMService, ConversationType, DBConversation, DBLead, DBMessage } from "@/services/crm"
import { createClient } from "@/utils/supabase/client"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Loader2, MessageSquare, Search, Send, Globe, Phone, Mail, ExternalLink, Users, GitMerge, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

type ConvWithLead = DBConversation & {
    crm_leads: Pick<DBLead, "id" | "full_name" | "email" | "phone" | "status"> & {
        affiliate_id?: string | null
        affiliates?: { btag: string } | null
    }
}

const CHANNEL_TABS: { key: ConversationType | "all"; label: string; icon: React.ReactNode }[] = [
    { key: "all", label: "Todas", icon: <MessageSquare className="w-4 h-4" /> },
    { key: "site_chat", label: "Site", icon: <Globe className="w-4 h-4" /> },
    { key: "whatsapp", label: "WhatsApp", icon: <Phone className="w-4 h-4" /> },
    { key: "email", label: "Email", icon: <Mail className="w-4 h-4" /> },
]

const CHANNEL_COLOR: Record<string, string> = {
    site_chat: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    whatsapp: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    email: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
}

const CHANNEL_LABEL: Record<string, string> = {
    site_chat: "Site", whatsapp: "WhatsApp", email: "Email",
}

function getInitials(name: string) {
    return name.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase()
}

function formatTime(dateStr?: string) {
    if (!dateStr) return ""
    const d = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
    if (diffDays === 0) return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    if (diffDays === 1) return "Ontem"
    if (diffDays < 7) return d.toLocaleDateString("pt-BR", { weekday: "short" })
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

// ─── Message Panel ────────────────────────────────────────────────────────────
function MessagePanel({ conversation, onBack }: { conversation: ConvWithLead; onBack: () => void }) {
    const [messages, setMessages] = useState<DBMessage[]>([])
    const [loading, setLoading] = useState(true)
    const [newMsg, setNewMsg] = useState("")
    const [sending, setSending] = useState(false)
    const bottomRef = useRef<HTMLDivElement>(null)
    const supabase = createClient()

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const msgs = await CRMService.getMessages(conversation.id)
            setMessages(msgs)
        } catch (err) { console.error("Failed to load messages", err) }
        finally { setLoading(false) }
    }, [conversation.id])

    useEffect(() => { load() }, [load])

    useEffect(() => {
        const channel = supabase
            .channel(`admin_convpage:${conversation.id}`)
            .on("postgres_changes", {
                event: "INSERT", schema: "public", table: "crm_messages",
                filter: `conversation_id=eq.${conversation.id}`,
            }, (payload) => { setMessages(prev => [...prev, payload.new as DBMessage]) })
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [conversation.id])

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])

    const handleSend = async () => {
        const content = newMsg.trim()
        if (!content || sending) return
        setSending(true)
        setNewMsg("")
        try {
            // Use server-side API route with service key so broadcast reaches the lead
            const res = await fetch("/api/crm/message", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ conversation_id: conversation.id, content }),
            })
            if (!res.ok) {
                const err = await res.json()
                console.error("Failed to send message:", err)
                setNewMsg(content)
            }
        } catch {
            setNewMsg(content)
        } finally {
            setSending(false)
        }
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-3 border-b bg-muted/30 shrink-0">
                {/* Back button on mobile */}
                <button
                    onClick={onBack}
                    className="md:hidden p-1.5 rounded-lg hover:bg-muted transition-colors shrink-0"
                    aria-label="Voltar"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <Avatar className="w-9 h-9 shrink-0">
                    <AvatarFallback className="text-sm font-semibold bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                        {getInitials(conversation.crm_leads.full_name)}
                    </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm leading-tight truncate">{conversation.crm_leads.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                        {conversation.crm_leads.email || conversation.crm_leads.phone || "—"}
                    </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    {conversation.crm_leads.affiliates?.btag && (
                        <span className="hidden sm:flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500 border border-orange-500/20">
                            <GitMerge className="w-3 h-3" />
                            {conversation.crm_leads.affiliates.btag}
                        </span>
                    )}
                    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full hidden sm:inline-block", CHANNEL_COLOR[conversation.channel])}>
                        {CHANNEL_LABEL[conversation.channel]}
                    </span>
                    <Link href={`/crm/${conversation.crm_leads.id}`}>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Ver perfil do lead">
                            <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                    </Link>
                </div>
            </div>

            <ScrollArea className="flex-1 px-3 py-3">
                {loading ? (
                    <div className="flex h-40 items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                ) : messages.length === 0 ? (
                    <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Nenhuma mensagem ainda.</div>
                ) : (
                    <div className="space-y-3">
                        {messages.map(msg => (
                            <div key={msg.id} className={cn("flex", msg.direction === "outbound" ? "justify-end" : "justify-start")}>
                                <div className={cn(
                                    "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm",
                                    msg.direction === "outbound"
                                        ? "bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-tr-sm"
                                        : "bg-muted text-foreground rounded-tl-sm"
                                )}>
                                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                    <p className={cn("text-[10px] mt-1 text-right",
                                        msg.direction === "outbound" ? "text-white/60" : "text-muted-foreground"
                                    )}>
                                        {new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                    </p>
                                </div>
                            </div>
                        ))}
                        <div ref={bottomRef} />
                    </div>
                )}
            </ScrollArea>

            <div className="flex gap-2 px-3 py-3 border-t shrink-0">
                <Input
                    value={newMsg}
                    onChange={e => setNewMsg(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                    placeholder="Enviar mensagem..."
                    className="flex-1 h-10 text-sm"
                    disabled={sending}
                />
                <Button
                    size="icon"
                    className="h-10 w-10 bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 shrink-0"
                    onClick={handleSend}
                    disabled={sending || !newMsg.trim()}
                >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
            </div>
        </div>
    )
}

// ─── Conversation List Item ───────────────────────────────────────────────────
function ConvItem({ conv, active, onClick }: { conv: ConvWithLead; active: boolean; onClick: () => void }) {
    const isAffiliate = !!conv.crm_leads.affiliate_id
    return (
        <button
            onClick={onClick}
            className={cn(
                "w-full flex items-start gap-3 px-3 py-3 text-left transition-colors rounded-lg",
                active
                    ? "bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800"
                    : "hover:bg-muted/60"
            )}
        >
            <Avatar className="w-9 h-9 shrink-0 mt-0.5">
                <AvatarFallback className={cn(
                    "text-xs font-bold text-white",
                    isAffiliate
                        ? "bg-gradient-to-br from-orange-500 to-amber-500"
                        : "bg-gradient-to-br from-purple-500 to-pink-500"
                )}>
                    {getInitials(conv.crm_leads.full_name)}
                </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-semibold truncate">{conv.crm_leads.full_name}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">{formatTime(conv.last_message_at)}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className={cn("text-[10px] font-medium px-1.5 py-px rounded-full", CHANNEL_COLOR[conv.channel])}>
                        {CHANNEL_LABEL[conv.channel]}
                    </span>
                    {isAffiliate && conv.crm_leads.affiliates?.btag && (
                        <span className="text-[10px] font-medium px-1.5 py-px rounded-full bg-orange-500/10 text-orange-500 flex items-center gap-0.5">
                            <GitMerge className="w-2.5 h-2.5" />
                            {conv.crm_leads.affiliates.btag}
                        </span>
                    )}
                    {!isAffiliate && (
                        <span className="text-[10px] font-medium px-1.5 py-px rounded-full bg-blue-500/10 text-blue-500 flex items-center gap-0.5">
                            <Users className="w-2.5 h-2.5" />
                            Direto
                        </span>
                    )}
                </div>
            </div>
        </button>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CRMConversationsPage() {
    const [channel, setChannel] = useState<ConversationType | "all">("all")
    const [originFilter, setOriginFilter] = useState<string>("all")
    const [conversations, setConversations] = useState<ConvWithLead[]>([])
    const [selected, setSelected] = useState<ConvWithLead | null>(null)
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    // Mobile: show chat panel instead of list
    const [showChat, setShowChat] = useState(false)

    const fetchAll = useCallback(async () => {
        setLoading(true)
        try {
            const data = await CRMService.getAllConversations() as ConvWithLead[]
            setConversations(data)
        } catch (err) { console.error("Failed to load conversations", err) }
        finally { setLoading(false) }
    }, [])

    useEffect(() => { fetchAll() }, [fetchAll])

    const affiliateBtags = useMemo(() => {
        const btags = new Set<string>()
        conversations.forEach(c => {
            if (c.crm_leads.affiliates?.btag) btags.add(c.crm_leads.affiliates.btag)
        })
        return Array.from(btags).sort()
    }, [conversations])

    const filtered = useMemo(() => {
        let result = conversations
        if (channel !== "all") result = result.filter(c => c.channel === channel)
        if (originFilter === "direct") result = result.filter(c => !c.crm_leads.affiliate_id)
        else if (originFilter === "affiliate") result = result.filter(c => !!c.crm_leads.affiliate_id)
        else if (originFilter !== "all") result = result.filter(c => c.crm_leads.affiliates?.btag === originFilter)
        if (search.trim()) {
            const q = search.toLowerCase()
            result = result.filter(c =>
                c.crm_leads.full_name.toLowerCase().includes(q) ||
                (c.crm_leads.email ?? "").toLowerCase().includes(q) ||
                (c.crm_leads.phone ?? "").toLowerCase().includes(q)
            )
        }
        return result
    }, [conversations, channel, originFilter, search])

    useEffect(() => {
        if (filtered.length > 0 && (!selected || !filtered.find(c => c.id === selected.id))) {
            setSelected(filtered[0])
        }
    }, [filtered])

    const counts: Record<string, number> = useMemo(() => ({
        all: conversations.length,
        site_chat: conversations.filter(c => c.channel === "site_chat").length,
        whatsapp: conversations.filter(c => c.channel === "whatsapp").length,
        email: conversations.filter(c => c.channel === "email").length,
    }), [conversations])

    const directCount = conversations.filter(c => !c.crm_leads.affiliate_id).length
    const affiliateCount = conversations.filter(c => !!c.crm_leads.affiliate_id).length

    const handleSelectConv = (conv: ConvWithLead) => {
        setSelected(conv)
        setShowChat(true) // On mobile, navigate to chat view
    }

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] min-h-[500px]">
            {/* Channel tabs — scrollable horizontally on mobile */}
            <Tabs value={channel} onValueChange={v => setChannel(v as ConversationType | "all")} className="mb-0">
                <TabsList className="mb-0 rounded-b-none border-b-0 w-full overflow-x-auto flex-nowrap justify-start h-auto p-1 gap-0.5">
                    {CHANNEL_TABS.map(tab => (
                        <TabsTrigger key={tab.key} value={tab.key}
                            className="gap-1 text-xs sm:text-sm py-2 px-2.5 sm:px-3 whitespace-nowrap shrink-0">
                            {tab.icon}
                            <span className="hidden xs:inline sm:inline">{tab.label}</span>
                            {counts[tab.key] > 0 && (
                                <span className="ml-0.5 bg-muted text-muted-foreground text-[10px] font-bold rounded-full px-1.5 py-0.5">
                                    {counts[tab.key]}
                                </span>
                            )}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            {/* Main panel */}
            <div className="flex flex-1 border rounded-b-lg rounded-tr-lg overflow-hidden relative">

                {/* Left: conversation list — hidden on mobile when chat is open */}
                <div className={cn(
                    "flex flex-col bg-background border-r transition-all duration-200",
                    // Desktop: always visible at fixed width
                    "md:w-72 md:shrink-0 md:flex",
                    // Mobile: full width when showing list, hidden when showing chat
                    showChat
                        ? "hidden md:flex"
                        : "flex w-full md:w-72"
                )}>
                    {/* Search + filter */}
                    <div className="px-3 py-2 border-b space-y-2">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <Input placeholder="Buscar lead..." value={search}
                                onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
                        </div>

                        <Select value={originFilter} onValueChange={setOriginFilter}>
                            <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    <span className="flex items-center gap-2">
                                        <MessageSquare className="w-3.5 h-3.5" />
                                        Todas as origens ({conversations.length})
                                    </span>
                                </SelectItem>
                                <SelectItem value="direct">
                                    <span className="flex items-center gap-2">
                                        <Users className="w-3.5 h-3.5 text-blue-500" />
                                        Direto ({directCount})
                                    </span>
                                </SelectItem>
                                <SelectItem value="affiliate">
                                    <span className="flex items-center gap-2">
                                        <GitMerge className="w-3.5 h-3.5 text-orange-500" />
                                        Via Afiliado ({affiliateCount})
                                    </span>
                                </SelectItem>
                                {affiliateBtags.map(btag => (
                                    <SelectItem key={btag} value={btag}>
                                        <span className="flex items-center gap-2">
                                            <GitMerge className="w-3.5 h-3.5 text-orange-400" />
                                            Afiliado: {btag}
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <ScrollArea className="flex-1">
                        {loading ? (
                            <div className="flex h-40 items-center justify-center">
                                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 gap-2 px-4 text-center">
                                <MessageSquare className="w-8 h-8 text-muted-foreground/50" />
                                <p className="text-sm text-muted-foreground">
                                    {search ? "Nenhum resultado." : "Nenhuma conversa para este filtro."}
                                </p>
                            </div>
                        ) : (
                            <div className="p-2 space-y-0.5">
                                {filtered.map(conv => (
                                    <ConvItem
                                        key={conv.id}
                                        conv={conv}
                                        active={selected?.id === conv.id}
                                        onClick={() => handleSelectConv(conv)}
                                    />
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </div>

                {/* Right: message panel — full screen on mobile when active */}
                <div className={cn(
                    "flex-1 flex flex-col bg-background",
                    // Mobile: full width, shown only when chat is open
                    showChat ? "flex w-full" : "hidden md:flex"
                )}>
                    {selected ? (
                        <MessagePanel
                            key={selected.id}
                            conversation={selected}
                            onBack={() => setShowChat(false)}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                                <MessageSquare className="w-7 h-7 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="font-semibold">Selecione uma conversa</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Escolha uma conversa ao lado para ver o histórico completo.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
