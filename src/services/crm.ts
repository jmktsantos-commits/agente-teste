import { createClient } from '@/utils/supabase/client'

export type LeadStatus = 'new' | 'contacted' | 'interested' | 'converted' | 'lost'
export type LeadSource = 'organic' | 'ads' | 'referral' | 'manual' | 'import' | 'payment'

export interface DBLead {
    id: string
    user_id?: string
    full_name: string
    email?: string
    phone?: string
    birth_date?: string
    plan_name?: string
    status: LeadStatus
    source: LeadSource
    notes?: string
    tags?: string[]
    last_contact_at?: string
    last_seen_at?: string
    created_at: string
}

export type ConversationType = 'whatsapp' | 'email' | 'site_chat'

export interface DBConversation {
    id: string
    lead_id: string
    channel: ConversationType
    status: 'open' | 'closed' | 'archived'
    last_message_at: string
}

export interface DBMessage {
    id: string
    conversation_id: string
    direction: 'inbound' | 'outbound'
    content: string
    content_type: 'text' | 'image' | 'template'
    created_at: string
}

const supabase = createClient()

export const CRMService = {
    // LEADS
    async getLeads({ page = 1, limit = 20, status, search }: { page?: number, limit?: number, status?: string, search?: string }) {
        let query = supabase
            .from('crm_leads')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range((page - 1) * limit, page * limit - 1)

        if (status && status !== 'all') {
            query = query.eq('status', status)
        }

        if (search) {
            query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
        }

        const { data, error, count } = await query
        if (error) throw error
        return { leads: data as DBLead[], total: count || 0 }
    },

    async getLead(id: string) {
        const { data, error } = await supabase
            .from('crm_leads')
            .select('*')
            .eq('id', id)
            .single()

        if (error) throw error
        return data as DBLead
    },

    async createLead(lead: Partial<DBLead>) {
        const { data, error } = await supabase
            .from('crm_leads')
            .insert(lead)
            .select()
            .single()

        if (error) throw error
        return data as DBLead
    },

    async updateLead(id: string, updates: Partial<DBLead>) {
        const { data, error } = await supabase
            .from('crm_leads')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data as DBLead
    },

    // CONVERSATIONS & MESSAGES
    async getConversations(leadId: string) {
        const { data, error } = await supabase
            .from('crm_conversations')
            .select('*')
            .eq('lead_id', leadId)
            .order('last_message_at', { ascending: false })

        if (error) throw error
        return data as DBConversation[]
    },

    async getMessages(conversationId: string) {
        const { data, error } = await supabase
            .from('crm_messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true })

        if (error) throw error
        return data as DBMessage[]
    },

    async sendMessage(conversationId: string, content: string) {
        // Save to DB
        const { data, error } = await supabase
            .from('crm_messages')
            .insert({
                conversation_id: conversationId,
                direction: 'outbound',
                content,
                content_type: 'text'
            })
            .select()
            .single()

        if (error) throw error

        // Update conversation timestamp
        await supabase
            .from('crm_conversations')
            .update({ last_message_at: new Date().toISOString() })
            .eq('id', conversationId)

        // Broadcast directly to the Realtime channel so the lead's frontend receives it instantly
        // This is crucial because anonymous leads might not trigger the postgres_changes event due to RLS
        const channel = supabase.channel(`lead_chat_msgs:${conversationId}`)
        await channel.send({
            type: 'broadcast',
            event: 'new_message',
            payload: { message: data }
        })
        supabase.removeChannel(channel)

        return data as DBMessage
    },

    // Get ALL conversations (all leads) with lead info, optionally filtered by channel
    async getAllConversations(channel?: ConversationType) {
        let query = supabase
            .from('crm_conversations')
            .select(`
                *,
                crm_leads (
                    id,
                    full_name,
                    email,
                    phone,
                    status,
                    affiliate_id,
                    affiliates:affiliate_id (
                        btag
                    )
                )
            `)
            .order('last_message_at', { ascending: false, nullsFirst: false })

        if (channel) {
            query = query.eq('channel', channel)
        }

        const { data, error } = await query
        if (error) throw error
        return data as (DBConversation & {
            crm_leads: Pick<DBLead, 'id' | 'full_name' | 'email' | 'phone' | 'status'> & {
                affiliate_id?: string | null
                affiliates?: { btag: string } | null
            }
        })[]
    }

}

