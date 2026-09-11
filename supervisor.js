const { spawn } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
const targetUsernameInput = args.find(arg => !arg.startsWith('-'));

let overallTarget = 100;
let isHeadless = false;

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--headless') {
        isHeadless = true;
    } else if ((args[i] === '--limit' || args[i] === '-l') && args[i + 1]) {
        overallTarget = parseInt(args[i + 1], 10) || 100;
    }
}

if (!targetUsernameInput) {
    console.error('❌ Username is missing.');
    console.error('Usage: node supervisor.js <username> [--limit N] [--headless]');
    console.error('Example: node supervisor.js my_tiktok_user --limit 100');
    process.exit(1);
}

const username = targetUsernameInput.replace(/^@/, '').trim();
const MAX_RESTARTS = 100;
const WATCHDOG_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes activity watchdog

async function runSupervisor() {
    console.log(`🛡️  Supervisor Watchdog started for @${username}`);
    console.log(`🎯 Overall Target: ${overallTarget} unfollows`);

    let cumulativeUnfollowed = 0;
    let restartCount = 0;
    let isFinished = false;
    let isSessionExpired = false;

    process.on('SIGINT', () => {
        console.log('\n🛑 Supervisor interrupted by user. Exiting...');
        process.exit(130);
    });

    while (cumulativeUnfollowed < overallTarget && restartCount < MAX_RESTARTS && !isFinished && !isSessionExpired) {
        const remaining = overallTarget - cumulativeUnfollowed;
        if (remaining <= 0) break;

        restartCount++;
        console.log(`\n========================================`);
        console.log(`🔄 Supervisor Run #${restartCount}/${MAX_RESTARTS}`);
        console.log(`📊 Progress: ${cumulativeUnfollowed}/${overallTarget} unfollowed. Batch remaining: ${remaining}`);
        console.log(`========================================\n`);

        const childArgs = ['unfollow.js', username, '--limit', String(remaining)];
        if (isHeadless) childArgs.push('--headless');

        const child = spawn('node', childArgs, {
            cwd: __dirname,
            stdio: ['inherit', 'pipe', 'pipe'],
            env: { ...process.env }
        });

        let watchdogTimer = null;
        let isKilledByWatchdog = false;

        const resetWatchdog = () => {
            if (watchdogTimer) clearTimeout(watchdogTimer);
            watchdogTimer = setTimeout(() => {
                console.warn('\n⚠️ [Supervisor Watchdog] No unfollow activity detected for 3 minutes. Terminating stuck browser...');
                isKilledByWatchdog = true;
                child.kill('SIGINT');
                setTimeout(() => {
                    try { child.kill('SIGKILL'); } catch (e) {}
                }, 5000);
            }, WATCHDOG_TIMEOUT_MS);
        };

        resetWatchdog();

        // Monitor stdout for unfollow events
        child.stdout.on('data', (data) => {
            const lines = data.toString().split('\n');
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;

                if (trimmed.includes('Unfollowed @')) {
                    cumulativeUnfollowed++;
                    resetWatchdog();
                }

                if (trimmed.includes('following 0 users') || trimmed.includes('Nothing left to unfollow')) {
                    isFinished = true;
                }

                if (trimmed.includes('Session expired') || trimmed.includes('Invalid cookies')) {
                    isSessionExpired = true;
                }

                console.log(trimmed);
            }
        });

        // Monitor stderr
        child.stderr.on('data', (data) => {
            const trimmed = data.toString().trim();
            if (trimmed.includes('Session expired') || trimmed.includes('Invalid cookies')) {
                isSessionExpired = true;
            }
            console.error(trimmed);
        });

        // Wait for process completion
        const exitCode = await new Promise((resolve) => {
            child.on('close', (code) => resolve(code));
        });

        if (watchdogTimer) clearTimeout(watchdogTimer);

        console.log(`\n📌 Batch process exited with code ${exitCode}`);

        if (isSessionExpired) {
            console.error('❌ Session has expired or is invalid. Please update cookies.json');
            break;
        }

        if (isFinished) {
            console.log('🎉 All users unfollowed! Task complete.');
            break;
        }

        if (cumulativeUnfollowed >= overallTarget) {
            console.log(`🎉 Target of ${overallTarget} unfollows reached! Task complete.`);
            break;
        }

        if (isKilledByWatchdog) {
            console.log('🔄 Restarting fresh browser context after watchdog timeout...');
        } else {
            console.log('⏳ Restarting fresh browser context in 5 seconds to bypass TikTok limit stagnation...');
            await new Promise(r => setTimeout(r, 5000));
        }
    }

    console.log(`\n🏁 Supervisor finished. Total accounts unfollowed: ${cumulativeUnfollowed}/${overallTarget}`);
}

runSupervisor().catch(err => {
    console.error('❌ Supervisor error:', err);
    process.exit(1);
});
