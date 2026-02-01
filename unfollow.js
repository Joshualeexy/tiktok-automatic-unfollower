const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');

const desktopDevice = devices['Desktop Chrome'];
const storagePath = path.resolve(__dirname, 'cookies.json');
const username = process.argv[2];

if (!username) {
    console.error('❌ Username is missing. Usage: node script.js <username>');
    process.exit(1);
}

if (!/^[\w.]+$/.test(username)) {
    console.error('❌ Invalid username format. Username can only contain letters, numbers, dots, and underscores.');
    process.exit(1);
}

(async () => {
    let browser;
    try {
        browser = await chromium.launch({headless:false});
    const context = await browser.newContext({
        ...desktopDevice,
    });

    // Load cookies
    if (fs.existsSync(storagePath)) {
        const raw = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));
        const rawCookies = Array.isArray(raw) ? raw : raw.cookies;
        if (!Array.isArray(rawCookies)) throw new Error('Invalid cookies format');

        const cookies = rawCookies.map(({ name, value, domain, path, secure, httpOnly, expirationDate, expires }) => ({
            name,
            value,
            domain,
            path: path || '/',
            secure: !!secure,
            httpOnly: !!httpOnly,
            expires: expires || (expirationDate ? Math.floor(expirationDate) : -1)
        }));

        await context.addCookies(cookies);
        console.log('🔐 Cookies loaded');
    }

    const page = await context.newPage();

    // Login if no cookies
    if (!fs.existsSync(storagePath)) {
        await page.goto('https://www.tiktok.com/login', { waitUntil: 'networkidle' });
        console.log('🧑‍💻 Login manually and wait for /foryou...');
        await page.waitForURL('**/foryou', { timeout: 0 });
        const cookies = await context.cookies();
        fs.writeFileSync(storagePath, JSON.stringify({ cookies }, null, 2));
        console.log('✅ Session saved');
    }

    // Go to profile > Following list
    await page.goto(`https://www.tiktok.com/@${username}`, {
        waitUntil: 'domcontentloaded',
        referer: 'https://www.tiktok.com/'
    });

    await page.waitForSelector('[data-e2e="following"]', { timeout: 60000 });
    await page.waitForTimeout(10000)
    await page.click('[data-e2e="following"]', { force: true });

    console.log('📄 Waiting for unfollow buttons to appear...');
    await page.waitForSelector('[data-e2e="follow-button"]', { timeout: 60000 });

    let unfollowed = 0;
    let noNewButtons = 0;

    while (noNewButtons < 3) {
        await page.evaluate(() => {
            document.querySelectorAll('*').forEach(el => {
                if (getComputedStyle(el).pointerEvents !== 'auto') {
                    el.style.pointerEvents = 'auto';
                }
            });
        });

        const buttons = await page.$$('[data-e2e="follow-button"]');

        if (!buttons.length) {
            noNewButtons++;
            console.log(`⚠️ No new buttons found (x${noNewButtons})`);
            await page.mouse.wheel(0, 1000);
            await page.waitForTimeout(2000);
            continue;
        }

        noNewButtons = 0;

        for (const button of buttons) {
            try {
                const label = await button.evaluate(el => el.textContent?.trim());
                if (label && (label.toLowerCase().includes('following') || label.toLowerCase().includes('friends'))) {
                    await button.click();
                    unfollowed++;
                    console.log(`👎 Unfollowed ${unfollowed}`);
                    await page.waitForTimeout(1000);
                    await page.mouse.wheel(0, 800);
                    await page.waitForTimeout(1000);
                }
            } catch (err) {
                console.warn('⚠️ Failed to click button:', err.message);
            }
        }
    }

        console.log('✅ Finished unfollowing (nothing new loaded).');
    } catch (err) {
        console.error('❌ Fatal error:', err.message);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
})();
