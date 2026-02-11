import { Sidebar, MobileNav } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"

export default function ProtectedLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="h-full relative">
            <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-[80] bg-gray-900">
                <Sidebar />
            </div>
            <main className="md:pl-72 pb-16 md:pb-0 h-full">
                <Header />
                <div className="h-full p-6 space-y-4">
                    {children}
                </div>
            </main>
            <div className="md:hidden fixed bottom-0 left-0 w-full z-50">
                <MobileNav />
            </div>
        </div>
    )
}
