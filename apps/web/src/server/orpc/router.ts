import { accountController } from '#/server/account/controller'
import { activityController } from '#/server/activity/controller'
import { analyticsController } from '#/server/analytics/controller'
import { apiKeysController } from '#/server/apikeys/controller'
import { authController } from '#/server/auth/controller'
import { domainsController } from '#/server/domain/controller'
import { foldersController } from '#/server/folders/controller'
import { linksController } from '#/server/links/controller'
import { organizationsController } from '#/server/org/controller'
import { systemController } from '#/server/system/controller'

import { os } from './implement'

/**
 * Every API procedure. Each contract area is implemented next to its domain code
 * (`#/server/<module>/controller.ts`); this file only puts them together.
 */
export const router = os.router({
  system: systemController,
  auth: authController,
  activity: activityController,
  analytics: analyticsController,
  account: accountController,
  apiKeys: apiKeysController,
  organizations: organizationsController,
  domains: domainsController,
  folders: foldersController,
  links: linksController,
})
