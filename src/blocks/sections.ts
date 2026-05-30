import { v4 as uuid } from 'uuid';
import type { IMjmlNode } from '../tree/types';

const baseSectionAttrs = {
  'background-color': '#ffffff',
  padding: '20px 0',
};

const emptyColumn = (width: string): IMjmlNode => ({
  tagName: 'mj-column',
  _id: uuid(),
  attributes: { width },
  children: [],
});

export const createOneColumnSection = (innerChild?: IMjmlNode): IMjmlNode => ({
  tagName: 'mj-section',
  _id: uuid(),
  attributes: { ...baseSectionAttrs },
  children: [
    {
      tagName: 'mj-column',
      _id: uuid(),
      attributes: { width: '100%' },
      children: innerChild ? [innerChild] : [],
    },
  ],
});

export const createTwoColumnSection = (): IMjmlNode => ({
  tagName: 'mj-section',
  _id: uuid(),
  attributes: { ...baseSectionAttrs },
  children: [emptyColumn('50%'), emptyColumn('50%')],
});

export const createThreeColumnSection = (): IMjmlNode => ({
  tagName: 'mj-section',
  _id: uuid(),
  attributes: { ...baseSectionAttrs },
  children: [emptyColumn('33.33%'), emptyColumn('33.33%'), emptyColumn('33.34%')],
});

/**
 * Used by the auto-wrap rule in EditorShell when a content block is dropped
 * directly into mj-body. Wraps the inner block in section > column.
 */
export const createSectionWithColumn = (innerChild?: IMjmlNode): IMjmlNode =>
  createOneColumnSection(innerChild);
