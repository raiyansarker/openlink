import { Context } from 'effect'
import type { createOpenLinkDomainClient } from '@openlink/domain'

export class DomainClient extends Context.Service<
  DomainClient,
  ReturnType<typeof createOpenLinkDomainClient>
>()('openlink/DomainClient') {}
