"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react"

export default function ResetPasswordPage() {
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [done, setDone] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    // Supabase sends the user here after clicking the email link.
    // The session is automatically set by the hash fragment in the URL.
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === "PASSWORD_RECOVERY") {
                // Session is ready, user can now update password
            }
        })
        return () => subscription.unsubscribe()
    }, [])

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (newPassword.length < 6) {
            setError("A senha deve ter pelo menos 6 caracteres.")
            return
        }
        if (newPassword !== confirmPassword) {
            setError("As senhas não coincidem.")
            return
        }

        setLoading(true)
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword })
            if (error) throw error
            setDone(true)
            setTimeout(() => router.push("/dashboard"), 3000)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-background">
            <Card className="w-full max-w-md">
                {done ? (
                    <>
                        <CardHeader className="space-y-1 text-center">
                            <div className="flex justify-center mb-2">
                                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                                </div>
                            </div>
                            <CardTitle className="text-2xl font-bold">Senha redefinida!</CardTitle>
                            <CardDescription>
                                Sua senha foi alterada com sucesso. Redirecionando para o dashboard...
                            </CardDescription>
                        </CardHeader>
                    </>
                ) : (
                    <>
                        <CardHeader className="space-y-1">
                            <CardTitle className="text-2xl font-bold">Criar nova senha</CardTitle>
                            <CardDescription>
                                Digite e confirme sua nova senha abaixo.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleReset} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="new-password">Nova senha</Label>
                                    <Input
                                        id="new-password"
                                        type="password"
                                        placeholder="Mínimo 6 caracteres"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                        autoFocus
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirm-password">Confirmar senha</Label>
                                    <Input
                                        id="confirm-password"
                                        type="password"
                                        placeholder="Repita a nova senha"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                </div>
                                {error && (
                                    <div className="flex items-start gap-2 text-sm text-red-500 rounded-md bg-red-50 dark:bg-red-950/30 px-3 py-2">
                                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                        {error}
                                    </div>
                                )}
                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Redefinir senha
                                </Button>
                            </form>
                        </CardContent>
                    </>
                )}
            </Card>
        </div>
    )
}
