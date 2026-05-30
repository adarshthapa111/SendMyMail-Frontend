import { v4 as uuid } from 'uuid';
import type { IMjmlNode } from '../tree/types';

export const createSpacerNode = (): IMjmlNode => ({
  tagName: 'mj-spacer',
  _id: uuid(),
  attributes: { height: '20px' },
});
