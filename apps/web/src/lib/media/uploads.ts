/** Uploads images to the Worker, which stores them in R2. */
export class MediaUploads {
  private static async send(method: 'PUT' | 'DELETE', path: string, body?: Blob): Promise<{ url?: string }> {
    let response: Response
    try {
      response = await fetch(path, {
        method,
        body,
        credentials: 'same-origin',
        headers: body ? { 'content-type': body.type || 'application/octet-stream' } : undefined,
      })
    } catch {
      throw new Error('Could not reach the server. Check your connection.')
    }
    if (response.status === 204) return {}
    const payload = (await response.json().catch(() => null)) as { url?: string; message?: string } | null
    if (!response.ok) throw new Error(payload?.message ?? 'The upload failed. Please try again.')
    return payload ?? {}
  }

  static async setAvatar(image: Blob): Promise<string> {
    const { url } = await MediaUploads.send('PUT', '/api/uploads/avatar', image)
    if (!url) throw new Error('The upload failed. Please try again.')
    return url
  }

  static async clearAvatar(): Promise<void> {
    await MediaUploads.send('DELETE', '/api/uploads/avatar')
  }

  static async setLogo(organizationId: string, image: Blob): Promise<string> {
    const { url } = await MediaUploads.send('PUT', MediaUploads.logoPath(organizationId), image)
    if (!url) throw new Error('The upload failed. Please try again.')
    return url
  }

  static async clearLogo(organizationId: string): Promise<void> {
    await MediaUploads.send('DELETE', MediaUploads.logoPath(organizationId))
  }

  private static logoPath(organizationId: string) {
    return `/api/uploads/organizations/${encodeURIComponent(organizationId)}/logo`
  }
}
