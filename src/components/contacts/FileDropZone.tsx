import { useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import Papa from 'papaparse';
import { IconUpload, IconFileSpreadsheet, IconRefresh, IconAlertTriangle } from '@tabler/icons-react';
import { Text } from '../ui';
import styles from '@styles/components/contacts/FileDropZone.module.scss';

const MAX_FILE_BYTES = 10 * 1024 * 1024;

export interface ParsedPreview {
  file: File;
  headers: string[];
  totalRows: number;          // best-effort from papaparse (rough count, may estimate by reading)
  sampleRows: Record<string, string>[];   // first 3 rows for the column-mapper preview
}

interface Props {
  value: ParsedPreview | null;
  onPicked: (preview: ParsedPreview) => void;
  onCleared: () => void;
}

/* Step 1 of the import wizard.
   - Click or drag-drop a .csv (≤10 MB)
   - papaparse runs client-side with `preview: 3` to detect headers + grab a
     sample for the column mapper
   - We also count rows by parsing the whole file once (cheap for ≤50K rows;
     gives the user "1,240 rows · UTF-8 · 5 columns detected" feedback) */
export function FileDropZone({ value, onPicked, onCleared }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  function pickFile(file: File) {
    setError(null);
    if (file.size > MAX_FILE_BYTES) {
      setError(`File is ${(file.size / 1024 / 1024).toFixed(1)} MB — max is 10 MB. Split your list or contact support.`);
      return;
    }
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Only .csv files are supported. Export your spreadsheet as CSV (UTF-8) and try again.');
      return;
    }

    setParsing(true);

    // First pass: 3-row preview for the mapper
    let headers: string[] = [];
    const sampleRows: Record<string, string>[] = [];

    Papa.parse<Record<string, string>>(file, {
      header: true,
      preview: 3,
      skipEmptyLines: 'greedy',
      complete: (results) => {
        headers = results.meta.fields ?? [];
        sampleRows.push(...results.data);

        if (headers.length === 0) {
          setError('No header row detected. The first row of your CSV must list column names.');
          setParsing(false);
          return;
        }

        // Second pass: count rows by streaming (cheap; ≤50K rows finishes in <1s)
        let count = 0;
        Papa.parse(file, {
          header: true,
          skipEmptyLines: 'greedy',
          step: () => { count++; },
          complete: () => {
            setParsing(false);
            onPicked({ file, headers, totalRows: count, sampleRows });
          },
          error: (err) => {
            setParsing(false);
            setError(`Couldn't read the CSV: ${err.message}`);
          },
        });
      },
      error: (err) => {
        setParsing(false);
        setError(`Couldn't read the CSV: ${err.message}`);
      },
    });
  }

  function handlePick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) pickFile(file);
    e.target.value = '';      // reset so picking the same file again refires
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) pickFile(file);
  }

  // Already-picked state — show the file card with a Replace button
  if (value && !parsing) {
    return (
      <div className={styles.picked}>
        <div className={styles.fic}><IconFileSpreadsheet size={22} /></div>
        <div className={styles.meta}>
          <b>{value.file.name}</b>
          <small>
            {value.totalRows.toLocaleString()} {value.totalRows === 1 ? 'row' : 'rows'}
            {' · '}{value.headers.length} {value.headers.length === 1 ? 'column' : 'columns'} detected
          </small>
        </div>
        <button type="button" className={styles.replace} onClick={() => { onCleared(); setError(null); }}>
          <IconRefresh size={14} /> Replace
        </button>
      </div>
    );
  }

  return (
    <>
      <div
        className={`${styles.drop} ${dragOver ? styles.dropOver : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') inputRef.current?.click(); }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className={styles.hiddenInput}
          onChange={handlePick}
        />
        <div className={styles.dropIcon}>
          <IconUpload size={28} />
        </div>
        <div className={styles.dropTitle}>
          {parsing ? 'Reading your file…' : 'Drop a CSV here or click to pick'}
        </div>
        <Text tone="soft" size="xs" className={styles.dropHint}>
          UTF-8 encoded · max 10 MB · headers in the first row
        </Text>
      </div>

      {error ? (
        <div className={styles.error}>
          <IconAlertTriangle size={15} />
          <span>{error}</span>
        </div>
      ) : null}
    </>
  );
}
