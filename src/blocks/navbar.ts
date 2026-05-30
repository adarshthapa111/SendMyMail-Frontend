import { v4 as uuid } from 'uuid';
import type { IMjmlNode } from '../tree/types';

export const createNavbarNode = (): IMjmlNode => ({
  tagName: 'mj-navbar',
  _id: uuid(),
  attributes: {
    'base-url': 'https://example.com',
    hamburger: 'hamburger',
    padding: '10px 25px',
  },
  children: [
    {
      tagName: 'mj-navbar-link',
      _id: uuid(),
      attributes: { href: '/home', color: '#333333', 'font-size': '14px' },
      content: 'Home',
    },
    {
      tagName: 'mj-navbar-link',
      _id: uuid(),
      attributes: { href: '/about', color: '#333333', 'font-size': '14px' },
      content: 'About',
    },
    {
      tagName: 'mj-navbar-link',
      _id: uuid(),
      attributes: { href: '/contact', color: '#333333', 'font-size': '14px' },
      content: 'Contact',
    },
  ],
});
