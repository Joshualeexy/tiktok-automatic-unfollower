const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const { FingerprintGenerator } = require('fingerprint-generator');
const { FingerprintInjector } = require('fingerprint-injector');

// Register stealth plugin
chromium.use(stealth());

// Initialize fingerprint generators
const fingerprintGenerator = new FingerprintGenerator();
const fingerprintInjector = new FingerprintInjector();

const storagePath = path.resolve(__dirname, 'cookies.json');
const targetUsernameInput = process.argv[2];

// Parse optional CLI arguments
const args = process.argv.slice(2);
let overallTarget = 100;
let isHeadless = false;

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--headless') {
        isHeadless = true;
    } else if ((args[i] === '--limit' || args[i] === '-l') && args[i + 1]) {
        overallTarget = parseInt(args[i + 1], 10) || 100;
    }
}

if (!targetUsernameInput || targetUsernameInput.startsWith('-')) {
    console.error('❌ Username is missing.');
    console.error('Usage: node unfollow.js <username> [--limit N] [--headless]');
    console.error('Example: node unfollow.js my_tiktok_user --limit 50');
    process.exit(1);
}

const username = targetUsernameInput.replace(/^@/, '').trim();

if (!/^[\w.]+$/.test(username)) {
    console.error('❌ Invalid username format. Username can only contain letters, numbers, dots, and underscores.');
    process.exit(1);
}

// Limit per single browser session (TikTok limits following list modal to ~25-30 users per session view)
const SESSION_BATCH_LIMIT = Math.min(overallTarget, 25);

/**
 * Utility sleep function
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Checks if a button label indicates an active following/friends relationship.
 */
function isFollowingOrFriendsLabel(label) {
    if (!label) return false;
    const l = label.toLowerCase().trim();
    return l.includes('following') || 
           l.includes('friends') || 
           l.includes('volgend') || 
           l.includes('vrienden') || 
           l.includes('urmărești') || 
           l.includes('prieteni') || 
           l.includes('abonné') || 
           l.includes('amis') || 
           l.includes('siguiendo') || 
           l.includes('amigos') || 
           l.includes('seguindo') || 
           l.includes('gefolgt') || 
           l.includes('freunde') || 
           l.includes('seguiti') || 
           l.includes('obserwujesz') || 
           l.includes('takip ediliyor') || 
           l.includes('mengikuti') || 
           l.includes('подписки') || 
           l.includes('أتابعه');
}

/**
 * Checks if a button label indicates that the account is already unfollowed / in "Follow" state.
 */
function isFollowLabel(label) {
    if (!label) return false;
    const l = label.toLowerCase().trim();
    if (isFollowingOrFriendsLabel(l)) return false;
    return l.includes('follow') ||
           l.includes('volgen') ||
           l.includes('seguir') ||
           l.includes('suivre') ||
           l.includes('folgen') ||
           l.includes('obserwuj') ||
           l.includes('takip et') ||
           l.includes('ikuti') ||
           l.includes('подписаться') ||
           l.includes('متابعة');
}

/**
 * Normalizes cookies to the format required by Playwright.
 */
function loadAndNormalizeCookies() {
    if (!fs.existsSync(storagePath)) return null;

    try {
        const raw = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));
        const rawCookies = Array.isArray(raw) ? raw : (raw.cookies || []);
        if (!Array.isArray(rawCookies) || rawCookies.length === 0) return null;

        return rawCookies.map(({ name, value, domain, path, secure, httpOnly, expirationDate, expires, sameSite }) => {
            let sameSiteVal = undefined;
            if (typeof sameSite === 'string') {
                const s = sameSite.toLowerCase();
                if (s === 'no_restriction' || s === 'none') sameSiteVal = 'None';
                else if (s === 'lax') sameSiteVal = 'Lax';
                else if (s === 'strict') sameSiteVal = 'Strict';
            }

            return {
                name,
                value,
                domain: domain || '.tiktok.com',
                path: path || '/',
                secure: secure !== undefined ? !!secure : true,
                httpOnly: httpOnly !== undefined ? !!httpOnly : false,
                expires: expires || (expirationDate ? Math.floor(expirationDate) : undefined),
                ...(sameSiteVal ? { sameSite: sameSiteVal } : {})
            };
        });
    } catch (err) {
        console.warn('⚠️ Failed to load cookies file:', err.message);
        return null;
    }
}

/**
 * Saves active browser session cookies back to cookies.json
 */
async function saveCookies(context) {
    try {
        const cookies = await context.cookies();
        fs.writeFileSync(storagePath, JSON.stringify({ cookies }, null, 2));
        console.log(`🔐 Session saved to cookies.json (${cookies.length} cookies)`);
    } catch (err) {
        console.warn('⚠️ Failed to save cookies:', err.message);
    }
}

(async () => {
    let browser;
    let context;

    try {
        console.log('🚀 Starting Stealth Bot Browser Session...');

        // 1. Launch stealth browser
        const launchOptions = {
            headless: isHeadless,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-infobars',
                '--window-position=0,0',
                '--ignore-certificate-errors',
                '--ignore-certificate-errors-spki-list',
                '--mute-audio'
            ]
        };

        browser = await chromium.launch(launchOptions);

        // 2. Generate browser fingerprint
        const { fingerprint, headers } = fingerprintGenerator.getFingerprint({
            browsers: ['chrome'],
            devices: ['desktop'],
            locales: ['en-US']
        });

        context = await browser.newContext({
            userAgent: fingerprint.userAgent,
            viewport: {
                width: fingerprint.screen.width,
                height: fingerprint.screen.height
            },
            locale: fingerprint.navigator.language || 'en-US',
            deviceScaleFactor: fingerprint.screen.devicePixelRatio || 1,
            hasTouch: fingerprint.navigator.maxTouchPoints > 0,
            timezoneId: 'America/New_York'
        });

        // Inject fingerprint into context
        await fingerprintInjector.attachFingerprintToPlaywright(context, { fingerprint, headers });

        // 3. Load cookies if present
        const cookies = loadAndNormalizeCookies();
        if (cookies && cookies.length > 0) {
            await context.addCookies(cookies);
            console.log(`🔐 Loaded ${cookies.length} session cookies`);
        }

        const page = await context.newPage();

        // 4. Setup API Response Interception for TikTok Follow API
        let latestFollowApiResponse = null;
        page.on('response', async (response) => {
            try {
                const url = response.url();
                if (url.includes('/api/commit/follow/user/') || url.includes('commit/follow/user')) {
                    const json = await response.json().catch(() => null);
                    if (json) {
                        latestFollowApiResponse = {
                            status_code: json.status_code,
                            status_msg: json.status_msg || '',
                            follow_status: json.follow_status,
                            timestamp: Date.now()
                        };
                    }
                }
            } catch (e) {}
        });

        // 5. Ensure authentication
        const currentCookies = await context.cookies();
        const hasSessionId = currentCookies.some(c => c.name.toLowerCase() === 'sessionid');

        if (!hasSessionId && !cookies) {
            console.log('🧑‍💻 No session found. Opening TikTok login page...');
            await page.goto('https://www.tiktok.com/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
            console.log('🧑‍💻 Please log in manually in the browser window...');

            let loggedIn = false;
            for (let i = 0; i < 150; i++) {
                await sleep(2000);
                const checkCookies = await context.cookies();
                if (checkCookies.some(c => c.name.toLowerCase() === 'sessionid')) {
                    loggedIn = true;
                    break;
                }
            }

            if (!loggedIn) {
                throw new Error('Login timed out. Please run the script again and log in.');
            }

            await saveCookies(context);
        }

        // 6. Navigate to profile
        console.log(`🌐 Navigating to TikTok profile: https://www.tiktok.com/@${username}`);
        await page.goto(`https://www.tiktok.com/@${username}`, {
            waitUntil: 'domcontentloaded',
            timeout: 60000,
            referer: 'https://www.tiktok.com/'
        });

        // Wait for profile following element
        console.log('⏳ Waiting for profile elements to render...');
        await page.waitForSelector('[data-e2e="following"], a[href*="/following"], [data-e2e="following-count"]', { timeout: 60000 });
        await sleep(2000);

        // Check following count
        let currentFollowingCount = 0;
        try {
            const countSelector = await page.waitForSelector('[data-e2e="following-count"]', { timeout: 10000 }).catch(() => null);
            if (countSelector) {
                const text = await countSelector.innerText();
                currentFollowingCount = parseInt(text.replace(/\D/g, '')) || 0;
            }
        } catch (e) {}

        console.log(`📊 Account following count: ${currentFollowingCount}`);
        if (currentFollowingCount === 0) {
            console.log('🎉 You are following 0 users! Nothing left to unfollow.');
            await saveCookies(context);
            await browser.close();
            return;
        }

        // Open Following Modal
        console.log('📂 Opening "Following" modal list...');
        const followingBtn = await page.$('[data-e2e="following"]') || 
                           await page.$('a[href*="/following"]') || 
                           await page.$('[data-e2e="following-count"]');

        if (!followingBtn) {
            throw new Error('Could not find the Following button on profile page.');
        }

        await followingBtn.click({ force: true });

        console.log('⏳ Waiting for list rows to appear...');
        await page.waitForSelector('[data-e2e="follow-button"], button:has-text("Following")', { timeout: 60000 });

        let sessionUnfollowedCount = 0;
        const processedUsernames = new Set();
        let stagnantAttempts = 0;
        const MAX_STAGNANT_ATTEMPTS = 3;
        let consecutiveEmptyReloads = 0;
        const MAX_CONSECUTIVE_EMPTY_RELOADS = 2;

        // 7. Session Unfollow Loop (Up to SESSION_BATCH_LIMIT or stagnation)
        while (sessionUnfollowedCount < SESSION_BATCH_LIMIT && sessionUnfollowedCount < overallTarget) {
            // Handle stagnant scroll / reload recovery
            if (stagnantAttempts >= MAX_STAGNANT_ATTEMPTS) {
                consecutiveEmptyReloads++;
                if (consecutiveEmptyReloads >= MAX_CONSECUTIVE_EMPTY_RELOADS) {
                    console.log(`⚠️ List stagnant after ${consecutiveEmptyReloads} reloads. Handing over to supervisor to restart fresh browser...`);
                    break;
                }

                console.log(`🔄 Stagnation detected at ${sessionUnfollowedCount} unfollows in session. Refreshing profile page...`);
                stagnantAttempts = 0;
                processedUsernames.clear();

                try {
                    await page.keyboard.press('Escape');
                    await sleep(1000);
                    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 });
                    await sleep(3000);

                    // Check if overall count is 0
                    const countEl = await page.$('[data-e2e="following-count"]');
                    if (countEl) {
                        const textAfter = await countEl.innerText();
                        const countAfter = parseInt(textAfter.replace(/\D/g, '')) || 0;
                        if (countAfter === 0) {
                            console.log('🎉 You are following 0 users! Task complete.');
                            break;
                        }
                    }

                    console.log('📂 Re-opening "Following" modal...');
                    const refollowBtn = await page.$('[data-e2e="following"]') || await page.$('a[href*="/following"]');
                    if (refollowBtn) {
                        await refollowBtn.click({ force: true });
                        await page.waitForSelector('[data-e2e="follow-button"]', { timeout: 30000 });
                        continue;
                    }
                } catch (reloadErr) {
                    console.error('❌ Failed to reload modal in session:', reloadErr.message);
                    break;
                }
            }

            // Find all follow buttons in DOM
            const buttons = await page.$$('[data-e2e="follow-button"], button:has-text("Following"), button:has-text("Friends")');

            // Validate session on first batch
            if (sessionUnfollowedCount === 0 && processedUsernames.size === 0 && buttons.length > 0) {
                let activeCount = 0;
                const checkLimit = Math.min(buttons.length, 5);
                for (let i = 0; i < checkLimit; i++) {
                    const label = await buttons[i].evaluate(el => el.textContent?.trim() || '');
                    if (isFollowingOrFriendsLabel(label)) activeCount++;
                }
                if (activeCount === 0) {
                    throw new Error('❌ Session expired or invalid: All buttons say "Follow" instead of "Following". Please update cookies.');
                }
            }

            let clickedInThisScroll = 0;

            for (const button of buttons) {
                if (sessionUnfollowedCount >= SESSION_BATCH_LIMIT || sessionUnfollowedCount >= overallTarget) break;

                try {
                    const label = await button.evaluate(el => el.textContent?.trim() || '');

                    const targetUsername = await button.evaluate(el => {
                        let card = el.closest('li') || el.closest('[data-e2e="user-card"]') || el.parentElement;
                        const link = card ? card.querySelector('a[href*="/@"]') : null;
                        if (link) {
                            const href = link.getAttribute('href') || '';
                            const m = href.match(/@([\w.]+)/);
                            return m ? m[1] : null;
                        }
                        return null;
                    }) || `user_${Math.random().toString(36).substr(2, 6)}`;

                    if (processedUsernames.has(targetUsername)) {
                        continue;
                    }

                    if (isFollowingOrFriendsLabel(label)) {
                        latestFollowApiResponse = null;

                        await button.click({ force: true });

                        await sleep(300);
                        const confirmBtn = await page.$('button:has-text("Unfollow"), [data-e2e="confirm-unfollow-button"]');
                        if (confirmBtn) {
                            await confirmBtn.click({ force: true });
                            await sleep(300);
                        }

                        let unfollowVerified = false;
                        let isRateLimited = false;
                        const verifyStart = Date.now();

                        while (Date.now() - verifyStart < 3500) {
                            if (latestFollowApiResponse) {
                                if (latestFollowApiResponse.status_code === 0) {
                                    unfollowVerified = true;
                                    break;
                                } else if (latestFollowApiResponse.status_code === 2096 || 
                                           latestFollowApiResponse.status_code === 10006 || 
                                           latestFollowApiResponse.status_code === 2095) {
                                    isRateLimited = true;
                                    break;
                                }
                            }

                            const currentText = await button.evaluate(el => el.textContent?.trim() || '').catch(() => '');
                            if (isFollowLabel(currentText)) {
                                unfollowVerified = true;
                                break;
                            }

                            await sleep(50);
                        }

                        if (isRateLimited) {
                            console.warn(`⚠️ TikTok rate limit reached (${latestFollowApiResponse?.status_msg || 'You are unfollowing too fast'}). Pausing for 30 seconds...`);
                            await sleep(30000);
                            processedUsernames.add(targetUsername);
                            continue;
                        }

                        if (unfollowVerified) {
                            sessionUnfollowedCount++;
                            clickedInThisScroll++;
                            console.log(`👎 Unfollowed @${targetUsername}`);
                            processedUsernames.add(targetUsername);

                            const delayMs = 300 + Math.random() * 400;
                            await sleep(delayMs);
                        } else {
                            console.warn(`⚠️ Unfollow action for @${targetUsername} did not register. Skipping...`);
                            processedUsernames.add(targetUsername);
                            await sleep(500);
                        }
                    } else {
                        processedUsernames.add(targetUsername);
                    }
                } catch (err) {
                    // Ignore stale element exceptions
                }
            }

            // Capture list scroll metrics before scrolling modal container
            const listStateBefore = await page.evaluate(() => {
                const btn = document.querySelector('[data-e2e="follow-button"]');
                let scrollable = null;
                if (btn) {
                    let el = btn.parentElement;
                    while (el && el !== document.body) {
                        const style = window.getComputedStyle(el);
                        const overflow = style.overflowY || style.overflow || '';
                        if (overflow.includes('auto') || overflow.includes('scroll') || (el.scrollHeight > el.clientHeight && el.clientHeight > 0)) {
                            scrollable = el;
                            break;
                        }
                        el = el.parentElement;
                    }
                }
                if (scrollable) {
                    const list = scrollable.querySelector('ul') || scrollable;
                    return {
                        scrollHeight: scrollable.scrollHeight,
                        scrollTop: scrollable.scrollTop,
                        itemCount: list.querySelectorAll('li').length
                    };
                }
                return {
                    scrollHeight: document.body.scrollHeight,
                    scrollTop: window.scrollY,
                    itemCount: document.querySelectorAll('[data-e2e="follow-button"]').length
                };
            });

            // Smooth scroll modal container down
            await page.evaluate(() => {
                const btn = document.querySelector('[data-e2e="follow-button"]');
                if (btn) {
                    let el = btn.parentElement;
                    while (el && el !== document.body) {
                        const style = window.getComputedStyle(el);
                        const overflow = style.overflowY || style.overflow || '';
                        if (overflow.includes('auto') || overflow.includes('scroll') || (el.scrollHeight > el.clientHeight && el.clientHeight > 0)) {
                            el.scrollBy({ top: 1200, behavior: 'smooth' });
                            return;
                        }
                        el = el.parentElement;
                    }
                }
                window.scrollBy({ top: 1200, behavior: 'smooth' });
            });

            await sleep(2000);

            // Capture list scroll metrics after scroll
            const listStateAfter = await page.evaluate(() => {
                const btn = document.querySelector('[data-e2e="follow-button"]');
                let scrollable = null;
                if (btn) {
                    let el = btn.parentElement;
                    while (el && el !== document.body) {
                        const style = window.getComputedStyle(el);
                        const overflow = style.overflowY || style.overflow || '';
                        if (overflow.includes('auto') || overflow.includes('scroll') || (el.scrollHeight > el.clientHeight && el.clientHeight > 0)) {
                            scrollable = el;
                            break;
                        }
                        el = el.parentElement;
                    }
                }
                if (scrollable) {
                    const list = scrollable.querySelector('ul') || scrollable;
                    return {
                        scrollHeight: scrollable.scrollHeight,
                        scrollTop: scrollable.scrollTop,
                        itemCount: list.querySelectorAll('li').length
                    };
                }
                return {
                    scrollHeight: document.body.scrollHeight,
                    scrollTop: window.scrollY,
                    itemCount: document.querySelectorAll('[data-e2e="follow-button"]').length
                };
            });

            const scrolledDown = listStateAfter.scrollTop > listStateBefore.scrollTop;
            const listGrew = (listStateAfter.scrollHeight > listStateBefore.scrollHeight) || 
                             (listStateAfter.itemCount > listStateBefore.itemCount);

            if (clickedInThisScroll > 0 || listGrew || scrolledDown) {
                stagnantAttempts = 0;
            } else {
                stagnantAttempts++;
                console.log(`⚠️ Follower list did not grow (${stagnantAttempts}/${MAX_STAGNANT_ATTEMPTS})`);
            }
        }

        console.log(`🏁 Session finished. Unfollowed in this batch: ${sessionUnfollowedCount}`);
        await saveCookies(context);

    } catch (err) {
        console.error('❌ Error during execution:', err.message);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
})();
