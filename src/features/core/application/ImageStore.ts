export class ImageStore {
  private images: Map<string, string> = new Map();

  /**
   * Adds an image to the store.
   * @param ref The unique reference or filename of the image
   * @param base64Data The original base64 image data
   */
  public addImage(ref: string, base64Data: string): void {
    this.images.set(ref, base64Data);
  }

  /**
   * Retrieves an image from the store.
   * @param ref The unique reference or filename of the image
   * @returns The base64 image data, or undefined if not found
   */
  public getImage(ref: string): string | undefined {
    return this.images.get(ref);
  }

  /**
   * Removes an image from the store.
   * @param ref The unique reference or filename of the image
   */
  public removeImage(ref: string): void {
    this.images.delete(ref);
  }

  /**
   * Retrieves all image references currently in the store.
   * @returns Array of references
   */
  public getAllRefs(): string[] {
    return Array.from(this.images.keys());
  }

  /**
   * Clears all images from the store.
   */
  public clear(): void {
    this.images.clear();
  }
}
