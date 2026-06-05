import type { IMjmlNode, NodePath } from '../../tree/types';
import FormSection from './controls/FormSection';
import TextInput from './controls/TextInput';
import UrlInput from './controls/UrlInput';
import NumberInput from './controls/NumberInput';
import ColorPicker from './controls/ColorPicker';
import PaddingControl from './controls/PaddingControl';
import ImageReplaceControl from './controls/ImageReplaceControl';
import AdvancedPanel from './AdvancedPanel';
import { useAttrSetter } from './useInspectorHelpers';
import styles from '@styles/components/inspector/controls/controls.module.css';

interface Props {
  node: IMjmlNode;
  path: NodePath;
}

const KNOWN_KEYS = [
  'name', 'href', 'src', 'background-color', 'color', 'alt',
  'padding', 'icon-padding',
];

/**
 * Per-icon editor for `<mj-social-element>`. Reuses `ImageReplaceControl`
 * (the same widget mj-image uses) so the upload-on-save flow handles
 * social icons identically — no separate upload pipeline.
 *
 * The "Network name" field stays editable because MJML uses it to look up
 * built-in icons when no `src` is provided, and email-client analytics
 * sometimes key off it. Most users won't touch it; advanced users can.
 */
export default function SocialElementInspector({ node, path }: Props) {
  const attrs = node.attributes ?? {};
  const set   = useAttrSetter(path);

  return (
    <>
      <FormSection title="Icon">
        <ImageReplaceControl
          currentSrc={attrs.src as string | undefined}
          onPicked={(dataUrl) => set('src')(dataUrl)}
        />
        <UrlInput
          label="Icon URL"
          value={attrs.src as string}
          placeholder="https://.../icon.png"
          onCommit={set('src')}
        />
        <span className={styles.fieldHint}>
          Tip: any image works — your brand logo, a custom monochrome SVG, etc.
        </span>
      </FormSection>

      <FormSection title="Link">
        <UrlInput
          label="URL"
          value={attrs.href as string}
          placeholder="https://..."
          onCommit={set('href')}
        />
        <TextInput
          label="Network name"
          value={(attrs.name as string) ?? ''}
          placeholder="facebook, instagram, tiktok…"
          onCommit={set('name')}
        />
      </FormSection>

      <FormSection title="Style">
        <ColorPicker
          label="Background"
          value={(attrs['background-color'] as string) ?? ''}
          onCommit={set('background-color')}
        />
        <span className={styles.fieldHint}>
          Background only shows behind transparent / monochrome icons.
        </span>
      </FormSection>

      <FormSection title="Spacing">
        <PaddingControl
          value={attrs.padding as string}
          onCommit={set('padding')}
        />
        <NumberInput
          label="Icon padding"
          value={(attrs['icon-padding'] as string) ?? ''}
          units={['px']}
          onCommit={set('icon-padding')}
        />
        <span className={styles.fieldHint}>
          Outer padding shifts the icon's space inside the row; icon
          padding adds breathing room around the icon itself.
        </span>
      </FormSection>

      <AdvancedPanel node={node} path={path} knownKeys={KNOWN_KEYS} />
    </>
  );
}
