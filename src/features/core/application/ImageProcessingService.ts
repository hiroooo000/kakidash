export interface ThumbnailResult {
  thumbnailBase64: string;
  width: number;
  height: number;
}

export class ImageProcessingService {
  /**
   * Generates a lightweight thumbnail from a base64 image string.
   * Uses HTML Canvas API.
   * @param base64Data The original base64 image data
   * @param maxWidth The maximum width for the thumbnail (default 200)
   * @param quality Image quality for lossy formats (0 to 1, default 0.7)
   */
  public generateThumbnail(
    base64Data: string,
    maxWidth: number = 200,
    quality: number = 0.7,
  ): Promise<ThumbnailResult> {
    return new Promise((resolve, reject) => {
      // Create an image element to load the base64 data
      const img = new Image();

      img.onload = () => {
        try {
          const { width, height } = this.calculateDimensions(img.width, img.height, maxWidth);

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get 2D context'));
            return;
          }

          // Draw the resized image
          ctx.drawImage(img, 0, 0, width, height);

          // Attempt to use webp for better compression, fallback to jpeg/png
          const mimeType = 'image/webp';
          let dataUrl = canvas.toDataURL(mimeType, quality);

          // If browser doesn't support webp, it falls back to image/png implicitly without quality param,
          // let's explicitly fallback to jpeg if size reduction is the goal, or just use what it gave.
          if (dataUrl.startsWith('data:image/png') && mimeType === 'image/webp') {
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }

          resolve({
            thumbnailBase64: dataUrl,
            width,
            height,
          });
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for thumbnail generation'));
      };

      img.src = base64Data;
    });
  }

  /**
   * Calculates proportional dimensions preserving aspect ratio, constrained by maxWidth.
   */
  public calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
  ): { width: number; height: number } {
    if (originalWidth <= maxWidth) {
      return { width: originalWidth, height: originalHeight };
    }

    const ratio = maxWidth / originalWidth;
    return {
      width: maxWidth,
      height: Math.round(originalHeight * ratio),
    };
  }
}
