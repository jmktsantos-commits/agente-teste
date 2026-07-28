#!/usr/bin/env node
/**
 * TipMiner Scraper v3.0 — Quasi-Realtime
 * 
 * Browser PERSISTENTE + Intervalo 30s = updates quase instantaneos
 * Abre o browser UMA VEZ e reusa a mesma sessao, só faz reload nas paginas.
 * 
 * Usa exatamente a mesma logica do Railway scraper original:
 *   - Seletor: button.cell--aviator
 *   - Extrai multiplier + horario do textContent
 *   - Verificacao de duplicatas via Supabase
 * 
 * Uso:
 *   node tipminer-scraper.js              # Loop continuo (30s)
 *   node tipminer-scraper.js --once       # Roda uma unica vez
 *   pm2 start tipminer-scraper.js --name tipminer
 */

const puppeteer = require('puppeteer');
const https = require('https');

// ===== CONFIG =====
const CONFIG = {
    interval: 30 * 1000, // 30 segundos
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wufnvueiappspptdphux.supabase.co',
    supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || Buffer.from('c2Jfc2VjcmV0X296SUMtOGpDMHd6MjJCNnpRRUpyQUFfTUs2c3JIaFE=', 'base64').toString(),
    platforms: [
        { name: 'bravobet', url: 'https://www.tipminer.com/br/historico/bravobet/aviator' },
        { name: 'esportivabet', url: 'https://www.tipminer.com/br/historico/sortenabet/aviator' },
        { name: 'superbet', url: 'https://www.tipminer.com/br/historico/betou/aviator' },
    ],
    maxResults: 20,
    navTimeout: 45000,   // 45s para carregar pagina
    browserRestartAfter: 50, // Restart browser a cada 50 ciclos (~25 min)
};

const USER_AGENTS = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
];
function randomUA() { return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]; }

const runOnce = process.argv.includes('--once');
let browser = null;
let page = null;
let cycleCount = 0;
let totalSavedSession = 0;

// ===== LOGGING =====
function log(msg) {
    console.log(`[${new Date().toLocaleTimeString('pt-BR')}] ${msg}`);
}

// ===== SUPABASE =====
function supabaseRequest(method, path, body) {
    return new Promise((resolve, reject) => {
        const url = new URL(CONFIG.supabaseUrl + path);
        const bodyStr = body ? JSON.stringify(body) : '';
        const req = https.request({
            hostname: url.hostname,
            path: url.pathname + url.search,
            method,
            headers: {
                'apikey': CONFIG.supabaseKey,
                'Authorization': `Bearer ${CONFIG.supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': method === 'POST' ? 'resolution=ignore-duplicates,return=minimal' : '',
                ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
            },
        }, (res) => {
            let data = '';
            res.on('data', (c) => data += c);
            res.on('end', () => resolve({ status: res.statusCode, data }));
        });
        req.on('error', reject);
        req.setTimeout(10000, () => { req.destroy(); reject(new Error('Supabase timeout')); });
        if (bodyStr) req.write(bodyStr);
        req.end();
    });
}

// ===== BROWSER MANAGEMENT =====
async function ensureBrowser() {
    if (browser && page) {
        try {
            await page.evaluate(() => true); // Test if page is still alive
            return;
        } catch (e) {
            log('⚠️ Browser/page morreu — reiniciando...');
        }
    }

    if (browser) {
        try { await browser.close(); } catch (e) { }
    }

    log('🚀 Iniciando browser...');
    browser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-blink-features=AutomationControlled',
            '--window-size=1366,768',
        ],
    });
    page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 768 });
    await page.setUserAgent(randomUA());
    // Remove webdriver fingerprint
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
    log('✅ Browser pronto');
}

// ===== SCRAPE ONE PLATFORM =====
async function scrapePlatform(platform) {
    // Rotate user agent each request
    await page.setUserAgent(randomUA());
    try {
        await page.goto(platform.url, { waitUntil: 'domcontentloaded', timeout: CONFIG.navTimeout });

        // Esperar os botoes de resultado
        try {
            await page.waitForSelector('button.cell--aviator', { timeout: 20000 });
        } catch (e) {
            // Fallback: tentar regex no texto
            log(`⏳ ${platform.name}: Sem button.cell--aviator — tentando texto...`);
        }

        // Aguardar um pouco para SPA renderizar
        await new Promise(r => setTimeout(r, 2000));

        // Extrair dados exatamente como o Railway scraper
        const results = await page.evaluate(() => {
            const results = [];

            // Metodo 1: button.cell--aviator (original do Railway)
            const cells = Array.from(document.querySelectorAll('button.cell--aviator')).slice(0, 20);
            for (const cell of cells) {
                const raw = cell.textContent.trim();
                const multMatch = raw.match(/^([\d,]+)x/);
                if (!multMatch) continue;

                const multiplier = parseFloat(multMatch[1].replace(',', '.'));
                const timeMatch = raw.match(/(\d{1,2}):(\d{2}):(\d{2})$/);
                let gameTime = null;
                if (timeMatch) {
                    gameTime = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}:${timeMatch[3]}`;
                }

                if (!isNaN(multiplier) && gameTime) {
                    results.push({ multiplier, gameTime });
                }
            }

            if (results.length === 0) {
                const text = document.body.innerText;
                const regex = /(\d+)[,.](\d+)x/gi;
                let match;
                while ((match = regex.exec(text)) !== null && results.length < 20) {
                    const val = parseFloat(match[1] + '.' + match[2]);
                    if (val > 0 && val < 10000) {
                        results.push({ multiplier: val, gameTime: null });
                    }
                }
            }

            // Deduplicate exact same multiplier combos locally (regardless of time)
            // Sometimes the DOM gives us the same multiplier twice sequentially
            const uniqueResults = [];
            let lastMultiplier = null;

            for (const r of results) {
                if (r.multiplier !== lastMultiplier) {
                    uniqueResults.push(r);
                    lastMultiplier = r.multiplier;
                }
            }

            return uniqueResults;
        });

        return results;
    } catch (e) {
        log(`❌ ${platform.name}: ${e.message}`);
        return [];
    }
}

// ===== SAVE WITH DUPLICATE CHECK =====
async function saveResults(platformName, results) {
    if (!results || results.length === 0) return 0;

    let saved = 0;
    const now = new Date();

    // Fetch recent history once for deduplication (last 60 seconds)
    const recentTime = new Date(now.getTime() - 60000);
    const { data: recentHistory } = await supabaseRequest('GET', `/rest/v1/crash_history?platform=eq.${platformName}&round_time=gte.${recentTime.toISOString()}&select=id,multiplier,round_time`);

    let recentRecords = [];
    if (recentHistory) {
        try {
            recentRecords = JSON.parse(recentHistory);
        } catch (e) { }
    }

    // Build batch of records
    const records = [];
    for (let i = 0; i < results.length; i++) {
        const r = results[i];

        let roundDate;
        if (r.gameTime) {
            const [hours, minutes, seconds] = r.gameTime.split(':').map(Number);
            roundDate = new Date(now);
            roundDate.setHours(hours, minutes, seconds, 0);
            if (roundDate > now) roundDate.setDate(roundDate.getDate() - 1);
            // Preservar ordem com milissegundos
            roundDate.setMilliseconds(999 - i);
        } else {
            roundDate = new Date(now);
            roundDate.setMilliseconds(999 - i);
        }

        // Group times by dropping the milliseconds completely to compare
        const localTimeStr = roundDate.toISOString().split('.')[0];

        // Check uniqueness locally against recent DB records
        let isDuplicate = false;
        for (const recent of recentRecords) {
            const recentTimeStr = recent.round_time.split('.')[0];
            if (recent.multiplier === r.multiplier) {
                // Se o mesmo multiplicador ocorreu nos ultimos 60 segundos, e duplicata
                const diffMs = Math.abs(new Date(recentTimeStr + 'Z').getTime() - new Date(localTimeStr + 'Z').getTime());
                if (diffMs < 60000) {
                    isDuplicate = true;
                    break;
                }
            }
        }

        if (isDuplicate) continue;

        // Adicionaremos MS para os items entrarem em ordem.
        roundDate.setMilliseconds(999 - i);

        // Add to recentRecords to prevent duplicates within the same batch
        recentRecords.push({
            multiplier: r.multiplier,
            round_time: roundDate.toISOString()
        });

        records.push({
            multiplier: r.multiplier,
            platform: platformName,
            round_time: roundDate.toISOString(),
        });
    }

    // Batch insert com ignore-duplicates
    if (records.length > 0) {
        try {
            const res = await supabaseRequest('POST', '/rest/v1/crash_history', records);
            if (res.status >= 200 && res.status < 300) {
                saved = records.length;
            } else if (res.status === 409) {
                // Todos duplicados — OK
                saved = 0;
            } else {
                log(`⚠️ Supabase ${res.status}: ${res.data.substring(0, 80)}`);
            }
        } catch (e) {
            log(`❌ Supabase: ${e.message}`);
        }
    }

    return saved;
}

// ===== MAIN CYCLE =====
async function runCycle() {
    cycleCount++;
    const ts = new Date().toLocaleTimeString('pt-BR');

    // Restart browser periodicamente para limpar memoria
    if (cycleCount % CONFIG.browserRestartAfter === 0) {
        log('🔄 Reiniciando browser (limpeza de memoria)...');
        if (browser) {
            try { await browser.close(); } catch (e) { }
            browser = null; page = null;
        }
    }

    await ensureBrowser();

    let cycleSaved = 0;
    for (const platform of CONFIG.platforms) {
        const results = await scrapePlatform(platform);
        if (results.length > 0) {
            const saved = await saveResults(platform.name, results);
            cycleSaved += saved;
            if (saved > 0) {
                log(`💾 ${platform.name}: ${results.length} extraidos, ${saved} novos no Supabase`);
            } else {
                log(`📋 ${platform.name}: ${results.length} extraidos (todos duplicados)`);
            }
        } else {
            log(`📭 ${platform.name}: 0 resultados`);
        }

        // Delay curto entre plataformas
        await new Promise(r => setTimeout(r, 1000));
    }

    totalSavedSession += cycleSaved;
    if (cycleSaved > 0) {
        log(`✅ Ciclo #${cycleCount}: +${cycleSaved} novos | Total sessao: ${totalSavedSession}`);
    } else {
        log(`📋 Ciclo #${cycleCount}: sem novos dados | Total: ${totalSavedSession}`);
    }
}

// ===== START =====
async function main() {
    console.log('');
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║  TipMiner Scraper v3.0 — Quasi-Realtime      ║');
    console.log('║  Coleta: Bravobet, Esportivabet, Superbet    ║');
    console.log('║  Intervalo: 30 segundos                      ║');
    console.log('║  Browser: Persistente (reutiliza sessao)     ║');
    console.log('╚══════════════════════════════════════════════╝');
    console.log('');

    // Primeiro ciclo
    try {
        await runCycle();
    } catch (e) {
        log(`💥 Erro no primeiro ciclo: ${e.message}`);
    }

    if (runOnce) {
        log(`🏁 Modo --once. Total: ${totalSavedSession} salvos.`);
        if (browser) await browser.close();
        process.exit(0);
    }

    // Loop continuo
    const loop = async () => {
        while (true) {
            await new Promise(r => setTimeout(r, CONFIG.interval));
            try {
                await runCycle();
            } catch (e) {
                log(`💥 Erro: ${e.message}`);
                // Resetar browser em caso de erro
                browser = null; page = null;
            }
        }
    };

    loop();
}

// Cleanup
process.on('SIGINT', async () => {
    log('🛑 Encerrando...');
    if (browser) await browser.close();
    process.exit(0);
});

process.on('uncaughtException', (err) => {
    console.error('🔥 Erro Nao Tratado:', err.message);
});

main().catch(e => {
    console.error('Fatal:', e);
    process.exit(1);
});
