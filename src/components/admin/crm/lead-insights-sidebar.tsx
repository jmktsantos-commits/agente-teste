"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { DBLead } from "@/services/crm"
import { cn } from "@/lib/utils"
import { Check, Pencil, X, Plus, Tag } from "lucide-react"
import { toast } from "sonner"

interface LeadInsightsSidebarProps {
    lead: DBLead
}

const STATUS_OPTIONS = ["new", "contacted", "interested", "converted", "lost"] as const
type LeadStatus = typeof STATUS_OPTIONS[number]

const STATUS_STYLES: Record<LeadStatus, string> = {
    new: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800",
    contacted: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300",
    interested: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300",
    converted: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300",
    lost: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300",
}

const STATUS_LABELS: Record<LeadStatus, string> = {
    new: "Novo",
    contacted: "Contactado",
    interested: "Interessado",
    converted: "Convertido",
    lost: "Perdido",
}

async function updateLead(id: string, updates: Record<string, any>) {
    const res = await fetch(`/api/crm/lead/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Erro ${res.status}`)
    }
    return res.json()
}

export function LeadInsightsSidebar({ lead }: LeadInsightsSidebarProps) {
    const [status, setStatus] = useState<LeadStatus>(lead.status as LeadStatus)
    const [tags, setTags] = useState<string[]>(lead.tags || [])
    const [notes, setNotes] = useState<string>(lead.notes || "")
    const [newTag, setNewTag] = useState("")

    const [editingStatus, setEditingStatus] = useState(false)
    const [editingTags, setEditingTags] = useState(false)
    const [editingNotes, setEditingNotes] = useState(false)
    const [saving, setSaving] = useState<string | null>(null)

    const save = async (field: string, value: any) => {
        setSaving(field)
        try {
            await updateLead(lead.id, { [field]: value })
            toast.success("Salvo com sucesso!")
        } catch (err: any) {
            toast.error(err.message || "Erro ao salvar")
        } finally {
            setSaving(null)
        }
    }

    const handleStatusSave = async (newStatus: LeadStatus) => {
        setStatus(newStatus)
        setEditingStatus(false)
        await save("status", newStatus)
    }

    const handleAddTag = () => {
        const trimmed = newTag.trim()
        if (!trimmed || tags.includes(trimmed)) return
        const updated = [...tags, trimmed]
        setTags(updated)
        setNewTag("")
    }

    const handleRemoveTag = (tag: string) => {
        setTags(prev => prev.filter(t => t !== tag))
    }

    const handleTagsSave = async () => {
        setEditingTags(false)
        await save("tags", tags)
    }

    const handleNotesSave = async () => {
        setEditingNotes(false)
        await save("notes", notes)
    }

    return (
        <div className="space-y-4">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 gap-3">
                <Card className="bg-muted/50 border-none shadow-none">
                    <CardContent className="p-4">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Plano Contratado</p>
                        <div className="text-2xl font-bold">$84.2k</div>
                    </CardContent>
                </Card>
            </div>

            {/* Agent */}
            <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Agente Responsável</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">MT</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="text-sm font-medium">Mark Thompson</p>
                            <p className="text-xs text-muted-foreground">Senior Account Exec</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Editable Fields Card */}
            <Card>
                <CardContent className="p-4 space-y-4">

                    {/* STATUS */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-muted-foreground">Status</span>
                            {!editingStatus ? (
                                <button
                                    onClick={() => setEditingStatus(true)}
                                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <Pencil className="h-3 w-3" /> Editar
                                </button>
                            ) : (
                                <button
                                    onClick={() => setEditingStatus(false)}
                                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-3 w-3" /> Cancelar
                                </button>
                            )}
                        </div>
                        {!editingStatus ? (
                            <Badge
                                variant="outline"
                                className={cn("cursor-pointer", STATUS_STYLES[status])}
                                onClick={() => setEditingStatus(true)}
                            >
                                {STATUS_LABELS[status]}
                            </Badge>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {STATUS_OPTIONS.map(s => (
                                    <Badge
                                        key={s}
                                        variant="outline"
                                        className={cn(
                                            "cursor-pointer transition-all",
                                            STATUS_STYLES[s],
                                            s === status && "ring-2 ring-offset-1 ring-current"
                                        )}
                                        onClick={() => handleStatusSave(s)}
                                    >
                                        {saving === "status" && s === status ? "..." : STATUS_LABELS[s]}
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>

                    <Separator />

                    {/* TAGS */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-muted-foreground">Tags</span>
                            {!editingTags ? (
                                <button
                                    onClick={() => setEditingTags(true)}
                                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <Pencil className="h-3 w-3" /> Editar
                                </button>
                            ) : (
                                <button
                                    onClick={handleTagsSave}
                                    className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium"
                                >
                                    <Check className="h-3 w-3" /> {saving === "tags" ? "Salvando..." : "Salvar"}
                                </button>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {tags.length > 0 ? (
                                tags.map(tag => (
                                    <Badge key={tag} variant="secondary" className="text-xs font-normal gap-1">
                                        <Tag className="h-2.5 w-2.5" />
                                        {tag}
                                        {editingTags && (
                                            <button
                                                onClick={() => handleRemoveTag(tag)}
                                                className="ml-1 hover:text-destructive"
                                            >
                                                <X className="h-2.5 w-2.5" />
                                            </button>
                                        )}
                                    </Badge>
                                ))
                            ) : (
                                <span className="text-xs text-muted-foreground italic">Sem tags</span>
                            )}
                        </div>
                        {editingTags && (
                            <div className="flex gap-2 mt-2">
                                <Input
                                    value={newTag}
                                    onChange={e => setNewTag(e.target.value)}
                                    placeholder="Nova tag..."
                                    className="h-7 text-xs"
                                    onKeyDown={e => e.key === "Enter" && handleAddTag()}
                                />
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2"
                                    onClick={handleAddTag}
                                >
                                    <Plus className="h-3 w-3" />
                                </Button>
                            </div>
                        )}
                    </div>

                    <Separator />

                    {/* NOTES */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-muted-foreground">Observações</span>
                            {!editingNotes ? (
                                <button
                                    onClick={() => setEditingNotes(true)}
                                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <Pencil className="h-3 w-3" /> Editar
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => { setEditingNotes(false); setNotes(lead.notes || "") }}
                                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="h-3 w-3" /> Cancelar
                                    </button>
                                    <button
                                        onClick={handleNotesSave}
                                        className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium"
                                    >
                                        <Check className="h-3 w-3" /> {saving === "notes" ? "Salvando..." : "Salvar"}
                                    </button>
                                </div>
                            )}
                        </div>
                        {!editingNotes ? (
                            <p
                                className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors min-h-[2rem]"
                                onClick={() => setEditingNotes(true)}
                            >
                                {notes || <span className="italic">Clique para adicionar observações...</span>}
                            </p>
                        ) : (
                            <Textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="Observações sobre o lead..."
                                rows={4}
                                className="text-sm resize-none"
                                autoFocus
                            />
                        )}
                    </div>

                </CardContent>
            </Card>
        </div>
    )
}
