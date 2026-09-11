# TikTok Automatic Unfollower

Automated, stealthy bulk unfollower for TikTok accounts built with Playwright stealth evasions, browser fingerprint injection, and a watchdog supervisor process.

## Features

- **Supervisor Watchdog (`supervisor.js`)**: TikTok only renders ~25-30 accounts in a single profile following modal view before stalling. The supervisor manages clean browser context restarts, 3-minute watchdog timeouts, progress tracking, and batch continuation until the total target limit is reached.
- **Stealth & Evasion**: Uses `playwright-extra` with `puppeteer-extra-plugin-stealth` + `fingerprint-generator` & `fingerprint-injector` to bypass TikTok bot detection.
- **API Response Interception**: Directly listens to TikTok's `/api/commit/follow/user/` responses to verify successful unfollows and catch rate-limit codes (`2096`, `10006`, `2095`).
- **Rate Limit Protection**: Automatically pauses execution for 30 seconds when TikTok flags fast unfollows.
- **Modal Container Scrolling**: Locates and smoothly scrolls the inner modal list container (`overflow-y: auto/scroll`).
- **Confirmation Popup Auto-Handling**: Automatically confirms *"Unfollow @user?"* popups.
- **Stagnation & Auto-Reload Recovery**: Detects stuck lists, reloads the profile, and re-opens the list modal.
- **Multi-Language Support**: Recognizes "Following" and "Friends" button states across 15+ languages.

## Installation

```bash
npm install
```

## Usage

Run the supervisor script with your target username:

```bash
node supervisor.js <username> [--limit N] [--headless]
# OR using npm
npm start -- <username> --limit 100
```

### Examples

```bash
# Unfollow up to 100 users with automatic supervisor restarts
node supervisor.js my_tiktok_username --limit 100

# Run in headless mode
node supervisor.js my_tiktok_username --limit 100 --headless
```

### First Run & Cookies

1. If no valid `cookies.json` exists, the script will launch a browser window and prompt you to log in manually.
2. Once logged in, the session `sessionid` is detected and saved to `cookies.json`.
3. Subsequent runs will re-use `cookies.json` automatically.

You can also create `cookies.json` manually using the format in `cookies.json.example`.

## Architecture & How It Works

1. **Supervisor Engine (`supervisor.js`)**: Spawns `unfollow.js` as a subprocess with a target batch limit (~25 unfollows per session). It monitors stdout/stderr and maintains a 3-minute watchdog timer. When a batch completes or stalls, the supervisor recycles the browser context with a fresh browser instance until the target count is met.
2. **Session Execution (`unfollow.js`)**: Connects to TikTok, opens the following modal list, monitors API responses, and unfollows accounts with randomized human delays.

## License

MIT License