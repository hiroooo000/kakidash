import { MindMap } from './../../features/core/domain/MindMap';
import { Renderer } from './../../presentation/components/Renderer';
import { IMindMapEventBus } from './../../presentation/logic/MindMapController';
import { FileHandler } from './../../shared/kernel/FileHandler';
import { ImageExporter } from './ImageExporter';
import { MarkdownExporter } from './MarkdownExporter';
import { XMindImporter } from './XMindImporter';
import { MindMapData } from './../../features/core/domain/MindMapData';

export interface FileIOServiceDependencies {
  mindMap: MindMap;
  renderer: Renderer;
  eventBus: IMindMapEventBus;
  fileHandler?: FileHandler;
}

export class FileIOService {
  private mindMap: MindMap;
  private renderer: Renderer;
  private eventBus: IMindMapEventBus;
  private fileHandler?: FileHandler;

  constructor(deps: FileIOServiceDependencies) {
    this.mindMap = deps.mindMap;
    this.renderer = deps.renderer;
    this.eventBus = deps.eventBus;
    this.fileHandler = deps.fileHandler;
  }

  public async exportPng(): Promise<void> {
    this.eventBus.emit('command', { name: 'exportPng' });
    const exporter = new ImageExporter();
    await exporter.exportToPng(this.renderer.container, this.fileHandler);
  }

  public async exportSvg(): Promise<void> {
    this.eventBus.emit('command', { name: 'exportSvg' });
    const exporter = new ImageExporter();
    await exporter.exportToSvg(this.renderer.container, this.fileHandler);
  }

  public async exportMarkdown(): Promise<void> {
    this.eventBus.emit('command', { name: 'exportMarkdown' });
    const exporter = new MarkdownExporter();
    await exporter.export(this.mindMap, this.fileHandler);
  }

  public async importXMind(): Promise<MindMapData | null> {
    this.eventBus.emit('command', { name: 'importXMind' });

    // Check if root has children to confirm replacement
    if (this.mindMap.root.children.length > 0) {
      if (!window.confirm('Current mind map will be replaced. Continue?')) {
        return null;
      }
    }

    if (this.fileHandler) {
      const content = await this.fileHandler.onImportFile('xmind');
      if (content) {
        try {
          const importer = new XMindImporter();
          let file: File;
          if (content instanceof ArrayBuffer) {
            file = new File([content], 'imported.xmind');
          } else if (typeof content === 'string') {
            file = new File([content], 'imported.xmind');
          } else {
            return null;
          }

          const data = await importer.extractMindMapData(file);
          return data;
        } catch (err) {
          console.error(err);
          alert('Failed to import XMind file.');
          return null;
        }
      }
      return null;
    }

    // Fallback for browser file input handling
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.xmind';
      input.style.display = 'none';
      document.body.appendChild(input);

      input.onchange = async (e: Event) => {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        if (file) {
          try {
            const importer = new XMindImporter();
            const data = await importer.extractMindMapData(file);
            resolve(data);
          } catch (err) {
            console.error(err);
            alert('Failed to import XMind file.');
            resolve(null);
          }
        } else {
          resolve(null);
        }
        document.body.removeChild(input);
      };

      input.click();
    });
  }
}
