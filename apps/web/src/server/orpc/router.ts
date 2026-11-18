import { os } from './routers/os'
import { systemRouter } from './routers/system'
import { authRouter } from './routers/auth'
import { accountRouter } from './routers/account'
import { activityRouter } from './routers/activity'
import { analyticsRouter } from './routers/analytics'
import { apiKeysRouter } from './routers/api-keys'
import { organizationsRouter } from './routers/organizations'
import { domainsRouter } from './routers/domains'
import { foldersRouter } from './routers/folders'
import { linksRouter } from './routers/links'

/** Every API procedure, one router per contract area (see `./routers`). */
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
