"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { CRMService, DBMessage } from "@/services/crm"
import { createClient } from "@/utils/supabase/client"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, MessageSquare, Search, Send, Phone, Globe, Radio, CheckCircle2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { AffiliateNewLeadDialog } from "@/components/affiliate/new-lead-dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { toast } from "sonner"

type Lead = {
    id: string
    full_name: string
    email?: string
    phone?: string
    status: string
    created_at: string
    affiliate_id?: string
}

const STATUS_COLORS: Record<string, string> = {
    new: "bg-blue-500/10 text-blue-500",
    contacted: "bg-yellow-500/10 text-yellow-500",
    interested: "bg-purple-500/10 text-purple-500",
    converted: "bg-emerald-500/10 text-emerald-500",
    lost: "bg-red-500/10 text-red-500",
}

const STATUS_LABELS: Record<string, string> = {
    new: "Novo", contacted: "Contactado", interested: "Interessado",
    converted: "Convertido", lost: "Perdido",
}

function getInitials(name: string) {
    return name?.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase() || "?"
}

// ─── Site Chat Panel ────────────────────────────────────────────────────────────
function MessagePanel({ lead }: { lead: Lead }) {
    const [messages, setMessages] = useState<DBMessage[]>([])
    const [conversationId, setConversationId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [newMsg, setNewMsg] = useState("")
    const [sending, setSending] = useState(false)
    const bottomRef = useRef<HTMLDivElement>(null)
    const supabase = createClient()

    const initialized = useRef(false)

    const ensureConversation = useCallback(async () => {
        // Try to insert; if already exists the unique constraint skips it
        await supabase
            .from("crm_conversations")
            .insert({ lead_id: lead.id, channel: "site_chat", status: "open" })
            .select("id")
        // ON CONFLICT DO NOTHING — the unique constraint (lead_id, channel) handles it

        // Now fetch the real one (guaranteed to exist)
        const { data, error } = await supabase
            .from("crm_conversations")
            .select("id")
            .eq("lead_id", lead.id)
            .eq("channel", "site_chat")
            .single()

        if (error) throw error
        return data.id
    }, [lead.id, supabase])

    const load = useCallback(async () => {
        if (initialized.current) return  // prevent duplicate calls on re-render
        initialized.current = true
        setLoading(true)
        try {
            const convId = await ensureConversation()
            setConversationId(convId)
            const msgs = await CRMService.getMessages(convId)
            setMessages(msgs)
        } finally { setLoading(false) }
    }, [ensureConversation])


    useEffect(() => { load() }, [load])

    useEffect(() => {
        if (!conversationId) return
        const channel = supabase
            .channel(`aff_conv:${conversationId}`)
            .on("postgres_changes", {
                event: "INSERT", schema: "public", table: "crm_messages",
                filter: `conversation_id=eq.${conversationId}`,
            }, (payload) => setMessages(prev => [...prev, payload.new as DBMessage]))
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [conversationId])

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])

    const handleSend = async () => {
        const content = newMsg.trim()
        if (!content || sending || !conversationId) return
        setSending(true)
        setNewMsg("")
        try { await CRMService.sendMessage(conversationId, content) }
        catch { setNewMsg(content) }
        finally { setSending(false) }
    }

    return (
        <div className="flex flex-col h-full">
            <ScrollArea className="flex-1 px-4 py-3">
                {loading ? (
                    <div className="flex h-40 items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col h-40 items-center justify-center gap-2 text-center">
                        <Globe className="w-8 h-8 text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground">Sem mensagens. Envie a primeira!</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {messages.map(msg => (
                            <div key={msg.id} className={cn("flex", msg.direction === "outbound" ? "justify-end" : "justify-start")}>
                                <div className={cn(
                                    "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-sm",
                                    msg.direction === "outbound"
                                        ? "bg-gradient-to-br from-emerald-600 to-teal-600 text-white rounded-tr-sm"
                                        : "bg-muted text-foreground rounded-tl-sm"
                                )}>
                                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                    <p className={cn("text-[10px] mt-1 text-right", msg.direction === "outbound" ? "text-white/60" : "text-muted-foreground")}>
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
                    placeholder="Escreva uma mensagem..."
                    className="flex-1 h-9 text-sm"
                    disabled={sending || loading}
                />
                <Button size="icon" className="h-9 w-9 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 shrink-0"
                    onClick={handleSend} disabled={sending || !newMsg.trim() || loading}>
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
            </div>
        </div>
    )
}

// ─── WhatsApp Panel ────────────────────────────────────────────────────────────
function WhatsAppPanel({ lead }: { lead: Lead }) {
    const [message, setMessage] = useState("")
    const phone = lead.phone?.replace(/\D/g, "")
    const waLink = phone ? `https://wa.me/55${phone}?text=${encodeURIComponent(message)}` : null

    return (
        <div className="flex flex-col h-full p-4 gap-4">
            <div className="rounded-lg border bg-green-500/5 border-green-500/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                    <Phone className="w-4 h-4 text-green-500" />
                    <span className="font-semibold text-sm">WhatsApp</span>
                </div>
                {lead.phone ? (
                    <p className="text-sm text-muted-foreground">
                        Número: <span className="font-mono font-medium text-foreground">{lead.phone}</span>
                    </p>
                ) : (
                    <p className="text-sm text-red-400">⚠️ Este lead não tem telefone cadastrado.</p>
                )}
            </div>

            <div className="space-y-2 flex-1">
                <label className="text-sm font-medium">Mensagem</label>
                <Textarea
                    placeholder="Digite a mensagem para enviar via WhatsApp..."
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    rows={6}
                    className="resize-none"
                />
            </div>

            <div className="flex gap-3">
                {waLink ? (
                    <a href={waLink} target="_blank" rel="noopener noreferrer" className="flex-1">
                        <Button className="w-full bg-green-600 hover:bg-green-700 text-white gap-2">
                            <Phone className="w-4 h-4" />
                            Abrir WhatsApp Web
                        </Button>
                    </a>
                ) : (
                    <Button disabled className="flex-1 gap-2">
                        <Phone className="w-4 h-4" />
                        Sem telefone cadastrado
                    </Button>
                )}
            </div>

            <p className="text-xs text-muted-foreground text-center">
                Abre o WhatsApp Web com a mensagem pré-preenchida para envio manual.
            </p>
        </div>
    )
}

// ─── Right Panel (tabs Site / WhatsApp) ────────────────────────────────────────
function ChatPanel({ lead }: { lead: Lead }) {
    return (
        <div className="flex flex-col h-full">
            {/* Lead header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30 shrink-0">
                <div className="flex items-center gap-3">
                    <Avatar className="w-9 h-9">
                        <AvatarFallback className="text-sm font-semibold bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                            {getInitials(lead.full_name)}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-semibold text-sm">{lead.full_name}</p>
                        <p className="text-xs text-muted-foreground">{lead.email || lead.phone || "—"}</p>
                    </div>
                </div>
                <Badge className={STATUS_COLORS[lead.status] || ""}>
                    {STATUS_LABELS[lead.status] || lead.status}
                </Badge>
            </div>

            {/* Channel tabs */}
            <Tabs defaultValue="site" className="flex flex-col flex-1 overflow-hidden">
                <TabsList className="rounded-none border-b px-4 justify-start h-10 bg-background shrink-0">
                    <TabsTrigger value="site" className="gap-1.5 text-xs">
                        <Globe className="w-3.5 h-3.5" /> Chat do Site
                    </TabsTrigger>
                    <TabsTrigger value="whatsapp" className="gap-1.5 text-xs">
                        <Phone className="w-3.5 h-3.5" /> WhatsApp
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="site" className="flex-1 overflow-hidden mt-0 data-[state=active]:flex flex-col">
                    <MessagePanel key={`site-${lead.id}`} lead={lead} />
                </TabsContent>
                <TabsContent value="whatsapp" className="flex-1 overflow-hidden mt-0 data-[state=active]:flex flex-col">
                    <WhatsAppPanel lead={lead} />
                </TabsContent>
            </Tabs>
        </div>
    )
}

// ─── Lead List Item ────────────────────────────────────────────────────────────
function LeadItem({ lead, active, onClick }: { lead: Lead; active: boolean; onClick: () => void }) {
    return (
        <button onClick={onClick} className={cn(
            "w-full flex items-start gap-3 px-3 py-3 text-left transition-colors rounded-lg",
            active ? "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800" : "hover:bg-muted/60"
        )}>
            <Avatar className="w-9 h-9 shrink-0 mt-0.5">
                <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                    {getInitials(lead.full_name)}
                </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold truncate block">{lead.full_name}</span>
                <span className="text-xs text-muted-foreground truncate block">{lead.phone || lead.email || "Sem contato"}</span>
                <span className={cn("text-[10px] font-medium px-1.5 py-px rounded-full mt-1 inline-block", STATUS_COLORS[lead.status])}>
                    {STATUS_LABELS[lead.status] || lead.status}
                </span>
            </div>
        </button>
    )
}

// ─── Broadcast Tab ─────────────────────────────────────────────────────────────
type BroadcastResult = { leadId: string; name: string; success: boolean; error?: string }

function BroadcastTab({ leads }: { leads: Lead[] }) {
    const [selected, setSelected] = useState<Set<string>>(new Set())
    const [message, setMessage] = useState("")
    const [channel, setChannel] = useState<"site_chat" | "whatsapp">("site_chat")
    const [sending, setSending] = useState(false)
    const [results, setResults] = useState<BroadcastResult[]>([])
    const supabase = createClient()

    const toggle = (id: string) => setSelected(prev => {
        const next = new Set(prev)
        next.has(id) ? next.delete(id) : next.add(id)
        return next
    })

    const toggleAll = () => {
        if (selected.size === leads.length) setSelected(new Set())
        else setSelected(new Set(leads.map(l => l.id)))
    }

    const handleSend = async () => {
        if (!message.trim() || selected.size === 0) {
            toast.error("Selecione ao menos um lead e escreva uma mensagem.")
            return
        }
        setSending(true)
        setResults([])

        const targetLeads = leads.filter(l => selected.has(l.id))
        const res: BroadcastResult[] = []

        for (const lead of targetLeads) {
            try {
                if (channel === "site_chat") {
                    // Get or create conversation
                    let { data: conv } = await supabase
                        .from("crm_conversations")
                        .select("id")
                        .eq("lead_id", lead.id)
                        .eq("channel", "site_chat")
                        .maybeSingle()

                    if (!conv) {
                        const { data: created } = await supabase
                            .from("crm_conversations")
                            .insert({ lead_id: lead.id, channel: "site_chat", status: "open" })
                            .select("id").single()
                        conv = created
                    }

                    if (conv) {
                        await CRMService.sendMessage(conv.id, message)
                        res.push({ leadId: lead.id, name: lead.full_name, success: true })
                    }
                } else {
                    // WhatsApp: just mark as success (redirect user needs to send manually)
                    // Open WhatsApp web links in sequence would need user interaction
                    res.push({ leadId: lead.id, name: lead.full_name, success: true })
                }
            } catch (err: any) {
                res.push({ leadId: lead.id, name: lead.full_name, success: false, error: err.message })
            }
        }

        setResults(res)
        setSending(false)
        const ok = res.filter(r => r.success).length
        toast.success(`${ok}/${targetLeads.length} mensagens enviadas!`)

        // For WhatsApp, open links after
        if (channel === "whatsapp") {
            for (const lead of targetLeads) {
                const phone = lead.phone?.replace(/\D/g, "")
                if (phone) {
                    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(message)}`, "_blank")
                    await new Promise(r => setTimeout(r, 600))
                }
            }
        }
    }

    return (
        <div className="flex flex-1 overflow-hidden">
            {/* Lead selection */}
            <div className="w-72 shrink-0 border-r flex flex-col bg-background">
                <div className="px-3 py-2.5 border-b flex items-center justify-between">
                    <span className="text-sm font-medium">Selecionar Leads</span>
                    <button onClick={toggleAll} className="text-xs text-emerald-600 hover:underline font-medium">
                        {selected.size === leads.length ? "Desmarcar todos" : "Marcar todos"}
                    </button>
                </div>
                <ScrollArea className="flex-1">
                    <div className="p-2 space-y-0.5">
                        {leads.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">Nenhum lead encontrado.</p>
                        ) : leads.map(lead => (
                            <label key={lead.id} className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors",
                                selected.has(lead.id) ? "bg-emerald-50 dark:bg-emerald-900/20" : "hover:bg-muted/60"
                            )}>
                                <Checkbox checked={selected.has(lead.id)} onCheckedChange={() => toggle(lead.id)} />
                                <Avatar className="w-7 h-7 shrink-0">
                                    <AvatarFallback className="text-[10px] font-bold bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                                        {getInitials(lead.full_name)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">{lead.full_name}</p>
                                    <p className="text-[11px] text-muted-foreground truncate">{lead.phone || lead.email || "—"}</p>
                                </div>
                            </label>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* Message compose */}
            <div className="flex-1 flex flex-col p-4 gap-4">
                {/* Channel picker */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setChannel("site_chat")}
                        className={cn("flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors flex-1 justify-center",
                            channel === "site_chat"
                                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700"
                                : "hover:bg-muted/60"
                        )}>
                        <Globe className="w-4 h-4" /> Chat do Site
                    </button>
                    <button
                        onClick={() => setChannel("whatsapp")}
                        className={cn("flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors flex-1 justify-center",
                            channel === "whatsapp"
                                ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700"
                                : "hover:bg-muted/60"
                        )}>
                        <Phone className="w-4 h-4" /> WhatsApp
                    </button>
                </div>

                {channel === "whatsapp" && (
                    <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-3 py-2 text-xs text-yellow-600 dark:text-yellow-400">
                        ⚠️ WhatsApp: vai abrir uma aba para cada lead selecionado com a mensagem pré-preenchida.
                    </div>
                )}

                <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium">Mensagem</label>
                    <Textarea
                        placeholder={`Escreva a mensagem para enviar via ${channel === "site_chat" ? "Chat do Site" : "WhatsApp"}...`}
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        className="resize-none h-40"
                    />
                </div>

                <Button
                    onClick={handleSend}
                    disabled={sending || selected.size === 0 || !message.trim()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4" />}
                    Enviar para {selected.size} lead{selected.size !== 1 ? "s" : ""}
                </Button>

                {/* Results */}
                {results.length > 0 && (
                    <ScrollArea className="max-h-40 border rounded-lg p-2">
                        <div className="space-y-1">
                            {results.map(r => (
                                <div key={r.leadId} className={cn("flex items-center gap-2 text-xs px-2 py-1 rounded",
                                    r.success ? "text-emerald-600" : "text-red-500")}>
                                    {r.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                                    {r.name} — {r.success ? "Enviado" : r.error}
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </div>
        </div>
    )
}

// ─── Main Page ──────────────────────────────────────────────────────────────────
export default function AffiliateConversationsPage() {
    const [leads, setLeads] = useState<Lead[]>([])
    const [filtered, setFiltered] = useState<Lead[]>([])
    const [selected, setSelected] = useState<Lead | null>(null)
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [affiliateId, setAffiliateId] = useState<string>("")
    const supabase = createClient()

    const fetchLeads = useCallback(async (affId: string) => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from("crm_leads")
                .select("id, full_name, email, phone, status, created_at, affiliate_id")
                .eq("affiliate_id", affId)
                .order("created_at", { ascending: false })
            if (error) throw error
            setLeads(data || [])
        } finally { setLoading(false) }
    }, [supabase])

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            setAffiliateId(user.id)
            fetchLeads(user.id)
        }
        init()
    }, [])

    useEffect(() => {
        const q = search.toLowerCase()
        const result = search
            ? leads.filter(l => l.full_name?.toLowerCase().includes(q) || (l.email ?? "").toLowerCase().includes(q) || (l.phone ?? "").includes(q))
            : leads
        setFiltered(result)
        if (result.length > 0 && (!selected || !result.find(l => l.id === selected.id))) setSelected(result[0])
    }, [leads, search])

    return (
        <div className="flex flex-col h-[calc(100vh-130px)] min-h-[500px] gap-4">
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Conversas</h1>
                    <p className="text-muted-foreground text-sm mt-1">Converse e transmita mensagens para seus leads.</p>
                </div>
                {affiliateId && (
                    <AffiliateNewLeadDialog affiliateId={affiliateId} onLeadCreated={() => fetchLeads(affiliateId)} />
                )}
            </div>

            <Tabs defaultValue="conversas" className="flex flex-col flex-1 overflow-hidden">
                <TabsList className="justify-start shrink-0">
                    <TabsTrigger value="conversas" className="gap-1.5">
                        <MessageSquare className="w-4 h-4" /> Conversas
                    </TabsTrigger>
                    <TabsTrigger value="transmissao" className="gap-1.5">
                        <Radio className="w-4 h-4" /> Transmissão
                    </TabsTrigger>
                </TabsList>

                {/* CONVERSAS */}
                <TabsContent value="conversas" className="flex-1 overflow-hidden mt-0 data-[state=active]:flex border rounded-b-lg rounded-tr-lg">
                    {/* Left: lead list */}
                    <div className="w-72 shrink-0 border-r flex flex-col bg-background">
                        <div className="px-3 py-2.5 border-b">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                <Input placeholder="Buscar lead..." value={search}
                                    onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
                            </div>
                        </div>
                        <ScrollArea className="flex-1">
                            {loading ? (
                                <div className="flex h-40 items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                            ) : filtered.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-40 gap-2 px-4 text-center">
                                    <MessageSquare className="w-8 h-8 text-muted-foreground/40" />
                                    <p className="text-sm text-muted-foreground">{search ? "Nenhum resultado." : "Nenhum lead ainda."}</p>
                                </div>
                            ) : (
                                <div className="p-2 space-y-0.5">
                                    {filtered.map(lead => (
                                        <LeadItem key={lead.id} lead={lead}
                                            active={selected?.id === lead.id} onClick={() => setSelected(lead)} />
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </div>

                    {/* Right: chat panel with site/whatsapp tabs */}
                    <div className="flex-1 flex flex-col bg-background overflow-hidden">
                        {selected ? (
                            <ChatPanel key={selected.id} lead={selected} />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
                                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                                    <MessageSquare className="w-7 h-7 text-muted-foreground" />
                                </div>
                                <div>
                                    <p className="font-semibold">Selecione um lead</p>
                                    <p className="text-sm text-muted-foreground mt-1">Escolha um lead à esquerda para iniciar a conversa.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* TRANSMISSÃO */}
                <TabsContent value="transmissao" className="flex-1 overflow-hidden mt-0 data-[state=active]:flex border rounded-b-lg rounded-tr-lg">
                    {loading ? (
                        <div className="flex h-40 items-center justify-center w-full"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                    ) : (
                        <BroadcastTab leads={leads} />
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}
