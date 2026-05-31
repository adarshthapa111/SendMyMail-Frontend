# Feature: Design system — change log

> The reusable component kit. Every page composes from here.
> Lives in `src/components/ui/` with SCSS Modules in `src/styles/components/ui/`.
> All components reference our v2 warm tokens — either via Tailwind utilities
> (mapped from the `@theme` block in `src/index.css`) or via `var(--token)` in SCSS.

## Scope

**Components in this PR (17 atoms + 1 composite):**

| Component | Purpose | Styling |
|---|---|---|
| **`Icon`** | Wrapper around `@tabler/icons-react` with size/color props | Tailwind |
| **`Heading`** / **`Text`** / **`Eyebrow`** | Display vs body type — Bricolage for headings, General Sans for body | Tailwind + `.display` class |
| **`Pill`** | Status badge with semantic variants (green/amber/red/blue/gray/purple) + optional dot | SCSS Module |
| **`Avatar`** | Initials avatar with sm/md/lg sizes + gradient background | SCSS Module |
| **`Card`** | Base surface — `bg-card` + border + rounded + shadow + padding variants | Tailwind |
| **`Field`** | Label + helper + error wrapper around any input | Tailwind |
| **`Button`** | Primary / secondary / ghost / danger × sm/md/lg, with icon + loading state | SCSS Module |
| **`Input`** | Text/email/password/number — with optional prefix/suffix slot | SCSS Module |
| **`Textarea`** | Multi-line input | SCSS Module |
| **`Select`** | Native select with our custom chevron | SCSS Module |
| **`Checkbox`** | Native checkbox with warm accent | SCSS Module |
| **`Switch`** | Animated on/off toggle (per settings.html notif prefs) | SCSS Module |
| **`Note`** | Inline alert with info/success/warning/danger variants | SCSS Module |
| **`EmptyState`** | Centered icon + title + subtitle + optional action | Tailwind |
| **`Spinner`** | Loading indicator (sm/md), warm tone | SCSS Module |
| **`Divider`** | Horizontal hairline (`--line-soft`) | Tailwind |
| **`PageHeader`** | Title + subtitle + right-aligned actions slot (the `.head` pattern from mockups) | Tailwind |

**NOT in this PR (separate work, build when first needed):**
- Modal / Dialog — needs focus trap, escape key, portal — bigger lift
- Tooltip — small but needs floating-ui-style positioning
- Dropdown / Menu — UserMenu in shell is a one-off; a generic Menu primitive comes later
- Tabs — settings.html has its own; generalize when 2nd consumer appears
- DataTable — Table component is a wrapper for now; full feature-rich one later
- Toast — already covered by `react-hot-toast`; wrap if/when the API grows
- DatePicker — when the campaign scheduler needs it
- Combobox — when the audience picker needs it

## Acceptance criteria

- [ ] Every component is fully typed (TypeScript `interface Props`)
- [ ] Form inputs use `forwardRef` so external refs work (and `react-hook-form` plugs in later)
- [ ] Native HTML attrs spread via `...rest` so consumers can pass `name` / `id` / `aria-*` etc.
- [ ] No hardcoded hex — only `var(--token)` (in SCSS) or Tailwind utilities mapped from `@theme`
- [ ] No `bg-blue-500` / Tailwind defaults — token utilities only
- [ ] All components exported from `src/components/ui/index.ts` (barrel)
- [ ] `npm run build` passes
- [ ] At least one variant of each component is used in the placeholder pages (smoke test)

## Dependencies

Nothing new. Uses what's already installed:
- `@tabler/icons-react` — icon set
- `react` 19 — `forwardRef`, ref types
- `react-hot-toast` — Spinner uses this for promise-toasts later

## Decisions

- **`forwardRef` on inputs only** — not on display-only components (Card, Pill, Heading) where refs aren't useful. Keeps the others terse.
- **Native HTML over abstracted props** — `<Input type="email" />` over `<EmailInput />`. Closer to the platform, less invention.
- **SCSS Modules for state-heavy components, Tailwind for simple wrappers** — Button needs state machines (hover/focus/disabled/loading); Card just needs `bg-card border rounded-lg shadow p-6`. Pick per-component.
- **Sizes are `sm` / `md` / `lg`** — three is enough for V1. Default is `md` everywhere.
- **No size prop on Pill** — they're already small; if you need a bigger one, use Note.
- **Avatar gradients are passed as a `gradient` prop, not derived** — caller controls the look so the same person looks the same everywhere. Hash-derived gradients come later if needed.
- **`Field` wraps inputs (label + helper + error) rather than each input having its own label prop** — keeps Input/Textarea/Select small, supports composing them with any wrapper later.

## Changes (newest first)

### 2026-05-31 · ✅ Done — full kit shipped

**What landed: 17 component files + 11 SCSS modules + 1 barrel index = 29 new files** under `src/components/ui/` and `src/styles/components/ui/`.

| File | What's exported |
|---|---|
| `Icon.tsx` | `Icon` — wrapper around any `@tabler/icons-react` component with `size` / `title` / `className` |
| `Typography.tsx` | `Heading` (level 1-3, sizes xs-2xl, Bricolage) · `Text` (as p/span/div, tones ink/muted/soft/primary/green/amber/red, optional `tabular`) · `Eyebrow` (small-caps tracked-out label) |
| `Avatar.tsx` | `Avatar` — sizes sm/md/lg/xl, `initials` or `src` image, `gradient` background, `round` modifier |
| `Pill.tsx` | `Pill` — variants gray/green/amber/red/blue/purple/indigo + optional `dot` |
| `Card.tsx` | `Card` — padding none/sm/md/lg, shadow sm/md |
| `Field.tsx` | `Field` — `label` + `hint` + `helper` / `error` / `success` wrapper |
| `Input.tsx` | `Input` (forwardRef) — `invalid`, `prefix`, `suffix`, native input attrs spread |
| `Textarea.tsx` | `Textarea` (forwardRef) — `invalid`, native textarea attrs |
| `Select.tsx` | `Select` (forwardRef) — `invalid`, custom warm chevron, native select attrs |
| `Checkbox.tsx` | `Checkbox` (forwardRef) — label as children |
| `Switch.tsx` | `Switch` (forwardRef) — animated on/off toggle with optional inline `label` |
| `Button.tsx` | `Button` (forwardRef) — variants primary/secondary/ghost/danger, sizes sm/md/lg, `leading`/`trailing` icons, `block`, `loading` (built-in spinner) |
| `Note.tsx` | `Note` — variants info/success/warning/danger/neutral, auto-picked icon (overridable) |
| `EmptyState.tsx` | `EmptyState` — icon + title + description + optional action |
| `Spinner.tsx` | `Spinner` — sizes sm/md/lg, inherits color |
| `Divider.tsx` | `Divider` — weight soft/normal/strong, spacing override |
| `PageHeader.tsx` | `PageHeader` — title + subtitle + actions + optional back |
| `index.ts` | Barrel re-exports for `import { ... } from '...components/ui'` |

**Deferred (build when first needed):** Modal, Tooltip, Dropdown/Menu, Tabs, DataTable, Toast-wrapper, DatePicker, Combobox.

---

## Usage examples

### Basic auth form (Login)
```tsx
import { Card, Heading, Text, Field, Input, Button, Checkbox } from '@/components/ui';
import { IconBrandGoogle, IconArrowRight } from '@tabler/icons-react';

<Card padding="lg">
  <Heading level={1} size="xl" className="mb-1">Welcome back.</Heading>
  <Text tone="muted" className="mb-6">Sign in to your agency workspace.</Text>

  <Button variant="secondary" block leading={<IconBrandGoogle size={16} />} className="mb-4">
    Continue with Google
  </Button>

  <Field label="Email">
    <Input type="email" placeholder="you@youragency.com" />
  </Field>

  <Field label="Password" helper="Forgot it? Reset via email.">
    <Input type="password" />
  </Field>

  <Checkbox defaultChecked className="mb-5">
    Keep me signed in for 30 days
  </Checkbox>

  <Button variant="primary" block size="lg" trailing={<IconArrowRight size={16} />}>
    Sign in
  </Button>
</Card>
```

### Page with header + table card
```tsx
import { PageHeader, Card, Button, Pill, Avatar } from '@/components/ui';
import { IconPlus, IconDownload } from '@tabler/icons-react';

<>
  <PageHeader
    title="All clients"
    subtitle="8 clients · 41,062 contacts · 142,338 emails sent this month"
    actions={
      <>
        <Button leading={<IconDownload size={14} />}>Export</Button>
        <Button variant="primary" leading={<IconPlus size={14} />}>Add client</Button>
      </>
    }
  />
  <Card padding="none">
    {/* table inside */}
  </Card>
</>
```

### Settings notification preference row
```tsx
import { Switch, Text } from '@/components/ui';

<div className="flex items-center justify-between py-3 border-t border-line-soft">
  <div>
    <Text className="font-semibold">Campaign sent</Text>
    <Text size="xs" tone="soft">When a scheduled campaign finishes sending</Text>
  </div>
  <Switch defaultChecked />
</div>
```

### Empty state on a fresh contacts page
```tsx
import { EmptyState, Button } from '@/components/ui';
import { IconAddressBook, IconUpload } from '@tabler/icons-react';

<EmptyState
  icon={IconAddressBook}
  title="No contacts yet"
  description="Import a CSV, connect WooCommerce, or paste a list — we'll dedupe and reject role accounts automatically."
  action={
    <Button variant="primary" leading={<IconUpload size={14} />}>
      Import contacts
    </Button>
  }
/>
```

### Status pills
```tsx
import { Pill } from '@/components/ui';

<Pill variant="green" dot>Verified</Pill>
<Pill variant="amber" dot>Pending</Pill>
<Pill variant="red">3 errors</Pill>
<Pill variant="blue">Scheduled</Pill>
<Pill variant="purple">Owner</Pill>
```

### Note (info / warning / danger)
```tsx
import { Note } from '@/components/ui';

<Note variant="warning">
  <b>Bounce rate climbing</b> on Pashmina Co. Consider list cleanup.
</Note>
```

### Button states
```tsx
<Button variant="primary">Save changes</Button>
<Button variant="primary" loading>Saving…</Button>
<Button variant="primary" disabled>Save changes</Button>
<Button variant="ghost">Cancel</Button>
<Button variant="danger" leading={<IconTrash size={14} />}>Delete</Button>
```

### Avatar
```tsx
<Avatar size="md" initials="KS" gradient="linear-gradient(145deg,#27B98A,#149068)" />
<Avatar size="lg" round initials="PK" gradient="linear-gradient(150deg,#7A71D8,#4B43A8)" />
<Avatar size="sm" src="/uploads/aastha.jpg" alt="Aastha" round />
```

---

## Conventions to follow when adding new components

- **TypeScript-first** — `interface Props extends HTMLAttributes<...>` and spread `...rest` so callers can pass `id` / `aria-*` / `data-*`.
- **`forwardRef` only when a ref makes sense** — all form inputs do (for `react-hook-form` and focus management); display-only components don't.
- **Sizes are `sm` / `md` / `lg`** — `md` is the default.
- **Variants use semantic names** — `primary` / `secondary` / `ghost` / `danger`, never `purple` / `red` as a variant for actions.
- **One token always wins** — never accept arbitrary colors as props; map to a semantic variant or extend the variant union.
- **SCSS Modules for state machines, Tailwind for layout** — see [tech_stack.md §2 Styling](../../doc/tech_stack/tech_stack.md).
- **Export from the barrel** — every new component goes in `src/components/ui/index.ts` so import paths stay one-line.

### 2026-05-31 · 📋 Planning — scope locked, ready to implement

17 component files + 17 matching SCSS modules (where needed) + a barrel `index.ts`. ~35 new files.

Estimated time: half a day. No blockers.
