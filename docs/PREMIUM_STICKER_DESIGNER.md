# Premium Live Sticker Designer

The Research Add menus now open a centered Designer. Custom starts empty; templates configure the same section model. The left preview calls the existing `renderResearchCanvasCard` function and the same modular section renderer as saved grid/focus cards. The shell is capped at 1040 px; its sticker is approximately 316 px wide. Small screens stack the two panels.

## Boundaries and storage

- `js/research/research-sticker-core.js`: version 1 document adapter, validation, ordering, owner compatibility, stable identities and media references.
- `js/research/research-sticker-sections.js`: shared sections, accordions, media hydration and cleanup.
- `js/research/research-sticker-editors.js`: content editor controls and updates.
- `js/research/research-sticker-designer.js`: isolated draft, preview updates, templates, section drag/reorder, Save/Cancel and session cleanup.
- `research-sticker-designer.css`: scoped layout and opt-in modular sticker styles.
- `js/i18n/research-sticker-designer.js`: SR/EN copy under `research.designer`.

The optional canonical map is `idea.pathData.researchCanvasStickerDocuments[cardKey]`. Keys remain existing item/reference/note keys. Old cards without a document retain their existing renderer and behavior. Opening an old card creates only a local draft. Legacy note IDs materialize before mutations so deleting an earlier sibling does not shift saved card keys. Invalid/newer documents remain intact and render through the legacy fallback; the Designer refuses to overwrite them.

Save stages Files through the existing media repository, then commits the owner, document and compatible legacy fields together through `saveIdeas`. A failed Save keeps the draft open. Known rollback removes newly staged unreferenced blobs; uncertain partial writes preserve them. The legacy two-key ideas repository rolls its ideas domain back without overwriting concurrent finance/calendar data. Media cleanup waits for overlapping saves and checks confirmed repository data. Removing references, notes, directions and ideas prunes documents with their owners. No migration runs on page load.

Image framing stores contain/cover, zoom, position and rotation without rewriting the original. Gallery media and file assets use the existing media repository. PDF/DOCX/TXT use the existing readers; other source files, including Excel and DWG, download. A/V capture opens the existing recorder form and sends its File to the draft; main Save owns persistence. Browser microphone/camera permission and codec support still apply.

Unit data contains stable measurement IDs, numeric values, dimension, unit and optional property name. Existing unambiguous measurements adapt to structured data; ambiguous old values remain visible as legacy text. Finance engine entries keep their specialized editing flow. No analytics, themes, framework change or metadata extraction service is added.

## Acceptance checks

Use a test idea and an isolated browser profile. These checks do not require sample records in the app.

1. Add Custom, then Image, Notes and Media. Upload an image and type notes. One preview updates immediately; typing retains the input and other media DOM nodes.
2. Reorder Notes and Media by the drag handle and by keyboard up/down buttons. The preview order follows the actual section array.
3. Collapse a preview section; collapse the whole sticker. Editor accordions, section visibility and parent/child graph collapse are independent.
4. Expand long notes and galleries. Height follows content; preview and builder scroll inside the centered shell.
5. Open Media and Notes templates. Their corresponding editor is ready; switching templates preserves entered sections.
6. Add A/V. Record audio and video through the existing dialog; save each recording into the draft. Escape closes the recorder/viewer before the Designer. Cancel releases tracks and temporary URLs.
7. Drop or paste image, URL and text on the canvas. Existing detection/title extraction prepares a populated draft; no owner is saved before main Save. Cancel leaves the canvas unchanged.
8. Save multiple sections, image framing, measurement values and reordered media. Reload; compare order, content, settings and collapse state.
9. Edit an existing item, reference, linked note and direction note. Save retains the same key, position, group membership and graph relationships; Cancel retains the old data.
10. Check old cards, parent/child links, groups, zoom, panning and finance entry points. Fullscreen opens the existing viewer without resizing the grid.

Automated coverage is in `tests/research-sticker-designer.test.js`; run it with `npm run test:research`. Tests cover document/model reload, owner identities, structured units and legacy display, ordering, cancellation isolation, shared rendering safety, confirmed-save retries, media cleanup races, cross-domain rollback and malformed data protection. Existing Research, storage and nutrition suites remain the regression boundary.

## Verification completed

`npm test` passes all **201 tests**: 37 storage, 33 nutrition, and 131 Research tests (including 20 Designer tests). The existing Research fixtures were updated to model actual DOM `closest`, `classList`, event removal and bounding rectangles; cross-context rollback values are compared as data. Preview actions and scale expectations now match the existing focus and depth-scale behavior. A missing null guard in connection-settle rendering was also fixed.

Chrome checks used a separate temporary browser profile and test records, without accessing user browser storage. Verified Custom with uploaded Image, Notes, Media, Link and Unit; stable input/preview/workspace DOM while typing; drag ordering; independent collapses; Save, reload, Cancel and same-ID edit; all templates; image/URL drops and text paste; fullscreen image viewing; nested Escape handling; multiple source files and the existing text reader; parent/child and group preservation; Serbian translations. Audio and video recording were verified through the existing recorder using Chrome's test media devices.

Desktop-to-mobile resizing preserves the open draft and editor node identity. The dialog fits a 390 x 844 CSS-pixel viewport even when the underlying legacy page overflows horizontally. The desktop dialog remains capped at 1040 px, with a preview sticker approximately 315 px wide. Physical microphone/camera behavior depends on the user's browser permissions and devices.

## Files changed

- `js/research/research-sticker-core.js`, `research-sticker-sections.js`, `research-sticker-editors.js`, `research-sticker-designer.js`: shared model, rendering, editors and draft session.
- `research.js`, `brainstorming.js`, `research-attachments.js`: existing UI, persistence, recording and viewer integration.
- `js/research/research-model.js`, `research-organizer.js`, `research-persistence.js`, `research-external-drop.js`: identities, creation menus, persistence forwarding and import drafts.
- `js/data/repositories/ideas.repository.js`: failure-safe legacy ideas writes.
- `research-sticker-designer.css`, `js/i18n/research-sticker-designer.js`: scoped appearance, responsiveness and Serbian/English text.
- `index.html`, `lazyLoader.js`: stylesheet and script loading.
- `tests/research-sticker-designer.test.js`, `tests/research-canvas.test.js`, `package.json`: regression coverage and test command.
- `docs/PREMIUM_STICKER_DESIGNER.md`: design boundaries, acceptance instructions and verification results.
