require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const userId = 'ae359cae-1e98-4558-9135-6bb8b2d02c3b';
    const { data: profile } = await supabase.from('profiles').select('email, full_name').eq('id', userId).maybeSingle();
    let lead = null;
    if (profile && profile.email) {
        const { data: linkedLead } = await supabase.from('crm_leads').select('id, user_id, affiliate_id').ilike('email', profile.email).eq('user_id', userId).maybeSingle();
        if (linkedLead) lead = { id: linkedLead.id };
        else {
            const { data: unlinkedLead } = await supabase.from('crm_leads').select('id, user_id, affiliate_id').ilike('email', profile.email).is('user_id', null).order('created_at', { ascending: true }).limit(1).maybeSingle();
            if (unlinkedLead) lead = { id: unlinkedLead.id };
        }
    }
    if (!lead) {
        const { data: leadByUserId } = await supabase.from('crm_leads').select('id').eq('user_id', userId).maybeSingle();
        lead = leadByUserId;
    }
    console.log('Resolved lead:', lead);
    
    let { data: conv } = await supabase.from('crm_conversations').select('id, lead_id').eq('lead_id', lead.id).eq('channel', 'site_chat').maybeSingle();
    console.log('Resolved conv:', conv);

    const { data: messages } = await supabase.from('crm_messages').select('*').eq('conversation_id', conv.id).order('created_at', { ascending: true });
    console.log('Resolved messages count:', messages?.length);
}
check();
