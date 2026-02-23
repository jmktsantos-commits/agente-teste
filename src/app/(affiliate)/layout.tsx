"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { AffiliateSidebar } from "@/components/affiliate/sidebar"
import { Loader2, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

export default function AffiliateLayout({ children }: { children: React.ReactNode }) {
    const [isLoading, setIsLoading] = useState(true)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        const checkAffiliate = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) { router.push("/login"); return }

                const { data: profile } = await supabase
                    .from("profiles")
                    .select("role")
                    .eq("id", user.id)
                    .single()

                // Allow both admin (testing) and affiliate
                if (!profile || (profile.role !== "affiliate" && profile.role !== "admin")) {
                    router.push("/dashboard")
                    return
                }

                setIsLoading(false)
            } catch {
                router.push("/login")
            }
        }
        checkAffiliate()
    }, [router, supabase])

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="flex min-h-screen w-full bg-background">
            <div className="hidden border-r bg-card/50 md:block w-64 fixed h-full z-30">
                <AffiliateSidebar />
            </div>
            <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-sm border-b">
                <div className="flex items-center justify-between p-4">
                    <h1 className="text-lg font-bold">Painel Afiliado</h1>
                    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <Menu className="h-5 w-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0 w-64">
                            <AffiliateSidebar />
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
            <div className="flex flex-col w-full md:pl-64">
                <main className="flex-1 p-6 lg:p-8 pt-20 md:pt-6">
                    {children}
                </main>
            </div>
        </div>
    )
}
