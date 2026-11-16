import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { QueryKeys } from '#/lib/api/query'
import { ReportsApi } from '#/lib/api/reports'
import type { ReportMonth } from '#/lib/reports/month'

const api = new ReportsApi()

export function useMonthlyReport(organizationId: string, month: ReportMonth, campaign: string | null) {
  return useQuery({
    queryKey: QueryKeys.monthlyReport(organizationId, month.key, campaign),
    queryFn: () => api.monthly(organizationId, month, campaign),
    // Switching months keeps the last report on screen until the next one arrives.
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  })
}

export function useCampaigns(organizationId: string) {
  return useQuery({
    queryKey: QueryKeys.campaigns(organizationId),
    queryFn: () => api.campaigns(organizationId),
    staleTime: 60_000,
  })
}
