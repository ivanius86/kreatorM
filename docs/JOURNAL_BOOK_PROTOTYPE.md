# Journal book prototype — 2026-11-13

This is a visual experiment approved separately from the final Journal 2.0
implementation. It is available in **Dnevnik / Journal**. The previous static
Journal remains available in a collapsed details section.

## Scope and architecture

- Current artwork: the three PNGs from `Downloads/knjigice`, copied unchanged
  to `assets/journal/book-prototype/knjigice/` as `closed.png`, `half-open.png`
  and `open.png`. The earlier WebP source files remain unused and untouched.
- A standalone `JournalBookAnimation` controller, full open/close duration
  240 ms, with the middle image shown for about 38 ms in either direction,
  one requestAnimationFrame loop, continuous reversal, cancellation,
  reduced-motion handling and static fallback. All three images are decoded
  before interaction; a failed sequence uses the available endpoint images.
  Loading is bounded to 15 seconds and can be retried.
- A separately lazy-loaded UI, fixed-ratio canvas and real HTML textareas over
  the open pages. The fields retain their DOM identity across animation,
  navigation and language changes. Nothing is written into the artwork.
- When the left page fills, its overflow is prepended to the right page and
  the caret follows when writing at the end. Measurement uses an invisible
  disabled twin, keeping the live field intact. Word/grapheme boundaries,
  existing right-page text, IME input and immediate undo are preserved. The
  prototype still has two pages; no additional spreads are created. Scrollbars
  and the dashed writing outline are removed; the initial prompt is "Počni ovde".
- On narrow screens, the same fields appear as a single readable sheet below
  the artwork, with first/second page controls. This is a prototype compromise,
  not the final mobile book editor.
- Text stays only in page memory. Closing/reopening the book or navigating
  inside the app retains it. Reloading the document loses it. A best-effort
  beforeunload guard and UTF-8 text download remain available. No permanent
  save is claimed.
- No localStorage/IndexedDB domain, schema migration, AI request, library,
  page manager, drawing, media editor, reflection engine or theme system.

The main app adds only the mount, scoped stylesheet, lazy feature registration,
and activation/deactivation calls. Nutrition and Goal Creator behavior is not
modified. The legacy textarea translation now targets its stable ID so it does
not target a new book page by DOM order.

## Known artwork limitations

The three supplied PNGs are displayed at their original aspect ratios inside
the 1280×850 canvas. The intermediate and open images include their supplied
backgrounds; this prototype does not retouch them. The open stage grows over
100 ms on desktop, with reduced motion respected. A faint masked blur overlay
affects only the artwork edges while opening/closing; the page editor remains
sharp. The middle image additionally uses a full-image 7 px blur and a 10 px
blurred horizontal trail, reversed on closing, to read as motion rather than
a held pose. Reduced motion disables these effects. The existing page fields
scale with the artwork. A three-image transition remains a visual prototype,
not a continuous 3D opening. Responsive 4K layout does not create native 4K
artwork. Replace images later without changing the timeline controller.

## Final Journal 2.0 boundary

Do not use the prototype's two textareas as a persistence model. The future
logical model is Book → ordered Pages → typed Elements, with separate asset
references and optional Metadata/Reflections. These are logical boundaries,
not a decision to create six stores. Page coordinates should be normalized;
media belongs in the existing Blob-capable data layer, never a Base64 document.
Dashboard should eventually open a book/page by ID, using the same cover
descriptor and editor service; no dashboard integration is implemented here.

The smallest production step remains a separately reviewed schema upgrade,
strict compatibility for older backups, new-domain write guards and tests for
upgrade/restore/concurrent writes. No fake legacy Journal source or migration
marker should be created. Saving must be durable before reporting success.
After that: book CRUD, page/text persistence, creative elements, then optional
user-selected metadata/reflection. A visual prototype does not satisfy any of
those durability milestones.

## Checks

- `npm run test:journal` — deterministic timeline, reversal, duplicate commands,
  cancellation, reduced motion, missing/decode-failed frames and aborted loads.
- `npm run test:journal:browser` — isolated Chromium profile; real supplied
  images, open-book enlargement, editor timing, typing/focus and language changes,
  direction changes, cancellation, session retention, UTF-8 export, blocked-frame
  fallback/retry, responsive 720p/1080p/4K/mobile, no durable-domain changes or
  provider POSTs. Screenshots/downloads go into ignored `.tools/`.
- In this checkout Node can be run through
  `.tools/node-v24.22.1-win-x64/node.exe` when not on PATH.

Manual check: open Dnevnik, click the cover, type on both pages, close/reopen,
reverse with the open/close button, switch SR/EN and visit another app screen.
Download text before refreshing. Try mobile page controls and OS reduced motion.
Evaluate the feel of the supplied animation separately from the unfinished
production Journal functionality.
