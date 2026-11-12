export function slugifyOrganizationSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function isValidOrganizationSlug(slug: string): boolean {
  return slug.length >= 2 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
}
