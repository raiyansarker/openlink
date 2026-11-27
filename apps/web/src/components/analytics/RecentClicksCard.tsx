import { Badge } from '@astryxdesign/core/Badge'
import { HStack } from '@astryxdesign/core/HStack'
import { Table, pixel, proportional } from '@astryxdesign/core/Table'
import { Text } from '@astryxdesign/core/Text'
import { VStack } from '@astryxdesign/core/VStack'
import AnalyticsCard from '#/components/analytics/AnalyticsCard'
import { useRecentClicks } from '#/hooks/use-analytics'
import { countryFlag } from '#/lib/analytics/flag'
import type { RecentClick } from '#/lib/api/types'
import { countryName } from '#/lib/links/countries'

type RecentClicksCardProps = {
  organizationId: string
  /** One link, or the whole workspace. */
  linkId: string | null
}

type Row = RecentClick & Record<string, unknown>

const CHANNEL_LABELS: Record<RecentClick['channel'], string> = {
  direct: 'Direct',
  social: 'Social',
  search: 'Search',
  email: 'Email',
  qr: 'QR scan',
  referral: 'Other site',
}

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto', style: 'short' })

/** "just now", "4 min ago", "3 h ago", then the date. */
function ago(iso: string, now = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000)
  if (seconds > -45) return 'just now'
  if (seconds > -3600) return relative.format(Math.round(seconds / 60), 'minute')
  if (seconds > -86_400) return relative.format(Math.round(seconds / 3600), 'hour')
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function place(click: RecentClick): string {
  if (!click.country) return 'Unknown location'
  const name = countryName(click.country)
  const flag = countryFlag(click.country)
  return `${flag ? `${flag} ` : ''}${click.city ? `${click.city}, ` : ''}${name}`
}

/** The latest clicks as they happen (refreshed every 15 seconds). */
export default function RecentClicksCard({ organizationId, linkId }: RecentClicksCardProps) {
  const query = useRecentClicks(organizationId, linkId)
  const rows = (query.data ?? []) as Row[]

  return (
    <AnalyticsCard
      title="Recent clicks"
      description="The latest visits, newest first · updates every 15 seconds"
      actions={
        query.isFetching && !query.isPending ? (
          <Text type="supporting" color="secondary">
            Updating…
          </Text>
        ) : undefined
      }
    >
      {rows.length === 0 ? (
        <Text type="supporting" color="secondary">
          {query.isPending ? 'Loading…' : 'No clicks yet.'}
        </Text>
      ) : (
        <Table<Row>
          className="table-nowrap"
          data={rows}
          idKey="id"
          density="compact"
          dividers="rows"
          columns={[
            {
              key: 'occurredAt',
              header: 'When',
              width: pixel(120),
              renderCell: (row) => (
                <Text type="supporting" color="secondary">
                  <time dateTime={row.occurredAt} title={new Date(row.occurredAt).toLocaleString()}>
                    {ago(row.occurredAt)}
                  </time>
                </Text>
              ),
            },
            ...(linkId
              ? []
              : [
                  {
                    key: 'link',
                    header: 'Link',
                    width: proportional(1.2, { minWidth: 140 }),
                    renderCell: (row: Row) => (
                      <VStack gap={0}>
                        <Text type="supporting" weight="semibold">
                          {row.link.title || `/${row.link.slug}`}
                        </Text>
                        <Text type="supporting" color="secondary">
                          /{row.link.slug}
                        </Text>
                      </VStack>
                    ),
                  },
                ]),
            {
              key: 'place',
              header: 'Location',
              width: proportional(1.2, { minWidth: 150 }),
              renderCell: (row) => <Text type="supporting">{place(row)}</Text>,
            },
            {
              key: 'device',
              header: 'Device',
              width: proportional(1, { minWidth: 140 }),
              renderCell: (row) => (
                <Text type="supporting">
                  {row.browser} · {row.os}
                </Text>
              ),
            },
            {
              key: 'channel',
              header: 'Source',
              width: proportional(1, { minWidth: 140 }),
              renderCell: (row) => (
                <HStack gap={2} vAlign="center">
                  <Badge label={CHANNEL_LABELS[row.channel]} />
                  {row.referrerHost ? (
                    <Text type="supporting" color="secondary">
                      {row.referrerHost}
                    </Text>
                  ) : null}
                </HStack>
              ),
            },
          ]}
        />
      )}
    </AnalyticsCard>
  )
}
