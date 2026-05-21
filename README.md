# The Phone Shot-Planner — how to put it online

This folder is a complete, ready-to-deploy version of your shot-planner tool.
Once it's live, anyone with the link can use it — and the planner will actually
generate plans, because your secret API key lives safely on the server (never
in the visitor's browser).

You do NOT need to know how to code to deploy this. Follow the steps below.

---

## What's in this folder

- `public/index.html` — the whole tool (the page people see and use)
- `public/logo.png` — your Film Truth Productions logo
- `api/generate.js` — the small server function that talks to Claude using your
  secret key
- `package.json`, `.gitignore` — housekeeping files Vercel needs

You don't need to open or edit any of these. Just deploy the folder as-is.

---

## Step-by-step: deploy to Vercel (free)

### 1. Get an Anthropic API key
This is the secret that lets the tool talk to Claude. It is separate from your
Claude.ai chat subscription.

1. Go to **https://console.anthropic.com**
2. Sign in (or create an account).
3. Add a small amount of billing credit (the planner costs a fraction of a cent
   per use, so a few dollars goes a very long way).
4. Open **API Keys**, click **Create Key**, and copy the key it gives you.
   It starts with `sk-ant-`. Keep it somewhere safe — you'll paste it in Step 4.

### 2. Make a free Vercel account
1. Go to **https://vercel.com**
2. Click **Sign Up**. Signing up with email is fine; with GitHub is also fine.

### 3. Upload this folder to Vercel
The simplest way, no GitHub required:

1. Install Vercel's helper on your computer. Open the **Terminal** app
   (on a Mac: press Cmd+Space, type "Terminal", hit Enter) and paste:
   ```
   npm install -g vercel
   ```
   (If it says `npm: command not found`, first install Node from
   https://nodejs.org — get the "LTS" version — then try again.)

2. In Terminal, go into this folder. Type `cd ` (with a space), then drag this
   folder from Finder into the Terminal window and hit Enter. It'll look like:
   ```
   cd /Users/you/Downloads/shot-planner
   ```

3. Type:
   ```
   vercel
   ```
   It will ask a few questions — press Enter to accept the defaults each time.
   When it finishes, it prints a link like `https://shot-planner-xxxx.vercel.app`.
   The page will load, but the "Build My Shot Plan" button won't work YET —
   that's expected until you add your key in the next step.

### 4. Add your secret key to Vercel
1. Go to **https://vercel.com/dashboard** and click your new project.
2. Click **Settings** → **Environment Variables**.
3. Add one:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** paste the `sk-ant-...` key from Step 1
4. Click **Save**.

### 5. Re-deploy so the key takes effect
Back in Terminal, in the same folder, type:
```
vercel --prod
```
This publishes the final version. The link it gives you now is your real,
shareable link — the planner will fully work for anyone who visits.

---

## Putting it on film-truth.com

Two easy options once it's live on Vercel:

- **Link to it.** Add a button or menu item on film-truth.com that points to your
  Vercel link. Easiest, works immediately.
- **Use a subdomain** like `tools.film-truth.com`. In your Vercel project, go to
  **Settings → Domains**, add `tools.film-truth.com`, and Vercel shows you the
  one DNS record to add wherever film-truth.com is registered. Then the tool
  lives at your own address.

---

## Keeping costs predictable
- Each plan generated costs roughly a fraction of a cent.
- To set a hard ceiling, go to the Anthropic console → **Billing** and set a
  monthly spend limit. If it's ever reached, the tool simply stops generating
  until the next month — it can't run up a surprise bill.

---

## If something doesn't work
- **Button spins then shows an error:** the key probably isn't set. Re-check
  Step 4 (exact name `ANTHROPIC_API_KEY`), then run `vercel --prod` again.
- **Logo doesn't show:** make sure `logo.png` is still inside the `public` folder.
- **"Save as PDF" does nothing:** your browser blocked the pop-up — allow pop-ups
  for the site, or use "Copy text" instead.
