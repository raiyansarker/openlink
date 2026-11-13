import { Effect } from 'effect'
import { operation } from '#/server/effect/operations'
import { Bindings } from '#/server/effect/services/bindings'

export function recordClickEvent(input: {
  linkId: string
  domainId: string
  organizationId: string
}) {
  return Effect.gen(function* () {
    const { ANALYTICS } = yield* Bindings
    yield* operation('analytics.recordClickEvent', () => ANALYTICS.writeDataPoint({
      blobs: [input.organizationId, input.domainId, input.linkId],
      doubles: [1],
      indexes: [input.linkId],
    }))
  })
}
