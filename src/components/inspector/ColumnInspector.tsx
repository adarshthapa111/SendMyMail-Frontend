import type { IMjmlNode, NodePath } from '../../tree/types';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setColumnGap } from '../../store/slices/editorSlice';
import { getAtPath } from '../../tree/paths';
import FormSection from './controls/FormSection';
import NumberInput from './controls/NumberInput';
import ColorPicker from './controls/ColorPicker';
import SelectInput from './controls/SelectInput';
import PaddingControl from './controls/PaddingControl';
import AdvancedPanel from './AdvancedPanel';
import { useAttrSetter } from './useInspectorHelpers';

interface Props {
  node: IMjmlNode;
  path: NodePath;
}

const KNOWN_KEYS = ['width', 'background-color', 'vertical-align', 'padding', 'border-radius'];

export default function ColumnInspector({ node, path }: Props) {
  const dispatch = useAppDispatch();
  const attrs = node.attributes ?? {};
  const set = useAttrSetter(path);

  /* feature-section-library V1 — column gap, surfaced HERE as well as
     on SectionInspector: users usually click a column (or its content),
     rarely the section itself. The control operates on the PARENT
     section — it sets padding-left/right = gap/2 on every sibling
     column in one undoable step. */
  const sectionPath = path.slice(0, -2);
  const section = useAppSelector((s) => getAtPath(s.editor.tree, sectionPath));
  const siblingColumns =
    section?.tagName === 'mj-section'
      ? (section.children?.filter((c) => c.tagName === 'mj-column').length ?? 0)
      : 0;
  const pl = attrs['padding-left'];
  const gapValue = pl && parseFloat(String(pl)) > 0 ? `${parseFloat(String(pl)) * 2}px` : '';

  return (
    <>
      <FormSection title="Layout">
        <NumberInput
          label="Width"
          value={(attrs.width as string) ?? '100%'}
          units={['%', 'px']}
          onCommit={set('width')}
        />
        <SelectInput
          label="Vertical align"
          value={(attrs['vertical-align'] as string) ?? 'top'}
          options={['top', 'middle', 'bottom']}
          onCommit={set('vertical-align')}
        />
      </FormSection>

      <FormSection title="Style">
        <ColorPicker
          label="Background"
          value={attrs['background-color'] as string}
          onCommit={set('background-color')}
        />
        <NumberInput
          label="Border radius"
          value={attrs['border-radius'] as string}
          units={['px']}
          onCommit={set('border-radius')}
        />
      </FormSection>

      <FormSection title="Spacing">
        <PaddingControl value={attrs.padding as string} onCommit={set('padding')} />
        {siblingColumns > 1 && (
          <NumberInput
            label="Column gap"
            value={gapValue}
            units={['px']}
            min={0}
            step={2}
            placeholder="0"
            onCommit={(v) => {
              const n = v ? parseFloat(v) : undefined;
              dispatch(setColumnGap({
                path: sectionPath,
                gapPx: Number.isFinite(n as number) && (n as number) > 0 ? n : undefined,
              }));
            }}
          />
        )}
      </FormSection>

      <AdvancedPanel node={node} path={path} knownKeys={KNOWN_KEYS} />
    </>
  );
}
