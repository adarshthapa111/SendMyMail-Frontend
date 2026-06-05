import { produce } from 'immer';
import type { IMjmlNode } from '../../tree/types';
import { uploadDataUrl } from '../cloudinary/upload';

/**
 * Defer-to-save uploader.
 *
 * The editor keeps just-picked images in the tree as `data:` URLs so they
 * render in the canvas + server preview without ever touching Cloudinary.
 * Discarded edits never consume quota. At save time, this walks the tree,
 * finds every `mj-image` whose `src` is a `data:` URL, uploads each one
 * to Cloudinary in parallel, and returns a NEW tree with those data URLs
 * replaced by their hosted HTTPS URLs.
 *
 * Existing `https://` URLs (from prior saves, MJML imports, external
 * sources) pass through unchanged — we never re-host what we don't own.
 *
 * Failure semantics: if ANY upload fails, the whole call rejects and the
 * original tree is unaffected. Caller can show an error toast and let the
 * user retry — the data URLs are still in the tree, so retry just re-tries
 * the same uploads. We deliberately don't do partial-success bookkeeping
 * because saving a tree with mixed `data:` and `https://` srcs is a worse
 * state than "save failed, try again."
 *
 * @returns a NEW tree with data URLs swapped for Cloudinary URLs (or the
 * SAME reference if there were no `data:` URLs — fast path).
 */
export async function uploadPendingImages(tree: IMjmlNode): Promise<IMjmlNode> {
  const dataUrls = collectDataUrls(tree);
  if (dataUrls.length === 0) return tree;

  const uploadedUrls = await Promise.all(dataUrls.map((u) => uploadDataUrl(u)));

  return produce(tree, (draft) => {
    const counter = { i: 0 };
    replaceDataUrls(draft, uploadedUrls, counter);
  });
}

/**
 * Depth-first pre-order traversal. The order MUST exactly match
 * `replaceDataUrls` so that uploaded URLs land on the right nodes.
 */
function collectDataUrls(node: IMjmlNode, acc: string[] = []): string[] {
  if (isPendingImage(node)) acc.push(String(node.attributes!.src));
  if (node.children) for (const child of node.children) collectDataUrls(child, acc);
  return acc;
}

function replaceDataUrls(
  node: IMjmlNode,
  uploaded: readonly string[],
  counter: { i: number },
): void {
  if (isPendingImage(node)) {
    node.attributes!.src = uploaded[counter.i];
    counter.i++;
  }
  if (node.children) {
    for (const child of node.children) replaceDataUrls(child, uploaded, counter);
  }
}

/**
 * A node is "pending upload" iff its src is a local data URL. Matches:
 * - `mj-image` — the primary image block
 * - `mj-social-element` — individual social icons (Facebook / Instagram /
 *   TikTok / etc.). Same upload-on-save semantics; otherwise custom-
 *   uploaded icons would bake into the email HTML as inline base64.
 *
 * Add more tags here as new image-bearing blocks land (mj-hero with
 * background-url is a future candidate, but currently we don't surface
 * data-URL hero backgrounds — only normal URLs).
 */
const HOSTS_IMAGE_SRC = new Set(['mj-image', 'mj-social-element']);

function isPendingImage(node: IMjmlNode): boolean {
  return (
    HOSTS_IMAGE_SRC.has(node.tagName) &&
    typeof node.attributes?.src === 'string' &&
    (node.attributes.src as string).startsWith('data:')
  );
}

/**
 * Standalone count helper for UI ("Uploading 3 images…"). Walks the tree
 * once; cheap. Don't memoize — the tree is already a stable reference
 * between renders.
 */
export function countPendingImages(tree: IMjmlNode): number {
  let n = 0;
  const walk = (node: IMjmlNode): void => {
    if (isPendingImage(node)) n++;
    if (node.children) for (const child of node.children) walk(child);
  };
  walk(tree);
  return n;
}
