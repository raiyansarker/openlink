import { env } from 'cloudflare:workers'
import type { AnalyticsEngineDataset, D1Database, R2Bucket } from '@cloudflare/workers-types'
import type { OpenLinkDomainEnv } from '@openlink/domain'

export type WorkerBindings = OpenLinkDomainEnv & {
  DB: D1Database
  ANALYTICS: AnalyticsEngineDataset
  /** Profile pictures and workspace logos. */
  MEDIA: R2Bucket
  BETTER_AUTH_SECRET: string
  BETTER_AUTH_URL: string
  /** Extra origins allowed to call the auth API (comma separated), e.g. previews. */
  BETTER_AUTH_TRUSTED_ORIGINS?: string
  BOOTSTRAP_ORG_INVITE_TOKEN?: string
  /** OAuth providers switch on only when both the id and secret are set. */
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  GITHUB_CLIENT_ID?: string
  GITHUB_CLIENT_SECRET?: string
  /** When `"true"`, create-invite responses include the raw token (local dev only). */
  EXPOSE_INVITE_TOKENS_IN_API?: string
}

export function getBindings(): WorkerBindings {
  return env as WorkerBindings
}
