import type { IMjmlNode, NodePath } from '../../tree/types';
import FormSection from './controls/FormSection';
import TextInput from './controls/TextInput';
import UrlInput from './controls/UrlInput';
import NumberInput from './controls/NumberInput';
import SelectInput from './controls/SelectInput';
import PaddingControl from './controls/PaddingControl';
import ImageReplaceControl from './controls/ImageReplaceControl';
import AdvancedPanel from './AdvancedPanel';
import { useAttrSetter } from './useInspectorHelpers';
import styles from '@styles/components/inspector/controls/controls.module.css';

interface Props {
  node: IMjmlNode;
  path: NodePath;
}

const KNOWN_KEYS = ['src', 'alt', 'href', 'width', 'height', 'padding', 'align', 'fluid-on-mobile'];

export default function ImageInspector({ node, path }: Props) {
  const attrs = node.attributes ?? {};
  const set = useAttrSetter(path);
  const alt = (attrs.alt as string) ?? '';

  return (
    <>
      <FormSection title="Image">
        <ImageReplaceControl
          currentSrc={attrs.src as string | undefined}
          onPicked={(dataUrl) => set('src')(dataUrl)}
        />
        <UrlInput
          label="Source URL"
          value={attrs.src as string}
          placeholder="https://.../image.png"
          onCommit={set('src')}
        />
        <TextInput
          label="Alt text"
          value={alt}
          placeholder="Describe the image for screen readers"
          onCommit={set('alt')}
        />
        {!alt && (
          <span className={styles.fieldHint} style={{ color: '#d11a2a' }}>
            ⚠ Add alt text for accessibility.
          </span>
        )}
        <UrlInput
          label="Link URL (optional)"
          value={attrs.href as string}
          onCommit={set('href')}
        />
      </FormSection>

      <FormSection title="Layout">
        <NumberInput
          label="Width"
          value={(attrs.width as string) ?? '600px'}
          units={['px', '%']}
          onCommit={set('width')}
        />
        {/* mj-image height is px-only (no %). Empty = auto: the image
            keeps its aspect ratio from the width — usually what you
            want; set it only to force a crop/stretch. */}
        <NumberInput
          label="Height"
          value={(attrs.height as string) ?? ''}
          units={['px']}
          placeholder="auto"
          onCommit={(v) => set('height')(v || undefined)}
        />
        <SelectInput
          label="Align"
          value={(attrs.align as string) ?? 'center'}
          options={['left', 'center', 'right']}
          onCommit={set('align')}
        />
        <label className={styles.toggleRow}>
          <input
            type="checkbox"
            checked={attrs['fluid-on-mobile'] === 'true'}
            onChange={(e) =>
              set('fluid-on-mobile')(e.target.checked ? 'true' : undefined)
            }
          />
          Fluid on mobile
        </label>
      </FormSection>

      <FormSection title="Spacing">
        <PaddingControl value={attrs.padding as string} onCommit={set('padding')} />
      </FormSection>

      <AdvancedPanel node={node} path={path} knownKeys={KNOWN_KEYS} />
    </>
  );
}
