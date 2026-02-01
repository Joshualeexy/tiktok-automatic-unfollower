# TikTok Unfollower

Automated tool to bulk unfollow accounts from a TikTok user's following list using Playwright browser automation.

## Features

- Automated unfollowing via browser automation
- Session persistence with cookie storage
- Infinite scroll detection and handling
- Username validation and error handling
- Proper resource cleanup

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- A TikTok account

## Installation

```bash
npm install
```

This installs Playwright, which is required for browser automation.

## Usage

Run the script with a target username:

```bash
node unfollow.js <username>
```

### Example

```bash
node unfollow.js example_user
```

### First Run

On the first run without saved cookies:
1. The browser will open to TikTok's login page
2. Log in with your TikTok credentials
3. Navigate to your home feed (ForYou page)
4. The script will automatically save your session

Your session is stored in `cookies.json` for subsequent runs.
 (The Magic Inside)
## How It Works

1. **Authentication**: Loads saved cookies from `cookies.json` or prompts for login
2. **Navigation**: Opens the target user's TikTok profile and their following list
3. **Unfollowing**: Locates and clicks all "Following" buttons
4. **Scroll Detection**: Automatically scrolls and detects when no new buttons load (3 consecutive checks)
5. **Completion**: Reports total unfollows and closes the browser

## Configuration

The script uses `Desktop Chrome` device profile by default. To change this, edit the device selection in `unfollow.js`:

```javascript
const desktopDevice = devices['Desktop Chrome'];
```

Available options include `'Desktop Firefox'`, `'Desktop Safari'`, `'iPhone'`, and `'Pixel'`.

## File Structure

- `unfollow.js` - Main automation script
- `package.json` - Project dependencies and metadata
- `cookies.json` - Stored session cookies (generated on first run)
- `README.md` - Documentation
- `LICENSE` - MIT License


🔒 **Security**
- The `cookies.json` file contains your authenticated session
- Keep this file private and do not share it
- Do not commit this file to public repositories
- Delete and regenerate if you believe the session is compromised
## Troubleshooting

### "Username is missing" Error
Make sure to provide a username when running the script:
```bash
node unfollow.js <username>
```

### "Invalid username format" Error
Usernames must contain only letters, numbers, dots, and underscores. Avoid special characters.

### Script Hangs on Login Page
- The script waits indefinitely for you to reach the ForYou page after login
- Manually log in and navigate to your home feed
- Once you reach ForYou, the script will continue automatically

### No Unfollow Buttons Found
- The target user may have a private account
- The following list might be empty
- TikTok's UI elements may have changed (the script uses `data-e2e="follow-button"` selectors)

## Performance Tips

- The script uses 1-2 second delays between unfollows to avoid detection
- Adjust `page.waitForTimeout()` values to change speed (lower = faster but riskier)
- The script requires 3 consecutive "no new buttons" checks before stopping

## License
& Speed

The script is **intentionally slow**. Here's why:

- **1-2 second delays** between unfollows = TikTok won't flag you as a bot
- **3 consecutive empty checks** before it stops = makes sure you got everyone
- FThe Bottom Line

This tool exists because TikTok makes it impossible to do something that should be trivial: bulk unfollow accounts. If you want to clean up your following list, this is the only way that actually works.
Provide a username when running the script:
```bash
node unfollow.js <username>
```
### "--Tip--"
To skip login process manuay login into the account using a real browser use an extension like editthiscookie to export the cookies then create a cookies.json file and set cookies key = your array of exported cookies
```
{
    "cookies": []
}

```
### "Invalid username format" Error
Usernames must contain only letters, numbers, dots, and underscores.

### Script Hangs on Login Page
The script waits for you to reach the ForYou page after logging in. Manually navigate there and the script will continue automatically.

### No Unfollow Buttons Found
- The target user may have a private account
- The following list may be empty
- TikTok's UI structure may have changed

### Browser Resource Issues
Try running the script again. If the issue persists, check that Playwright is properly installed.

## Performance

The script uses 1-2 second delays between unfollows and requires 3 consecutive empty scroll checks before completing. These are intentional to reduce the risk of being flagged as a bot. You can adjust the `page.waitForTimeout()` calls in `unfollow.js` to change the speed, but faster execution increases the risk of account detection.

## License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.

## Disclaimer

This tool is provided as-is for educational purposes. The author is not responsible for any consequences of using this tool, including but not limited to account suspension, termination, or other actions taken by TikTok. Use at your own risk and in accordance with TikTok's Terms of Service.