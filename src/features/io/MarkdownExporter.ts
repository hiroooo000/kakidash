import { MindMap } from '../../features/core/domain/MindMap';
import { Node } from '../../features/core/domain/Node';
import { FileHandler } from '../../shared/kernel/FileHandler';

export class MarkdownExporter {
  public async export(mindMap: MindMap, fileHandler?: FileHandler): Promise<void> {
    const markdown = this.generateMarkdown(mindMap);
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    await this.saveFile(blob, 'mindmap.md', fileHandler);
  }

  private generateMarkdown(mindMap: MindMap): string {
    const root = mindMap.root;
    if (!root) return '';

    const lines: string[] = [];
    this.processNode(root, 0, lines);
    return lines.join('\n');
  }

  private processNode(node: Node, level: number, lines: string[]): void {
    const text = this.getNodeText(node);

    if (level === 0) {
      lines.push(`# ${text}`);
    } else if (level === 1) {
      lines.push(`## ${text}`);
    } else {
      const indent = '  '.repeat(level - 2);
      lines.push(`${indent}- ${text}`);
    }

    for (const child of node.children) {
      this.processNode(child, level + 1, lines);
    }
  }

  private getNodeText(node: Node): string {
    if (node.image) {
      return '[image node]';
    }
    return node.topic;
  }

  private async saveFile(blob: Blob, filename: string, fileHandler?: FileHandler): Promise<void> {
    try {
      if (fileHandler) {
        await fileHandler.onExportFile(blob, filename, 'md');
        return;
      }

      if (typeof window.showSaveFilePicker === 'function') {
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [
            {
              description: 'Markdown File',
              accept: {
                'text/markdown': ['.md'],
              },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
      } else {
        // Fallback for browsers not supporting File System Access API
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Failed to save file:', error);
        alert('Failed to save file.');
      }
    }
  }
}
