import { useEffect, useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Heading, Text, Field, Input, Button } from '../ui';
import { IconX, IconUpload, IconClipboard, IconCheck, IconAlertTriangle, IconFile } from '@tabler/icons-react';
import { parseMjml, summarizeTree, MjmlParseError, type TreeStats } from '../../lib/mjml/parse';
import { blockRegistry } from '../../blocks/registry';
import type { IMjmlNode } from '../../tree/types';
import styles from '@styles/components/templates/ImportMjmlDialog.module.scss';

export interface ImportMjmlValues {
  name: string;
  category: string | null;
  tree: IMjmlNode;
}

interface Props {
  submitting: boolean;
  fieldErrors?: Record<string, string>;
  onSubmit: (values: ImportMjmlValues) => void;
  onClose: () => void;
}

type Tab = 'paste' | 'upload';
type Step = 'source' | 'name';

const CATEGORY_OPTIONS = [
  'Welcome', 'Newsletter', 'Promo', 'Transactional', 'Cart',
  'Birthday', 'Festive', 'Re-engagement',
];

const MAX_FILE_SIZE = 1_048_576;   // 1 MB

/* Tag names our visual editor renders natively. Anything else lands as
   "unknown block" in the canvas; we flag them in the dialog so the user
   knows what they're getting. */
const REGISTRY_TAG_NAMES = new Set<string>(
  Object.values(blockRegistry).flatMap((def) => {
    // We don't have the produced tagName recorded on the BlockDef, so we
    // derive from the factory's output. Cheap: run each factory once.
    try { return [def.factory().tagName]; }
    catch { return []; }
  }),
);
// Also count container/wrapper tags as "supported" so we don't flag them.
['mjml', 'mj-body', 'mj-head', 'mj-section', 'mj-column', 'mj-wrapper', 'mj-group']
  .forEach((t) => REGISTRY_TAG_NAMES.add(t));

/* Import MJML modal — two-step flow:
   1) Source — paste MJML OR upload .mjml file. Live validation banner.
   2) Name + category — submit. */
export function ImportMjmlDialog({ submitting, fieldErrors, onSubmit, onClose }: Props) {
  const [step, setStep]               = useState<Step>('source');
  const [tab, setTab]                 = useState<Tab>('paste');
  const [pasteText, setPasteText]     = useState('');
  const [fileName, setFileName]       = useState<string | null>(null);
  const [parseError, setParseError]   = useState<string | null>(null);
  const [parseErrorLine, setParseErrorLine] = useState<number | null>(null);
  const [parsedTree, setParsedTree]   = useState<IMjmlNode | null>(null);
  const [stats, setStats]             = useState<TreeStats | null>(null);
  const [dragOver, setDragOver]       = useState(false);

  // Step 2 fields
  const [name, setName]               = useState('');
  const [category, setCategory]       = useState('');
  const [nameTouched, setNameTouched] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastParseInput = useRef<string>('');

  // ESC closes
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !submitting) onClose(); };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [submitting, onClose]);

  // Body scroll lock
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  /* Parse on demand. Called from paste blur, upload, and tab switch.
     De-duped against the last-parsed input so we don't re-parse repeatedly. */
  function runParse(input: string) {
    if (input === lastParseInput.current) return;
    lastParseInput.current = input;

    if (!input.trim()) {
      setParseError(null);
      setParseErrorLine(null);
      setParsedTree(null);
      setStats(null);
      return;
    }
    try {
      const tree = parseMjml(input);
      const s = summarizeTree(tree, REGISTRY_TAG_NAMES);
      setParsedTree(tree);
      setStats(s);
      setParseError(null);
      setParseErrorLine(null);
    } catch (err) {
      setParsedTree(null);
      setStats(null);
      if (err instanceof MjmlParseError) {
        setParseError(err.message);
        setParseErrorLine(err.line ?? null);
      } else {
        setParseError('Could not parse the MJML. Please check the markup.');
        setParseErrorLine(null);
      }
    }
  }

  /* File-picker / drop handler. Reads the file as text, runs parse, and
     pre-fills the template name from the filename. */
  function handleFile(file: File) {
    if (file.size > MAX_FILE_SIZE) {
      setParseError(`File is ${Math.round(file.size / 1024)} KB — max is 1 MB.`);
      setParseErrorLine(null);
      setParsedTree(null);
      setStats(null);
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      setPasteText(text);
      runParse(text);
    };
    reader.onerror = () => {
      setParseError('Could not read the file.');
      setParseErrorLine(null);
    };
    reader.readAsText(file);
  }

  function onDragEnter(e: React.DragEvent) { e.preventDefault(); setDragOver(true); }
  function onDragLeave(e: React.DragEvent) { e.preventDefault(); setDragOver(false); }
  function onDragOver(e: React.DragEvent)  { e.preventDefault(); }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function continueToName() {
    if (!parsedTree) return;
    // Pre-fill name from file name (sans extension), else "Imported template"
    const defaultName = fileName
      ? fileName.replace(/\.[^.]+$/, '')
      : 'Imported template';
    setName(defaultName);
    setStep('name');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNameTouched(true);
    const nameTrimmed = name.trim();
    if (!nameTrimmed || !parsedTree || submitting) return;
    onSubmit({
      name:     nameTrimmed,
      category: category.trim() || null,
      tree:     parsedTree,
    });
  }

  // Validation summary in the banner under Source step
  const sourceBanner = useMemo(() => {
    if (parseError) {
      return { kind: 'error' as const, text: parseError, line: parseErrorLine };
    }
    if (stats && parsedTree) {
      const sup = stats.unsupported;
      return {
        kind: 'success' as const,
        text: `Looks valid — ${stats.blocks} ${stats.blocks === 1 ? 'block' : 'blocks'} · ${stats.sections} ${stats.sections === 1 ? 'section' : 'sections'} · ${stats.columns} ${stats.columns === 1 ? 'column' : 'columns'}`,
        warning: sup.length > 0
          ? `Heads up: ${sup.length} ${sup.length === 1 ? 'tag' : 'tags'} (${sup.join(', ')}) won't be visually editable. They'll import and send correctly, but show as placeholders in the canvas.`
          : null,
      };
    }
    return null;
  }, [parseError, parseErrorLine, parsedTree, stats]);

  const nameTrimmed = name.trim();
  const nameErr = (nameTouched && !nameTrimmed)
    ? 'Name is required'
    : (fieldErrors?.name ?? null);

  return createPortal(
    <div
      className={styles.backdrop}
      onMouseDown={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}
    >
      <div className={styles.dialog} role="dialog" aria-labelledby="import-mjml-title">

        <div className={styles.header}>
          <div>
            <Heading id="import-mjml-title" size="lg">
              {step === 'source' ? 'Import MJML' : 'Name your template'}
            </Heading>
            <Text tone="muted" className={styles.sub}>
              {step === 'source'
                ? 'Paste MJML or upload a .mjml file. Your design lands in our visual editor ready to edit.'
                : 'Pick a name + category for the imported template.'}
            </Text>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close" disabled={submitting}>
            <IconX size={16} />
          </button>
        </div>

        {step === 'source' ? (
          <>
            <div className={styles.body}>
              <div className={styles.tabs} role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'paste'}
                  className={`${styles.tab} ${tab === 'paste' ? styles.tabOn : ''}`}
                  onClick={() => setTab('paste')}
                >
                  <IconClipboard size={14} /> Paste
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'upload'}
                  className={`${styles.tab} ${tab === 'upload' ? styles.tabOn : ''}`}
                  onClick={() => setTab('upload')}
                >
                  <IconUpload size={14} /> Upload file
                </button>
              </div>

              {tab === 'paste' ? (
                <textarea
                  className={styles.textarea}
                  placeholder={'<mjml>\n  <mj-body>\n    <mj-section>\n      <mj-column>\n        <mj-text>Hello {{first_name}}</mj-text>\n      </mj-column>\n    </mj-section>\n  </mj-body>\n</mjml>'}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  onBlur={() => runParse(pasteText)}
                  spellCheck={false}
                  rows={14}
                />
              ) : (
                <div
                  className={`${styles.dropZone} ${dragOver ? styles.dropZoneOver : ''}`}
                  onDragEnter={onDragEnter}
                  onDragLeave={onDragLeave}
                  onDragOver={onDragOver}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".mjml,.txt,text/*"
                    className={styles.fileInput}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                    }}
                  />
                  {fileName ? (
                    <div className={styles.fileInfo}>
                      <IconFile size={20} />
                      <div className={styles.fileText}>
                        <b>{fileName}</b>
                        <small>{pasteText.length.toLocaleString()} characters · click to change</small>
                      </div>
                    </div>
                  ) : (
                    <>
                      <IconUpload size={24} className={styles.dropIcon} />
                      <div className={styles.dropTitle}>Drop a .mjml file here, or click to pick</div>
                      <div className={styles.dropSub}>Max 1 MB. Plain text or .mjml.</div>
                    </>
                  )}
                </div>
              )}

              {/* Banner — validation status */}
              {sourceBanner ? (
                <div className={`${styles.banner} ${sourceBanner.kind === 'error' ? styles.bannerError : styles.bannerSuccess}`}>
                  {sourceBanner.kind === 'error' ? (
                    <>
                      <IconAlertTriangle size={16} className={styles.bannerIcon} />
                      <div>
                        <b>{sourceBanner.text}</b>
                        {sourceBanner.line ? <small> · line {sourceBanner.line}</small> : null}
                      </div>
                    </>
                  ) : (
                    <>
                      <IconCheck size={16} className={styles.bannerIcon} />
                      <div>
                        <b>{sourceBanner.text}</b>
                        {sourceBanner.warning ? (
                          <small className={styles.bannerWarn}>{sourceBanner.warning}</small>
                        ) : null}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className={styles.bannerHint}>
                  {tab === 'paste'
                    ? 'Paste your MJML above, then click outside to validate.'
                    : 'Choose a .mjml file to begin.'}
                </div>
              )}
            </div>

            <div className={styles.actions}>
              <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={continueToName}
                disabled={!parsedTree || submitting}
              >
                Continue
              </Button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className={styles.body}>
              <Field label="Name" error={nameErr ?? undefined}>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => setNameTouched(true)}
                  placeholder="Imported template"
                  maxLength={120}
                  autoFocus
                  disabled={submitting}
                />
              </Field>

              <Field
                label="Category"
                hint="optional"
                helper="Used for the card icon."
              >
                <Input
                  list="import-tpl-category-options"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Welcome / Newsletter / Promo …"
                  maxLength={40}
                  disabled={submitting}
                />
                <datalist id="import-tpl-category-options">
                  {CATEGORY_OPTIONS.map((c) => <option key={c} value={c} />)}
                </datalist>
              </Field>

              {stats ? (
                <Text tone="muted" className={styles.summaryRow}>
                  Importing {stats.blocks} {stats.blocks === 1 ? 'block' : 'blocks'} ·
                  {' '}{stats.sections} {stats.sections === 1 ? 'section' : 'sections'} ·
                  {' '}{stats.columns} {stats.columns === 1 ? 'column' : 'columns'}
                </Text>
              ) : null}
            </div>

            <div className={styles.actions}>
              <Button type="button" variant="ghost" onClick={() => setStep('source')} disabled={submitting}>
                ← Back
              </Button>
              <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={!nameTrimmed} loading={submitting}>
                Import
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
