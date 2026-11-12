import { getBindings } from '../env'

export function recordClickEvent(input: {
  linkId: string
  domainId: string
  organizationId: string
}) {
  const { ANALYTICS } = getBindings()
  ANALYTICS.writeDataPoint({
    blobs: [input.organizationId, input.domainId, input.linkId],
    doubles: [1],
    indexes: [input.linkId],
  })
}
