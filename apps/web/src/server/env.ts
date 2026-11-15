import { env } from 'cloudflare:workers'
import type { D1Database, AnalyticsEngineDataset } from '@cloudflare/workers-types'
import type { OpenLinkDomainEnv } from '@openlink/domain'

export type WorkerBindings = OpenLinkDomainEnv & {
  DB: D1Database
  ANALYTICS: AnalyticsEngineDataset
  BETTER_AUTH_SECRET: string
  BETTER_AUTH_URL: string
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
