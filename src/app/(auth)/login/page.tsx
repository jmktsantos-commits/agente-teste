"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, ArrowLeft, CheckCircle2 } from "lucide-react"

type View = "login" | "forgot" | "forgot_sent"

export default function LoginPage() {
    const [view, setView] = useState<View>("login")

    // Login fields
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")

    // Forgot password field
    const [resetEmail, setResetEmail] = useState("")

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const supabase = createClient()

    // ── Login ──────────────────────────────────────────────────────────────────
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password })
            if (error) throw error

            if (authData.user) {
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("role")
                    .eq("id", authData.user.id)
                    .single()

                if (profile?.role === "affiliate") router.push("/affiliate")
                else if (profile?.role === "admin") router.push("/admin")
                else router.push("/historico")
            } else {
                router.push("/dashboard")
            }

            router.refresh()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleGoogleLogin = async () => {
        await supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: `${window.location.origin}/auth/callback` },
        })
    }

    // ── Forgot Password ────────────────────────────────────────────────────────
    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
                redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
            })
            if (error) throw error
            setView("forgot_sent")
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-background">
            <Card className="w-full max-w-md">

                {/* ── LOGIN VIEW ─────────────────────────────────────────────── */}
                {view === "login" && (
                    <>
                        <CardHeader className="space-y-1">
                            <CardTitle className="text-2xl font-bold">Login</CardTitle>
                            <CardDescription>
                                Entre na sua conta para acessar os sinais
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleLogin} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="seu@email.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="password">Senha</Label>
                                        <button
                                            type="button"
                                            onClick={() => { setResetEmail(email); setError(null); setView("forgot") }}
                                            className="text-xs text-primary hover:underline"
                                        >
                                            Esqueceu a senha?
                                        </button>
                                    </div>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                                {error && <div className="text-sm text-red-500 rounded-md bg-red-50 dark:bg-red-950/30 px-3 py-2">{error}</div>}
                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Entrar
                                </Button>
                            </form>
                            <div className="relative my-4">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-background px-2 text-muted-foreground">Ou continue com</span>
                                </div>
                            </div>
                            <Button variant="outline" type="button" className="w-full" onClick={handleGoogleLogin}>
                                Google
                            </Button>
                        </CardContent>
                    </>
                )}

                {/* ── FORGOT PASSWORD VIEW ───────────────────────────────────── */}
                {view === "forgot" && (
                    <>
                        <CardHeader className="space-y-1">
                            <button
                                type="button"
                                onClick={() => { setError(null); setView("login") }}
                                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-1 w-fit"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                Voltar ao login
                            </button>
                            <CardTitle className="text-2xl font-bold">Recuperar senha</CardTitle>
                            <CardDescription>
                                Digite seu email e enviaremos um link para redefinir sua senha.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleForgotPassword} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="reset-email">Email</Label>
                                    <Input
                                        id="reset-email"
                                        type="email"
                                        placeholder="seu@email.com"
                                        value={resetEmail}
                                        onChange={(e) => setResetEmail(e.target.value)}
                                        required
                                        autoFocus
                                    />
                                </div>
                                {error && <div className="text-sm text-red-500 rounded-md bg-red-50 dark:bg-red-950/30 px-3 py-2">{error}</div>}
                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Enviar link de recuperação
                                </Button>
                            </form>
                        </CardContent>
                    </>
                )}

                {/* ── EMAIL SENT CONFIRMATION ────────────────────────────────── */}
                {view === "forgot_sent" && (
                    <>
                        <CardHeader className="space-y-1 text-center">
                            <div className="flex justify-center mb-2">
                                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                                </div>
                            </div>
                            <CardTitle className="text-2xl font-bold">Email enviado!</CardTitle>
                            <CardDescription>
                                Enviamos um link de recuperação para{" "}
                                <span className="font-medium text-foreground">{resetEmail}</span>.
                                Verifique sua caixa de entrada (e a pasta de spam).
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3">
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => { setError(null); setView("login") }}
                            >
                                <ArrowLeft className="mr-2 w-4 h-4" />
                                Voltar ao login
                            </Button>
                            <p className="text-xs text-center text-muted-foreground">
                                Não recebeu? Verifique o spam ou{" "}
                                <button
                                    type="button"
                                    onClick={() => setView("forgot")}
                                    className="text-primary hover:underline"
                                >
                                    tente novamente
                                </button>
                            </p>
                        </CardContent>
                    </>
                )}

            </Card>
        </div>
    )
}
