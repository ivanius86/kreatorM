KreatorM — Journal book animation prototype

24 transparent WebP frames, 1280 x 850 canvas, 1 second at 24 fps.
frame_000.webp: original closed book, centered
frame_023.webp: original open book, centered
Intermediate frames: AI storyboard crops and interpolations. THESE ARE CONCEPT FRAMES, not polished final animation: ornament/shape jitter and blending may be visible.

Render on the same fixed container 1280:850 with object-fit:contain. Keep book centered.
Preload the frame sequence before triggering click. Use requestAnimationFrame to advance from 0 to 23 in 1000 ms.
For reverse use frames 23 to 0. Use existing canvas/IMG rendering with image decode caching.
Only enter the Journal editor after frame 23, and leave unchanged page background outside the canvas.

Included: preview.gif and original closed/open PNG files.
