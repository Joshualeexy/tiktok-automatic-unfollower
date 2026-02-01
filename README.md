# TikTok Unfollower 🚀

> **The Only Working TikTok Bulk Unfollower** — Unfollow your entire following list automatically. Yes, really.

This is a **one-of-a-kind automation tool** that does what TikTok deliberately makes impossible: bulk unfollow accounts. There's no API for this. No official way. Just pure Playwright browser automation that actually works.

## Why This Exists

TikTok doesn't give you the ability to bulk unfollow accounts. You'd have to manually click hundreds or thousands of unfollow buttons. This tool does it for you in minutes.

## What Makes This Different

✨ **Actually Works** — While countless "TikTok automation" tools out there are outdated or broken, this one navigates TikTok's real UI and handles their dynamic button detection  
🔄 **Session Smart** — Saves your authenticated session so you don't have to log in every time  
📜 **Infinite Scroll Aware** — Automatically detects when you've reached the end of your following list  
🎯 **Precise Clicking** — Overcomes TikTok's pointer-events tricks and actually clicks the buttons  
🛡️ **Production Ready** — Error handling, validation, and proper cleanup included

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn package manager
- A TikTok account

## Installation

Dead simple. Three steps.

```bash
# 1. Get the code
git clone <repository> && cd tiktok-unfollow

# 2. Install Playwright (the heavy lifter)
npm install

# 3. You're done
```

That's it. You've got the most powerful TikTok unfollowing tool ever created.

## Usage

One command. One username. Watch the magic happen.

```bash
node unfollow.js <username>
```

### Example

```bash
node unfollow.js cristiano  # Unfollow everyone from Cristiano's following list
```

### First Run: One-Time Setup

The first time you run it, the script needs to authenticate:

1. **Browser opens** → TikTok login page appears
2. **You log in** → Use your actual TikTok credentials  
3. **Navigate home** → Go to your ForYou feed after logging in
4. **Auto-save** → The script detects you're authenticated and saves your session

That's it. Next time you run the tool, it'll use your saved session. No more logins. Ever.
 (The Magic Inside)

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Authentication                                       │
│ Loads your saved session from cookies.json (or logs you in)  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 2: Target Profile                                       │
│ Navigates to @username's TikTok profile                      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 3: Following List                                       │
│ Opens their following list (the part TikTok hides by default)│
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 4: The Unfollowing Loop                                 │
│ • Searches for "Following" buttons (data-e2e selector)      │
│ • Overcomes TikTok's CSS tricks (pointer-events bypass)     │
│ • Clicks each one with 1-2 second delays (stealth mode)     │
│ • Auto-scrolls as it goes                                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 5: Scroll Detection                                     │
│ Checks if new buttons loaded (repeats step 4)               │
│ Stops after 3 empty checks = you've unfollowed everyone     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 6: Cleanup                                              │
│ Reports how many accounts you unfollowed, closes browser    │
└─────────────────────────────────────────────────────────────┘
```ist
3. **Unfollowing**: Finds all "Following" buttons and clicks them
4. **Infinite Scroll**: Automatically scrolls and detects when no new buttons load (3 consecutive checks)
5. **Legal Stuff (Read This)**
- TikTok's Terms of Service officially prohibits automation tools
- Using this tool violates their ToS — use at your own risk
- TikTok could suspend or ban your account (they probably won't for this, but they *could*)
- This is provided for educational purposes only
- The author takes **zero responsibility** if your account gets nuked

🔒 **Keep Your Cookies Safe**
- `cookies.json` contains your authenticated session — treat it like a password
- Never, ever share it with anyone
- Don't commit it to public repositories
- If you think it's been compromised, delete it and regenerate (script will ask you to log in again)

| Problem | Solution |
|---------|----------|
| **"Username is missing"** | You forgot to provide a username. Try: `node unfollow.js username` |
| **"Invalid username format"** | Only use letters, numbers, dots, and underscores in usernames |
| **Script hangs after login** | It's waiting for you to navigate to the ForYou page. Do that manually and it'll continue |
| **No buttons found** | Either the user has a private account or an empty following list |
| **Browser crashes** | TikTok's page might be broken. Try again in a few minutes |
| **Unfollowing is slow** | The 1-2 second delays are intentional (stealth). Don't change them unless you want to get caught |
| **Getting blocked** | TikTok might rate-limit you. Wait a few hours and try again |

⚠️ **Use Responsibly**
- TikTok's Terms of Service may restrict automation tools
- Use at your own risk
- Consider rate limiting by using appropriate wait times
- Do not use this to spam or harass other users

🔒 **Security**
- Keep your `cookies.json` file private
- Do not share your cookies with others
- Regenerate cookies if you suspect compromised authentication

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

Use it. Don't abuse it. And for the love of all that is holy, **read the warnings above**.

## License

MIT License — Do whatever you want with this code. Just don't blame me if it breaks.

See [LICENSE](LICENSE) for the legal text.

## Disclaimer (Seriously, Read This)

⚡ **This tool is not affiliated with TikTok, ByteDance, or any TikTok entity**

⚡ **Using automation tools on TikTok violates their Terms of Service**

⚡ **TikTok can and will ban accounts that use automation tools**

⚡ **The author assumes ZERO responsibility for anything that happens to your account**

⚡ **This is provided for educational purposes only**

If your account gets suspended, deleted, or shadow-banned, that's on you. Not me.

---

**Made with ❤️ for people who are tired of clicking.**