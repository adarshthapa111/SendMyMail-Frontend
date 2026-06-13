# Fix: selection toolbar clipped for top blocks

## Status: ✅ Done — 2026-06-13

## Symptom
Selecting a block near the TOP of the email (e.g. the first header
section) showed the floating action toolbar clipped/hidden — it floats
38px above the block (`top: -38px`), which overflows the canvas scroll
edge and sits under the BuilderTopBar.

## Root cause (user-diagnosed: "it's the hidden overflow")
The real clipper was `.frame { overflow: hidden }` in
`styles/components/Canvas.module.css` — the email content lives inside
`.frame`, so the toolbar floating at `top: -38px` above the FIRST
section was cut by the frame's overflow box (not the canvas scroll).
That overflow:hidden only existed to clip content to the card's ROUNDED
corners — but the desktop card is square now (`border-radius: 0`), so it
was clipping for nothing. (Note: z-index can't escape overflow:hidden —
the fix had to be the overflow, not stacking.)

## Fix
- `styles/components/Canvas.module.css` — `.frame { overflow: visible }`
  (was hidden); `.columnMobile .frame { overflow: hidden }` keeps the
  clip for the mobile phone-bezel rounding only. THIS is the core fix.
- `src/canvas/SelectionToolbar.tsx` — secondary: a slide so the toolbar
  also stays visible when a LOWER block is scrolled up to the canvas
  top (where the canvas's own `overflow: auto` would clip). Measures
  room above (block top − canvas top) on scroll/resize and sets the
  toolbar's `top` = `max(-38, 4 − room)` so it pins just under the
  canvas edge instead of going under the BuilderTopBar. Hooks declared
  before the early returns so they run unconditionally.

## Verify
Live (headless Chrome): scroll to top, select the first block →
toolbar top 60px, canvasTop 56px → `clipped: false`, and the header
text is NOT overlapped (toolbar floats above in the canvas padding).
tsc clean, build clean, lint at 12 = pre-existing baseline.
