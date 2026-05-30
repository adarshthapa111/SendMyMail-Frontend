import { v4 as uuid } from 'uuid';
import type { IMjmlNode } from '../tree/types';

/**
 * Escape hatch: lets users drop raw HTML / merge-tag templating that MJML
 * passes through verbatim. The backend's correctTemplateScriptQuotes preserves
 * AMPscript / Liquid / Handlebars / ERB / Netcore tags inside this content.
 */
export const createRawHtmlNode = (): IMjmlNode => ({
  tagName: 'mj-raw',
  _id: uuid(),
  content: '<!-- paste raw HTML here -->',
});
