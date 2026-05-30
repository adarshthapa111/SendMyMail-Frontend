# Setup

> ⚙️ Everything you need to go from "I just got handed this repo" to a running
> dev server. Two paths:
> [§A — Cloning an existing repo](#a-cloning-an-existing-repo) (the common case)
> · [§B — Initial repo creation](#b-initial-repo-creation-one-time) (a one-time
> reference of how this repo got pushed to GitHub the first time).

## Prerequisites

| Tool | Version | Why |
|---|---|---|
| **Node.js** | 20.x or 22.x LTS | Vite 8 requires Node ≥ 20. Use [nvm](https://github.com/nvm-sh/nvm) — `nvm install 22 && nvm use 22`. |
| **npm** | comes with Node | Or `pnpm` / `yarn` if you prefer; lockfile is `package-lock.json` today. |
| **Git** | 2.30+ | Anything modern. |
| An editor with **TypeScript** support | — | VS Code recommended; the repo includes settings under `.vscode/`. |

```bash
node -v   # → v22.x.x (or v20.x.x)
npm -v    # → 10.x.x
git --version
```

---

## A. Cloning an existing repo

For new contributors / new machines.

### 1. Clone

```bash
git clone https://github.com/<owner>/sendmymail-frontend.git
cd sendmymail-frontend
```

### 2. Install dependencies

```bash
npm install
```

This pulls everything in `package.json` — see [doc/tech_stack/tech_stack.md](../tech_stack/tech_stack.md) for what each dep is for.

### 3. Set up environment variables

Copy the example file and fill in the values:

```bash
cp .env.example .env.local
```

Required for any rendering / API call to work:

| Variable | What it is | Example |
|---|---|---|
| `VITE_BACKEND_URL` | Base URL of the backend API (compiles MJML → HTML, all CRUD) | `https://api.sendmymail.io` |

Optional (add as features come online — see [doc/architecture/api-conventions.md](../architecture/api-conventions.md) and [doc/tech_stack/tech_stack.md §2](../tech_stack/tech_stack.md)):

| Variable | What it is |
|---|---|
| `VITE_SENTRY_DSN` | Sentry project DSN for error monitoring |
| `VITE_POSTHOG_KEY` | PostHog project key for product analytics |
| `VITE_POSTHOG_HOST` | PostHog host (`https://app.posthog.com` or self-hosted) |

`.env.local` is gitignored and stays on your machine. Never commit `.env*` files with real secrets.

### 4. Run it

```bash
npm run dev
```

Opens at `http://localhost:5173` with HMR.

### 5. Useful commands

```bash
npm run dev        # dev server with hot reload
npm run build      # type-check (tsc -b) then production build to dist/
npm run lint       # ESLint over the whole repo
npm run preview    # serve the production build locally
```

`npm run build` is the **type-correctness gate** — green build = your changes type-check.

### 6. Where to go next

| You want to… | Read |
|---|---|
| Understand the codebase | [CLAUDE.md](../../CLAUDE.md) |
| Know where files go | [doc/folder_structure/folder_structure.md](../folder_structure/folder_structure.md) |
| Style anything | [doc/theme/theme.md](../theme/theme.md) |
| Wire up a feature | [doc/architecture/](../architecture/) (routes, state, API conventions, auth) |
| Find a feature's spec | [doc/implementation_doc/](../implementation_doc/) |
| Browse the visual contract | [doc/mockups/](../mockups/) (open any `.html` in a browser) |

---

## B. Initial repo creation (one-time)

How this repo was first pushed to GitHub. Keep this section for posterity / disaster recovery.

### 1. Initialize git *inside* the project folder

⚠️ Check first that `.git` doesn't already live higher up the tree (a stray home-folder `git init` will hijack the project):

```bash
cd /path/to/sendmymail-frontend
git rev-parse --show-toplevel
# → should print /path/to/sendmymail-frontend
# If it prints your home directory or anything else, run:
git init
# This creates a local .git that takes precedence.
```

### 2. Verify `.gitignore`

Default Vite ignores cover `node_modules`, `dist`, `.DS_Store`, editor folders. Add env-file ignores before the first commit:

```bash
printf '\n# Environment files (never commit secrets)\n.env\n.env.*\n!.env.example\n' >> .gitignore
```

This ignores any `.env` / `.env.local` / `.env.production` but keeps `.env.example` (the committed template).

### 3. First commit

```bash
git add .
git status              # eyeball the list — no node_modules, no .env, no dist/
git commit -m "Initial commit: MJML email builder + V1 documentation"
```

### 4. Create the empty GitHub repo

On the web (`gh` CLI optional):

1. Go to **https://github.com/new**
2. **Repository name:** `sendmymail-frontend`
3. **Description:** *Multi-tenant email marketing platform for Nepali digital agencies — visual MJML builder, ESP integrations, white-label, NPR billing.*
4. **Visibility:** Private (recommended until launch) or Public
5. **CRITICAL — do NOT check** "Add a README", "Add .gitignore", or "Choose a license". You already have all of these locally; letting GitHub create them causes a merge conflict on first push.
6. Click **Create repository**

**Topics** (the tags below "About"):
```
email-marketing  mjml  mjml-editor  react  typescript  vite
redux-toolkit  multi-tenant  saas  white-label  nepal
```

### 5. Connect local → remote and push

GitHub shows a "push an existing repository" snippet. Run these (substituting `YOURUSER`):

```bash
git remote add origin https://github.com/YOURUSER/sendmymail-frontend.git
git branch -M main
git push -u origin main
```

The `-u` flag sets the upstream so future `git push` / `git pull` need no arguments.

### 6. Verify

```bash
git status        # → On branch main · nothing to commit, working tree clean
git remote -v     # → origin https://github.com/YOURUSER/sendmymail-frontend.git (fetch+push)
git log --oneline # → your initial commit
```

Refresh the repo page on github.com — you should see the file tree.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `git status` warns about `Pictures/` or `.Trash/` | `.git` lives in your home directory, not the project | `cd` into the project and run `git init` — the local `.git` overrides the parent. |
| `npm run dev` fails with `Cannot find module 'sass'` | SCSS Modules added but `sass` not installed yet | `npm install -D sass` (see [doc/tech_stack/tech_stack.md §2](../tech_stack/tech_stack.md)) |
| `npm run build` fails on a fresh clone | TypeScript project refs out of sync | Try `rm -rf node_modules tsconfig.tsbuildinfo && npm install && npm run build` |
| Pre-commit hook complains about formatting | Prettier (when added) — let it auto-fix | `npm run format` then re-stage and re-commit |
| Production build is too big | Check the bundle visualizer (when added) or split a heavy route into its own chunk | See [doc/architecture/routes.md §5](../architecture/routes.md#5-code-split-boundaries) for the planned split points |

If something blocks you that isn't here, fix it and **add a row to this table in the same PR** — that's how the doc stays useful.
