export type ImageMime = 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp'

/** Identifies an image by its leading bytes; the declared Content-Type is never trusted. */
export class ImageFormat {
  static detect(bytes: Uint8Array): { mime: ImageMime; extension: string } | null {
    const at = (offset: number, ...expected: number[]) =>
      expected.every((value, i) => bytes[offset + i] === value)
    if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return { mime: 'image/png', extension: 'png' }
    if (at(0, 0xff, 0xd8, 0xff)) return { mime: 'image/jpeg', extension: 'jpg' }
    if (at(0, 0x47, 0x49, 0x46, 0x38)) return { mime: 'image/gif', extension: 'gif' }
    // RIFF....WEBP
    if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return { mime: 'image/webp', extension: 'webp' }
    return null
  }
}
