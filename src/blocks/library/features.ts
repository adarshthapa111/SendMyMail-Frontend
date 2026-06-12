import type { IMjmlNode } from '../../tree/types';
import { section, column, text, button, image, MUTED } from './shared';

/* feature-section-library V1 — feature / blog section composites. */

/** Image left, headline + copy + link right. */
export const createFeatureRow = (): IMjmlNode =>
  section(
    [
      column([image(280, 200)], { width: '45%', 'vertical-align': 'middle' }),
      column(
        [
          text('Compelling headline', {
            'font-size': '19px',
            'font-weight': '700',
            padding: '0 0 6px',
          }),
          text(
            'Write engaging, concrete copy that helps the reader understand why this matters to them.',
            { color: MUTED, 'font-size': '13.5px', padding: '0 0 10px' }
          ),
          text('<a href="#" style="color:#111827;font-weight:600;">Read more →</a>', {
            'font-size': '13.5px',
            padding: '0',
          }),
        ],
        { width: '55%', 'vertical-align': 'middle', padding: '0 0 0 16px' }
      ),
    ],
    { padding: '24px 24px' }
  );

/** Two blog cards side by side. */
export const createFeatureCards = (): IMjmlNode => {
  const card = () =>
    column(
      [
        image(270, 170, { padding: '0 0 12px' }),
        text('Compelling headline', {
          'font-size': '16px',
          'font-weight': '700',
          padding: '0 0 6px',
        }),
        text('Engaging copy that helps your readers understand the message.', {
          color: MUTED,
          'font-size': '13px',
          padding: '0 0 8px',
        }),
        text('<a href="#" style="color:#111827;font-weight:600;">Read more →</a>', {
          'font-size': '13px',
          padding: '0',
        }),
      ],
      { width: '50%', padding: '0 8px' }
    );
  return section([card(), card()], { padding: '24px 16px' });
};

/** Numbered 3-step row. */
export const createFeatureSteps = (): IMjmlNode => {
  const step = (n: string, title: string) =>
    column(
      [
        text(n, {
          'font-size': '24px',
          'font-weight': '700',
          align: 'center',
          padding: '0 0 6px',
        }),
        text(title, {
          'font-size': '14px',
          'font-weight': '600',
          align: 'center',
          padding: '0 0 4px',
        }),
        text('A short line about this step.', {
          color: MUTED,
          'font-size': '12.5px',
          align: 'center',
          padding: '0 8px',
        }),
      ],
      { width: '33.33%' }
    );
  return section(
    [step('1', 'Browse'), step('2', 'Pick a favorite'), step('3', 'Check out')],
    { padding: '28px 16px' }
  );
};

/** Testimonial: big quote + attribution. */
export const createFeatureTestimonial = (): IMjmlNode =>
  section(
    [
      column([
        text('“', {
          'font-size': '40px',
          'font-weight': '700',
          color: '#D1D5DB',
          align: 'center',
          padding: '0',
          'line-height': '1',
        }),
        text('This is the best decision we made all year. The results speak for themselves.', {
          'font-size': '17px',
          'font-style': 'italic',
          align: 'center',
          'line-height': '1.6',
          padding: '0 36px 12px',
        }),
        text('<strong>Asha K.</strong> · Happy customer', {
          color: MUTED,
          'font-size': '12.5px',
          align: 'center',
          padding: '0',
        }),
      ]),
    ],
    { 'background-color': '#F6F7F9', padding: '32px 24px' }
  );

/** Two product cards: image + name + price + buy button. */
export const createFeatureProducts = (): IMjmlNode => {
  const product = (name: string, price: string) =>
    column(
      [
        image(260, 200, { padding: '0 0 10px' }),
        text(name, { 'font-size': '14px', 'font-weight': '600', align: 'center', padding: '0 0 2px' }),
        text(price, { color: MUTED, 'font-size': '13px', align: 'center', padding: '0 0 10px' }),
        button('Buy now', {
          align: 'center',
          'font-size': '13px',
          'inner-padding': '9px 22px',
          padding: '0',
        }),
      ],
      { width: '50%', padding: '0 8px' }
    );
  return section(
    [product('Product name', '$29.00'), product('Product name', '$35.00')],
    { padding: '24px 16px' }
  );
};

/** Full-width announcement with CTA — works as a featured post. */
export const createFeatureAnnouncement = (): IMjmlNode =>
  section(
    [
      column([
        text('FEATURED', {
          'font-size': '11px',
          'font-weight': '700',
          'letter-spacing': '0.12em',
          color: MUTED,
          align: 'center',
          padding: '0 0 8px',
        }),
        text('Introduce your concept', {
          'font-size': '24px',
          'font-weight': '700',
          align: 'center',
          padding: '0 0 8px',
        }),
        text(
          'Use this space to introduce subscribers to the topic. Be concise, clear, and on-brand.',
          { color: MUTED, align: 'center', 'font-size': '14px', padding: '0 30px 14px' }
        ),
        button('Read the story', { align: 'center' }),
      ]),
    ],
    { padding: '32px 24px' }
  );
