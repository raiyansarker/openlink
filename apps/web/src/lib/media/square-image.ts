import { ProfileRules } from './rules'

/** Turns a chosen photo into a small square portrait suitable for storing on the profile. */
export class AvatarImage {
  static readonly MAX_UPLOAD_BYTES = 10 * 1024 * 1024
  static readonly ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'

  /** The largest centred square inside a `width` × `height` image. */
  static centeredSquare(width: number, height: number) {
    const size = Math.min(width, height)
    return { sx: Math.floor((width - size) / 2), sy: Math.floor((height - size) / 2), size }
  }

  /** A reason the file cannot be used, or null. */
  static problemWith(file: { type: string; size: number }): string | null {
    if (!AvatarImage.ACCEPT.split(',').includes(file.type)) return 'Choose a PNG, JPG, WebP, or GIF picture.'
    if (file.size > AvatarImage.MAX_UPLOAD_BYTES) return 'That picture is larger than 10 MB. Choose a smaller one.'
    return null
  }

  /**
   * Crop to a centred square, scale to the profile size, and encode as WebP
   * (JPEG where WebP is unsupported), lowering quality until it fits the limit.
   */
  static async toDataUrl(file: File): Promise<string> {
    const problem = AvatarImage.problemWith(file)
    if (problem) throw new Error(problem)

    let bitmap: ImageBitmap
    try {
      bitmap = await createImageBitmap(file)
    } catch {
      throw new Error('That picture could not be read. Try another file.')
    }
    const target = ProfileRules.AVATAR_SIZE_PX
    const canvas = document.createElement('canvas')
    canvas.width = target
    canvas.height = target
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Your browser could not process the picture.')
    const { sx, sy, size } = AvatarImage.centeredSquare(bitmap.width, bitmap.height)
    context.drawImage(bitmap, sx, sy, size, size, 0, 0, target, target)
    bitmap.close()

    for (const quality of [0.86, 0.72, 0.58]) {
      let encoded = canvas.toDataURL('image/webp', quality)
      if (!encoded.startsWith('data:image/webp')) encoded = canvas.toDataURL('image/jpeg', quality)
      if (encoded.length <= ProfileRules.AVATAR_DATA_URL_MAX) return encoded
    }
    throw new Error('That picture is too detailed to store. Try a simpler one.')
  }
}
