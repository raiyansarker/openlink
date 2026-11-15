/** Test doubles for the R2 bucket and sample image bytes. Not used at runtime. */
const bytes = (...values: number[]) => Uint8Array.from([...values, ...Array.from({ length: 24 }, () => 0)])

export const IMAGES = {
  png: bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a),
  jpeg: bytes(0xff, 0xd8, 0xff, 0xe0),
  gif: bytes(0x47, 0x49, 0x46, 0x38, 0x39, 0x61),
  webp: bytes(0x52, 0x49, 0x46, 0x46, 0x10, 0, 0, 0, 0x57, 0x45, 0x42, 0x50),
}

type Stored = { bytes: Uint8Array; contentType: string }

export class FakeBucket {
  readonly objects = new Map<string, Stored>()
  failDeletes = false

  async put(key: string, value: Uint8Array, options?: { httpMetadata?: { contentType?: string } }) {
    this.objects.set(key, { bytes: value, contentType: options?.httpMetadata?.contentType ?? 'application/octet-stream' })
    return {}
  }

  async get(key: string) {
    const stored = this.objects.get(key)
    if (!stored) return null
    return {
      body: new Response(stored.bytes).body,
      size: stored.bytes.length,
      httpEtag: `"${key.length}"`,
      httpMetadata: { contentType: stored.contentType },
    }
  }

  async delete(key: string) {
    if (this.failDeletes) throw new Error('delete failed')
    this.objects.delete(key)
  }
}
