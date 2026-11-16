import { Effect } from 'effect'
import { operation } from '#/server/effect/operations'
import { Bindings } from '#/server/effect/services/bindings'

export function recordClickEvent(input: {
  linkId: string
  /** Null for the app's own host; recorded as an empty blob. */
  domainId: string | null
  organizationId: string
}) {
  return Effect.gen(function* () {
    const { ANALYTICS } = yield* Bindings
    yield* operation('analytics.recordClickEvent', () => ANALYTICS.writeDataPoint({
      blobs: [input.organizationId, input.domainId ?? '', input.linkId],
      doubles: [1],
      indexes: [input.linkId],
    }))
  })
}
