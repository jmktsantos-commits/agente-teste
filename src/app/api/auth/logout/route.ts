import { createClient } from "@/utils/supabase/client"
import { redirect } from "next/navigation"

export async function POST() {
    const supabase = createClient()
    await supabase.auth.signOut()
    return redirect("/login")
}
