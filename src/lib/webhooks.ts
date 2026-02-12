const N8N_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || 'https://n8n.srv1355894.hstgr.cloud/webhook';
const N8N_AUTH = process.env.NEXT_PUBLIC_N8N_WEBHOOK_AUTH;

function getAuthHeaders() {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json'
    };

    if (N8N_AUTH) {
        const encoded = btoa(N8N_AUTH);
        headers['Authorization'] = `Basic ${encoded}`;
    }

    return headers;
}

export async function calcularBanca(userId: string, balance: number, riskProfile: string) {
    try {
        const res = await fetch(`${N8N_URL}/atualizar-banca`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                user_id: userId,
                balance,
                risk_profile: riskProfile
            })
        });

        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }

        return await res.json();
    } catch (error) {
        console.error('Erro ao calcular banca:', error);
        throw error;
    }
}

export async function enviarMensagemChat(userId: string, content: string) {
    const res = await fetch(`${N8N_URL}/chat-moderation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, content })
    });
    return res.json();
}

export async function perguntarSuporte(userId: string, question: string, history: Record<string, unknown>[]) {
    const res = await fetch(`${N8N_URL}/suporte-ia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, question, conversation_history: history })
    });
    return res.json();
}

export async function enviarNotificacaoAdmin(title: string, message: string, adminId: string) {
    const res = await fetch(`${N8N_URL}/admin-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message, admin_id: adminId })
    });
    return res.json();
}
