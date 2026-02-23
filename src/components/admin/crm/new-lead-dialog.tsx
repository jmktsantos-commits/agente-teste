"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"

const N8N_WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || "https://n8n.srv1355894.hstgr.cloud/webhook"

interface NewLeadDialogProps {
    onLeadCreated?: () => void
}

export function NewLeadDialog({ onLeadCreated }: NewLeadDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState({
        full_name: "",
        email: "",
        phone: "",
        source: "manual",
        notes: "",
        tags: "",
    })

    const handleChange = (field: string, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.full_name.trim()) {
            toast.error("Nome completo é obrigatório.")
            return
        }

        setLoading(true)
        try {
            const payload = {
                ...form,
                tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
                status: "new",
            }

            const res = await fetch(`/api/crm/lead`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })

            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.error || `Erro ${res.status}`)
            }

            toast.success("Lead criado com sucesso!")
            setOpen(false)
            setForm({ full_name: "", email: "", phone: "", source: "manual", notes: "", tags: "" })
            onLeadCreated?.()
        } catch (err: any) {
            console.error("Erro ao criar lead:", err)
            toast.error(err.message || "Falha ao criar lead. Tente novamente.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Novo Lead
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Adicionar Novo Lead</DialogTitle>
                        <DialogDescription>
                            Preencha os dados do lead. Será enviado via n8n para o CRM.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="space-y-1">
                            <Label htmlFor="full_name">Nome Completo *</Label>
                            <Input
                                id="full_name"
                                placeholder="Ex: João Silva"
                                value={form.full_name}
                                onChange={e => handleChange("full_name", e.target.value)}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="joao@email.com"
                                    value={form.email}
                                    onChange={e => handleChange("email", e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="phone">Telefone / WhatsApp</Label>
                                <Input
                                    id="phone"
                                    placeholder="(11) 99999-9999"
                                    value={form.phone}
                                    onChange={e => handleChange("phone", e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="source">Origem</Label>
                            <Select value={form.source} onValueChange={v => handleChange("source", v)}>
                                <SelectTrigger id="source">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="manual">Manual</SelectItem>
                                    <SelectItem value="organic">Orgânico</SelectItem>
                                    <SelectItem value="ads">Anúncios</SelectItem>
                                    <SelectItem value="referral">Indicação</SelectItem>
                                    <SelectItem value="import">Importação</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="tags">Tags <span className="text-muted-foreground text-xs">(separadas por vírgula)</span></Label>
                            <Input
                                id="tags"
                                placeholder="Ex: vip, whatsapp, interessado"
                                value={form.tags}
                                onChange={e => handleChange("tags", e.target.value)}
                            />
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="notes">Observações</Label>
                            <Textarea
                                id="notes"
                                placeholder="Informações adicionais sobre o lead..."
                                value={form.notes}
                                onChange={e => handleChange("notes", e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Criando...
                                </>
                            ) : (
                                "Criar Lead"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
