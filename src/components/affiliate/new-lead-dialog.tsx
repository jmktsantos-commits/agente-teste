"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/utils/supabase/client"

interface AffiliateNewLeadDialogProps {
    affiliateId: string
    onLeadCreated?: () => void
}

export function AffiliateNewLeadDialog({ affiliateId, onLeadCreated }: AffiliateNewLeadDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState({
        full_name: "",
        email: "",
        phone: "",
        source: "manual",
        notes: "",
    })

    const supabase = createClient()

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
            // Insert directly into crm_leads with affiliate_id set
            const { error } = await supabase.from("crm_leads").insert({
                full_name: form.full_name.trim(),
                email: form.email || null,
                phone: form.phone || null,
                source: form.source,
                notes: form.notes || null,
                status: "new",
                affiliate_id: affiliateId,
            })

            if (error) throw error

            toast.success("Lead adicionado com sucesso!")
            setOpen(false)
            setForm({ full_name: "", email: "", phone: "", source: "manual", notes: "" })
            onLeadCreated?.()
        } catch (err: any) {
            if (err.message?.includes('duplicate key value') || err.message?.includes('crm_leads_email_unique_idx')) {
                toast.error("Este e-mail já está cadastrado no sistema por outro usuário/afiliado.")
            } else {
                toast.error(err.message || "Falha ao criar lead.")
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Plus className="h-4 w-4" />
                    Adicionar Lead
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Adicionar Lead Manualmente</DialogTitle>
                        <DialogDescription>
                            Este lead será vinculado automaticamente ao seu perfil de afiliado.
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
                                <Label htmlFor="phone">WhatsApp / Telefone</Label>
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
                                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                                </SelectContent>
                            </Select>
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
                        <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando...</> : "Criar Lead"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
