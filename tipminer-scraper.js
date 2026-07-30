#!/usr/bin/env node
/**
 * TipMiner Scraper v4.1 — API Direta com Dedup Inteligente
 *
 * Usa a API interna do TipMiner:
 *   https://api.core.public.tipminer.com/v1/crash/rounds/{gameId}/history
 *
 * Fix v4.1: compara round_time com o último registro no banco antes de inserir,
 * evitando o problema de "todos duplicados" causado pela constraint unique_sig.
 *
 * Uso:
 *   node tipminer-scraper.js              # Loop contínuo (30s)
 *   node tipminer-scraper.js --once       # Roda uma única vez
 *   pm2 start tipminer-scraper.js --name tipminer
 */

require('dotenv').config({ path: '.env.local' });

// ===== CONFIG =====
const CONFIG = {
    interval: 30 * 1000,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wufnvueiappspptdphux.supabase.co',
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || Buffer.from('c2Jfc2VjcmV0X296SUMtOGpDMHd6MjJCNnpRRUpyQUFfTUs2c3JIaFE=', 'base64').toString(),
    platforms: [
        {
            name: 'bravobet',
            gameId: 'dddfce2b-42dc-4fd5-afd8-a5ee0ef36f89',
        },
        // Adicione outros game IDs aqui conforme descobertos
    ],
    limit: 200,
};

const runOnce = process.argv.includes('--once');
let cycleCount = 0;
let totalSavedSession = 0;

function log(msg) {
    const t = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    console.log(`[${t}] ${msg}`);
}

// ===== FETCH DA API TIPMINER =====
async function fetchFromTipMiner(platform) {
    const url = `https://api.core.public.tipminer.com/v1/crash/rounds/${platform.gameId}/history?limit=${CONFIG.limit}&timezone=America%2FSao_Paulo`;
    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36',
            'Referer': 'https://www.tipminer.com/',
            'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) throw new Error(`API retornou ${res.status}`);
    return await res.json();
}

// ===== BUSCAR O TIMESTAMP MAIS RECENTE NO BANCO =====
async function getLatestTimestamp(platformName) {
    const res = await fetch(
        `${CONFIG.supabaseUrl}/rest/v1/crash_history?platform=eq.${platformName}&order=round_time.desc&limit=1&select=round_time`,
        {
            headers: {
                apikey: CONFIG.supabaseKey,
                Authorization: `Bearer ${CONFIG.supabaseKey}`,
            },
            signal: AbortSignal.timeout(10000),
        }
    );

    if (!res.ok) return null;
    const data = await res.json();
    return data.length > 0 ? new Date(data[0].round_time) : null;
}

// ===== SALVAR NO SUPABASE =====
async function saveToSupabase(records) {
    if (!records.length) return 0;

    const res = await fetch(`${CONFIG.supabaseUrl}/rest/v1/crash_history`, {
        method: 'POST',
        headers: {
            apikey: CONFIG.supabaseKey,
            Authorization: `Bearer ${CONFIG.supabaseKey}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=ignore-duplicates,return=minimal',
        },
        body: JSON.stringify(records),
        signal: AbortSignal.timeout(10000),
    });

    return res.ok ? records.length : 0;
}

// ===== CICLO PRINCIPAL =====
async function runCycle() {
    cycleCount++;
    let totalNew = 0;

    for (const platform of CONFIG.platforms) {
        try {
            // 1. Buscar rounds do TipMiner
            const data = await fetchFromTipMiner(platform);

            if (!Array.isArray(data) || data.length === 0) {
                log(`⚠️  ${platform.name}: resposta vazia`);
                continue;
            }

            // 2. Buscar o timestamp mais recente no banco para filtrar apenas novos
            const latestInDb = await getLatestTimestamp(platform.name);

            // 3. Filtrar apenas rounds mais novos que o banco
            const newRounds = latestInDb
                ? data.filter(r => new Date(r.instant) > latestInDb)
                : data;

            if (newRounds.length === 0) {
                log(`📋 ${platform.name}: ${data.length} buscados (banco atualizado, nada novo)`);
                continue;
            }

            // 4. Converter para formato do Supabase
            const records = newRounds.map(r => ({
                multiplier: r.result,
                platform: platform.name,
                round_time: r.instant, // já é ISO 8601 com timezone UTC
            }));

            // 5. Inserir no Supabase
            const saved = await saveToSupabase(records);
            totalNew += saved;

            log(`💾 ${platform.name}: ${data.length} buscados → ${newRounds.length} novos → ${saved} salvos`);

        } catch (err) {
            log(`❌ ${platform.name}: ${err.message}`);
        }
    }

    totalSavedSession += totalNew;

    if (totalNew > 0) {
        log(`✅ Ciclo #${cycleCount}: +${totalNew} novos | Total sessão: ${totalSavedSession}`);
    } else {
        log(`📋 Ciclo #${cycleCount}: banco atualizado | Total: ${totalSavedSession}`);
    }
}

// ===== LOOP =====
async function main() {
    log('🚀 TipMiner Scraper v4.1 (Dedup Inteligente) iniciado');
    log(`📡 Plataformas: ${CONFIG.platforms.map(p => p.name).join(', ')}`);
    log(`⏱️  Intervalo: ${CONFIG.interval / 1000}s | Rounds por ciclo: ${CONFIG.limit}`);

    await runCycle();

    if (runOnce) {
        log('✅ Modo --once concluído');
        process.exit(0);
    }

    setInterval(runCycle, CONFIG.interval);
}

main().catch(err => {
    log(`💀 Erro fatal: ${err.message}`);
    process.exit(1);
});
