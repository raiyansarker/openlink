import { accountRouter } from '#/server/account/router'
import { activityRouter } from '#/server/activity/router'
import { analyticsRouter } from '#/server/analytics/router'
import { apiKeysRouter } from '#/server/apikeys/router'
import { authRouter } from '#/server/auth/router'
import { domainsRouter } from '#/server/domain/router'
import { foldersRouter } from '#/server/folders/router'
import { linksRouter } from '#/server/links/router'
import { organizationsRouter } from '#/server/org/router'
import { systemRouter } from '#/server/system/router'

import { os } from './implement'

/**
 * Every API procedure. Each contract area is implemented next to its domain code
 * (`#/server/<module>/router.ts`); this file only puts them together.
 */
export const router = os.router({
  system: systemRouter,
  auth: authRouter,
  activity: activityRouter,
  analytics: analyticsRouter,
  account: accountRouter,
  apiKeys: apiKeysRouter,
  organizations: organizationsRouter,
  domains: domainsRouter,
  folders: foldersRouter,
  links: linksRouter,
})
