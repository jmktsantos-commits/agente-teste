require('dotenv').config({ path: '.env.local' });
const puppeteer = require('puppeteer');

async function debugTimestamps() {
    console.log('🔍 DEBUG: Verificando timestamps EXATOS no TipMiner\n');

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto('https://www.tipminer.com/br/historico/bravobet/aviator', {
        waitUntil: 'domcontentloaded',
        timeout: 60000
    });

    await page.waitForSelector('button.cell--aviator', { timeout: 15000 });

    const results = await page.evaluate(() => {
        const cells = Array.from(document.querySelectorAll('button.cell--aviator')).slice(0, 10);

        return cells.map((cell, idx) => {
            const raw = cell.textContent.trim();

            // Extract multiplier
            const multMatch = raw.match(/^([\d,]+)x/);
            const multiplier = multMatch ? multMatch[1].replace(',', '.') : 'N/A';

            // Extract time
            const timeMatch = raw.match(/(\d{1,2}):(\d{2}):(\d{2})$/);
            const gameTime = timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}:${timeMatch[3]}` : 'N/A';

            return {
                position: idx + 1,
                raw,
                multiplier,
                gameTime
            };
        });
    });

    console.log('📊 TipMiner (do topo para baixo - ordem de exibição):\n');
    results.forEach(r => {
        console.log(`${r.position}. ${r.multiplier}x - ${r.gameTime}`);
        console.log(`   Raw: "${r.raw}"\n`);
    });

    await browser.close();
    process.exit(0);
}

debugTimestamps();
