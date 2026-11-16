import { ProfileRules } from '#/lib/profile/rules'

/** Turns a chosen photo into a small square image (profile pictures and workspace logos). */
export class SquareImage {
  static readonly MAX_UPLOAD_BYTES = 10 * 1024 * 1024
  static readonly ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'
  /** Matches the server's limit; the encoder lowers quality to stay under it. */
  static readonly MAX_ENCODED_BYTES = 1024 * 1024

  /** The largest centred square inside a `width` × `height` image. */
  static centeredSquare(width: number, height: number) {
    const size = Math.min(width, height)
    return { sx: Math.floor((width - size) / 2), sy: Math.floor((height - size) / 2), size }
  }

  /** A reason the file cannot be used, or null. */
  static problemWith(file: { type: string; size: number }): string | null {
    if (!SquareImage.ACCEPT.split(',').includes(file.type)) return 'Choose a PNG, JPG, WebP, or GIF picture.'
    if (file.size > SquareImage.MAX_UPLOAD_BYTES) return 'That picture is larger than 10 MB. Choose a smaller one.'
    return null
  }

  /** Crop to a centred square, scale down, and encode as WebP (JPEG where WebP is unsupported). */
  static async fromFile(file: File, size = ProfileRules.IMAGE_SIZE_PX): Promise<Blob> {
    const problem = SquareImage.problemWith(file)
    if (problem) throw new Error(problem)

    let bitmap: ImageBitmap
    try {
      bitmap = await createImageBitmap(file)
    } catch {
      throw new Error('That picture could not be read. Try another file.')
    }
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Your browser could not process the picture.')
    const crop = SquareImage.centeredSquare(bitmap.width, bitmap.height)
    context.drawImage(bitmap, crop.sx, crop.sy, crop.size, crop.size, 0, 0, size, size)
    bitmap.close()

    for (const quality of [0.86, 0.72, 0.58]) {
      const blob =
        (await SquareImage.encode(canvas, 'image/webp', quality)) ??
        (await SquareImage.encode(canvas, 'image/jpeg', quality))
      if (blob && blob.size <= SquareImage.MAX_ENCODED_BYTES) return blob
    }
    throw new Error('That picture is too detailed to store. Try a simpler one.')
  }

  private static encode(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob && blob.type === type ? blob : null), type, quality)
    })
  }
}
