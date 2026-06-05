import { v4 as uuid } from 'uuid';
import { IconPlus, IconX } from '@tabler/icons-react';
import type { IMjmlNode, NodePath } from '../../tree/types';
import { useAppDispatch } from '../../store/hooks';
import { setAttr, setContent, insertBlock, deleteBlock } from '../../store/slices/editorSlice';
import FormSection from './controls/FormSection';
import UrlInput from './controls/UrlInput';
import TextInput from './controls/TextInput';
import SelectInput from './controls/SelectInput';
import PaddingControl from './controls/PaddingControl';
import AdvancedPanel from './AdvancedPanel';
import { useAttrSetter } from './useInspectorHelpers';
import styles from '@styles/components/inspector/controls/controls.module.css';

interface Props {
  node: IMjmlNode;
  path: NodePath;
}

const KNOWN_KEYS = ['base-url', 'hamburger', 'align', 'padding'];

function createLinkNode(): IMjmlNode {
  return {
    tagName: 'mj-navbar-link',
    _id: uuid(),
    attributes: { href: '#', color: '#333333', 'font-size': '14px' },
    content: 'New link',
  };
}

export default function NavbarInspector({ node, path }: Props) {
  const dispatch = useAppDispatch();
  const attrs    = node.attributes ?? {};
  const set      = useAttrSetter(path);
  const links    = node.children ?? [];

  const linkPath = (i: number): NodePath => [...path, 'children', i];

  return (
    <>
      <FormSection title="Links">
        {links.length === 0 ? (
          <span className={styles.fieldHint}>No links yet — add one below.</span>
        ) : (
          links.map((link, i) => (
            <div key={link._id ?? i} className={styles.navbarLinkRow}>
              <TextInput
                label={i === 0 ? 'Text' : undefined}
                value={link.content ?? ''}
                placeholder="Link label"
                onCommit={(v) => dispatch(setContent({ path: linkPath(i), content: v }))}
              />
              <UrlInput
                label={i === 0 ? 'URL' : undefined}
                value={link.attributes?.href as string | undefined}
                placeholder="https://..."
                onCommit={(v) =>
                  dispatch(setAttr({ path: linkPath(i), key: 'href', value: v }))
                }
              />
              <button
                type="button"
                onClick={() => dispatch(deleteBlock({ path: linkPath(i) }))}
                className={styles.navbarLinkDelete}
                title="Remove link"
                aria-label="Remove link"
              >
                <IconX size={13} />
              </button>
            </div>
          ))
        )}

        <button
          type="button"
          onClick={() =>
            dispatch(insertBlock({ parentPath: path, index: links.length, node: createLinkNode() }))
          }
          className={styles.navbarAddLink}
        >
          <IconPlus size={13} />
          <span>Add link</span>
        </button>
        <span className={styles.fieldHint}>
          Tip: double-click a link on the canvas to edit its text inline.
        </span>
      </FormSection>

      <FormSection title="Navigation">
        <UrlInput
          label="Base URL"
          value={attrs['base-url'] as string}
          onCommit={set('base-url')}
        />
        <label className={styles.toggleRow}>
          <input
            type="checkbox"
            checked={attrs.hamburger === 'hamburger'}
            onChange={(e) =>
              set('hamburger')(e.target.checked ? 'hamburger' : undefined)
            }
          />
          Show hamburger menu on mobile
        </label>
        <SelectInput
          label="Align"
          value={(attrs.align as string) ?? 'center'}
          options={['left', 'center', 'right']}
          onCommit={set('align')}
        />
      </FormSection>

      <FormSection title="Spacing">
        <PaddingControl value={attrs.padding as string} onCommit={set('padding')} />
      </FormSection>

      <AdvancedPanel node={node} path={path} knownKeys={KNOWN_KEYS} />
    </>
  );
}
