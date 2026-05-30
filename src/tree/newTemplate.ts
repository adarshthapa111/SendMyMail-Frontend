import { v4 as uuid } from 'uuid';
import type { IMjmlNode } from './types';

/**
 * Factory returning a blank document. Every call produces fresh _id values.
 * Shape matches what EmailLoveBackend/src/figmaPluginApi/utils/nodeJsonExtractor.ts
 * emits for the root of a Figma-authored template, so round-trip works.
 */
export const newTemplate = (): IMjmlNode => ({
  tagName: 'mjml',
  _id: uuid(),
  children: [
    {
      tagName: 'mj-head',
      _id: uuid(),
      children: [
        {
          tagName: 'mj-preview',
          _id: uuid(),
          content: '',
        },
        {
          tagName: 'mj-attributes',
          _id: uuid(),
          children: [
            {
              tagName: 'mj-all',
              _id: uuid(),
              attributes: { 'font-family': 'Arial, sans-serif' },
            },
          ],
        },
      ],
    },
    {
      tagName: 'mj-body',
      _id: uuid(),
      attributes: {
        'background-color': '#f4f4f4',
        width: '600px',
      },
      children: [],
    },
  ],
});
