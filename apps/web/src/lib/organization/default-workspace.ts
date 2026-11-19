import { slugifyOrganizationSlug } from './slugify'

/** Longest URL a generated slug starts from, before any `-xxxxx` suffix. */
const SLUG_BASE_MAX = 40

/**
 * The first workspace's name, from the person's name: "Raiyan Sarker" becomes
 * "Raiyan's workspace". Names without a usable first word become "My workspace".
 */
export function defaultWorkspaceName(personName: string | null | undefined): string {
  const first = personName?.trim().split(/\s+/)[0]?.replace(/[^\p{L}\p{M}\p{N}'’-]/gu, '') ?? ''
  return first ? `${first}'s workspace` : 'My workspace'
}

/**
 * Where a generated URL starts: the name as a slug ("Raiyan's workspace" → "raiyans-workspace").
 * Accents are dropped (José → jose); words in other scripts are left out rather than turned
 * into stray letters, and a name with nothing left becomes "workspace".
 */
export function workspaceSlugBase(name: string): string {
  const words = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, '')
    .split(/\s+/)
    .filter((word) => /^[\x20-\x7e]+$/.test(word))
  const slug = slugifyOrganizationSlug(words.join(' ')).slice(0, SLUG_BASE_MAX).replace(/-+$/g, '')
  return slug.length >= 2 ? slug : 'workspace'
}

/** `base-` plus five random lowercase letters or digits, for when `base` is taken. */
export function withRandomSuffix(base: string): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = crypto.getRandomValues(new Uint8Array(5))
  return `${base}-${[...bytes].map((byte) => alphabet[byte % alphabet.length]).join('')}`
}
