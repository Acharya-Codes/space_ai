import { useRef } from 'react';
import type { DragEvent } from 'react';
import { FileImage, FilePlus2, ImagePlus, RefreshCw, Trash2, UploadCloud } from 'lucide-react';
import { formatBytes } from '../../utils/formatting';

export interface SelectedImage {
  file: File;
  previewUrl: string;
  width: number;
  height: number;
  token: string;
}

interface ImageUploadProps {
  selected: SelectedImage | null;
  inspecting: boolean;
  error: string | null;
  onChoose: (file: File) => void;
  onRemove: () => void;
}

export function ImageUpload({ selected, inspecting, error, onChoose, onRemove }: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const clickPicker = () => fileInputRef.current?.click();

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.classList.remove('upload-zone--dragging');
    const file = event.dataTransfer.files.item(0);
    if (file) onChoose(file);
  };

  return (
    <div className="upload-component">
      <input
        ref={fileInputRef}
        className="visually-hidden"
        type="file"
        accept=".png,.jpg,.jpeg,image/png,image/jpeg"
        aria-label="Choose a PNG or JPEG satellite image"
        onChange={(event) => {
          const file = event.currentTarget.files?.item(0);
          if (file) onChoose(file);
          event.currentTarget.value = '';
        }}
      />
      {!selected ? (
        <div className={`upload-zone${inspecting ? ' upload-zone--busy' : ''}`} onDragOver={(event) => { event.preventDefault(); event.currentTarget.classList.add('upload-zone--dragging'); }} onDragLeave={(event) => event.currentTarget.classList.remove('upload-zone--dragging')} onDrop={onDrop}>
          <div className="upload-icon">{inspecting ? <RefreshCw size={22} className="spin-icon" /> : <UploadCloud size={23} />}</div>
          <strong>{inspecting ? 'Checking image file…' : 'Drop a satellite image here'}</strong>
          <p>PNG or JPEG · Up to 10 MiB</p>
          <button type="button" className="button button--secondary button--small" onClick={clickPicker} disabled={inspecting}><FilePlus2 size={15} /> Choose image</button>
          <span className="upload-hint">No image is processed in your browser.</span>
        </div>
      ) : (
        <div className="selected-file-card">
          <div className="selected-preview-wrap"><img src={selected.previewUrl} alt={`Preview of ${selected.file.name}`} className="selected-preview" /></div>
          <div className="selected-file-info">
            <div className="selected-file-name"><FileImage size={16} /><strong title={selected.file.name}>{selected.file.name}</strong></div>
            <div className="selected-file-meta">{formatBytes(selected.file.size)} <span>·</span> {selected.width} × {selected.height} px</div>
            <div className="selected-file-actions"><button type="button" className="button button--secondary button--small" onClick={clickPicker}><RefreshCw size={14} /> Replace</button><button type="button" className="button button--ghost button--small danger-text" onClick={onRemove}><Trash2 size={14} /> Remove</button></div>
          </div>
        </div>
      )}
      {error && <p className="field-error" role="alert">{error}</p>}
      <p className="field-help"><ImagePlus size={13} /> Deployed backend performs authoritative decoding, resizing, RGB conversion, and normalization.</p>
      <p className="field-help"><span className="subtle-asterisk">*</span> 10 MiB is a proposed frontend limit, not a research result. The backend must validate uploads independently.</p>
    </div>
  );
}
