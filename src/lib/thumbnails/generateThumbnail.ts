import { toPng } from 'html-to-image';
import { renderTemplate } from '../../api/renderTemplate';
import { uploadDataUrl } from '../cloudinary/upload';
import type { IMjmlNode } from '../../tree/types';

/**
 * Generates a real PNG thumbnail of an MJML template and uploads it to
 * Cloudinary. Returns the hosted URL on success, or null on any failure
 * (so callers can stay fire-and-forget without try/catch boilerplate).
 *
 * Pipeline:
 *   1. POST tree → /getHtml → compiled email HTML.
 *   2. Render that HTML in an offscreen iframe at a fixed width.
 *   3. Wait for the iframe's load + fonts + a tick to settle.
 *   4. html-to-image's `toPng` captures the iframe's <body> as a PNG
 *      data URL.
 *   5. Upload to Cloudinary (uses the existing unsigned-preset flow).
 *   6. Return Cloudinary URL.
 *
 * Caveats (intentionally accepted V1):
 *   - Email-client rendering ≠ Chromium rendering. The thumbnail is a
 *     "what you'd see in a modern webmail client" preview, not a
 *     byte-perfect Outlook 2013 render. Good enough for cards.
 *   - External images load best-effort. The iframe's CORS policy means
 *     some hot-linked images won't appear in the screenshot. Cloudinary
 *     URLs (the most common case after image uploads) load fine.
 *   - Render takes ~1-3 seconds depending on the template. Run from a
 *     background fire-and-forget after save — never block the user.
 */
export async function generateThumbnailUrl(tree: IMjmlNode): Promise<string | null> {
  try {
    // 1. Compile to HTML server-side (same path the iframe preview uses).
    const html = await renderTemplate({
      tree,
      format: 'html',
      operationType: 'preview',
    });

    // 2-4. Render in iframe + screenshot.
    const dataUrl = await captureHtmlAsPng(html);
    if (!dataUrl) return null;

    // 5-6. Upload + return URL.
    return await uploadDataUrl(dataUrl);
  } catch (err) {
    console.warn('[thumbnail] generation failed:', err);
    return null;
  }
}

/**
 * Renders the given HTML in an offscreen iframe and returns a PNG data
 * URL of its rendered body. Tears down the iframe regardless of outcome.
 *
 * Width is fixed at 600px (the standard email content width). Height
 * is computed from the rendered content so very long emails get the
 * full preview.
 */
async function captureHtmlAsPng(html: string): Promise<string | null> {
  const WIDTH = 600;

  /* Create the iframe far off-screen so it doesn't flash. */
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.top = '-10000px';
  iframe.style.left = '-10000px';
  iframe.style.width = `${WIDTH}px`;
  iframe.style.height = '800px';                  // initial height, resized post-load
  iframe.style.border = '0';
  iframe.style.background = '#ffffff';

  document.body.appendChild(iframe);

  try {
    /* Wait for the iframe document to be writable. */
    await new Promise<void>((resolve) => {
      iframe.addEventListener('load', () => resolve(), { once: true });
      const doc = iframe.contentDocument;
      if (!doc) {
        // Some browsers fire load before the doc is ready; poll once.
        setTimeout(() => resolve(), 50);
      } else {
        // Initial about:blank load — write content + the second load
        // event fires for the new document.
        doc.open();
        doc.write(html);
        doc.close();
      }
    });

    /* Wait for fonts + images to settle. */
    const doc = iframe.contentDocument;
    if (!doc || !doc.body) return null;

    if (doc.fonts && doc.fonts.ready) {
      await doc.fonts.ready;
    }

    /* Best-effort wait for image loads with a short timeout. */
    await Promise.race([
      waitForImages(doc),
      new Promise((r) => setTimeout(r, 2500)),
    ]);

    /* Resize iframe to the rendered body's true height so html-to-image
       captures the full content, not just the viewport. */
    const fullHeight = doc.body.scrollHeight;
    iframe.style.height = `${fullHeight}px`;
    await raf(); await raf();        // 2 frames for layout to settle

    /* Capture. We target doc.body explicitly — html-to-image can't see
       across the iframe boundary by default; calling it inside the
       iframe's window context handles cross-realm node references. */
    const dataUrl = await toPng(doc.body, {
      width:      WIDTH,
      height:     fullHeight,
      pixelRatio: 1.5,                // crisp on retina without huge files
      cacheBust:  true,
      backgroundColor: '#ffffff',
      style: { transform: 'scale(1)' },
    });

    return dataUrl;
  } catch (err) {
    console.warn('[thumbnail] capture failed:', err);
    return null;
  } finally {
    /* Always tear down the iframe. */
    iframe.remove();
  }
}

function waitForImages(doc: Document): Promise<void> {
  const imgs = Array.from(doc.images);
  if (imgs.length === 0) return Promise.resolve();
  return Promise.all(
    imgs.map((img) =>
      img.complete && img.naturalHeight > 0
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.addEventListener('load',  () => resolve(), { once: true });
            img.addEventListener('error', () => resolve(), { once: true });
          }),
    ),
  ).then(() => undefined);
}

function raf(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}
