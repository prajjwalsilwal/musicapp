import { useRef, useState } from 'react';
import { useLibrary } from '../lib/library';
import { plural } from '../lib/format';
import { UploadIcon } from './icons';
import { useUi } from './ui';

/** Opens the iOS Files / Photos picker (or a file dialog) and uploads audio to the server. */
export function UploadButton({ label = 'Upload music', className = 'pill-btn' }: { label?: string; className?: string }) {
  const lib = useLibrary();
  const ui = useUi();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);

  async function onPick(files: FileList | null) {
    if (!files?.length) return;
    setProgress(0);
    try {
      const { added, skipped } = await lib.upload([...files], setProgress);
      ui.toast(`Added ${plural(added.length, 'song')}${skipped.length ? ` · skipped ${skipped.length}` : ''}`);
    } catch (e) {
      ui.toast((e as Error).message);
    } finally {
      setProgress(null);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <>
      <button className={className} disabled={progress !== null} onClick={() => input.current?.click()}>
        <UploadIcon />
        {progress === null ? label : `Uploading ${Math.round(progress * 100)}%`}
      </button>
      <input
        ref={input}
        type="file"
        accept="audio/*,.mp3,.m4a,.aac,.flac,.wav,.aiff,.ogg,.opus"
        multiple
        hidden
        onChange={(e) => onPick(e.target.files)}
      />
    </>
  );
}
