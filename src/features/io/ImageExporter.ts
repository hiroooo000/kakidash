import { FileHandler } from '../../shared/kernel/FileHandler';
import { SvgGenerator } from './SvgGenerator';

// Local declaration for File System Access API to avoid compilation errors
interface FileSystemFileHandle {
  createWritable(): Promise<FileSystemWritableFileStream>;
}
interface FileSystemWritableFileStream extends WritableStream {
  write(data: Blob | string | BufferSource): Promise<void>;
  close(): Promise<void>;
}
interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: { description: string; accept: Record<string, string[]> }[];
}
declare global {
  interface Window {
    showSaveFilePicker?: (options?: SaveFilePickerOptions) => Promise<FileSystemFileHandle>;
  }
}

export class ImageExporter {
  public async exportToSvg(container: HTMLElement, fileHandler?: FileHandler): Promise<void> {
    try {
      const generator = new SvgGenerator();
      const svgString = generator.generate(container);
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      await this.saveFile(
        blob,
        'mindmap.svg',
        [{ description: 'SVG File', accept: { 'image/svg+xml': ['.svg'] } }],
        fileHandler,
      );
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        console.error('Failed to export SVG:', e);
        alert('Failed to export SVG.');
      }
    }
  }

  public async exportToPng(container: HTMLElement, fileHandler?: FileHandler): Promise<void> {
    try {
      const generator = new SvgGenerator();
      const svgString = generator.generate(container);
      // Use Data URI instead of Blob URL to avoid "tainted canvas" security error
      // when drawing SVG with foreignObject to canvas.
      const base64 = btoa(unescape(encodeURIComponent(svgString)));
      const url = `data:image/svg+xml;base64,${base64}`;

      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Could not get canvas context');

            ctx.drawImage(img, 0, 0);

            canvas.toBlob((blob) => {
              if (blob) {
                this.saveFile(
                  blob,
                  'mindmap.png',
                  [{ description: 'PNG Image', accept: { 'image/png': ['.png'] } }],
                  fileHandler,
                )
                  .then(() => resolve())
                  .catch((err) => reject(err instanceof Error ? err : new Error(String(err))));
              } else {
                reject(new Error('Failed to generate PNG blob.'));
              }
            }, 'image/png');
          } catch (err) {
            reject(err instanceof Error ? err : new Error(String(err)));
          }
        };
        img.onerror = () => {
          reject(new Error('Failed to load SVG for PNG conversion'));
        };
        img.src = url;
      });
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        console.error('Failed to export PNG:', e);
        alert('Failed to export PNG.');
      }
    }
  }

  private async showSavePicker(
    options: SaveFilePickerOptions,
  ): Promise<FileSystemFileHandle | null> {
    if (typeof window.showSaveFilePicker !== 'function') {
      alert('Your browser does not support the File System Access API required for saving files.');
      return null;
    }
    return window.showSaveFilePicker(options);
  }

  private async saveFile(
    blob: Blob,
    filename: string,
    types: { description: string; accept: Record<string, string[]> }[],
    fileHandler?: FileHandler,
  ): Promise<void> {
    if (fileHandler) {
      const ext = filename.split('.').pop() as 'png' | 'svg' | 'md';
      await fileHandler.onExportFile(blob, filename, ext);
      return;
    }

    const handle = await this.showSavePicker({
      suggestedName: filename,
      types,
    });
    if (!handle) return; // Not supported or cancelled (though cancelled usually throws AbortError)

    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
  }
}
