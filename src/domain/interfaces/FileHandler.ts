/**
 * Interface for handling file Import/Export operations.
 * Allows external systems (like VS Code Extension) to override default browser behaviors.
 */
export interface FileHandler {
  /**
   * Request to import a file.
   * @param format The expected file format (e.g., 'xmind').
   * @returns The file content as ArrayBuffer (binary) or string (text), or null if cancelled.
   */
  onImportFile(format: string): Promise<ArrayBuffer | string | null>;

  /**
   * Request to export a file.
   * @param data The data to export (Blob or string).
   * @param filename The suggested filename.
   * @param format The file format (e.g., 'png', 'svg', 'markdown').
   */
  onExportFile(data: Blob | string, filename: string, format: string): Promise<void>;
}
