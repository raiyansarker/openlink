import { describe, expect, test } from 'bun:test'

import type { Workspace } from '#/lib/api/types'
import { WorkspaceDeparture } from './workspace-departure'

const org = (id: string, slug: string) => ({ id, slug, name: slug }) as Workspace

describe('WorkspaceDeparture', () => {
  test('a workspace that left your list is lost; one with a new slug was renamed', () => {
    const acme = org('o1', 'acme')
    expect(WorkspaceDeparture.of(acme, [org('o2', 'mine')])).toEqual({ kind: 'lost', from: acme })
    expect(WorkspaceDeparture.of(acme, [])).toEqual({ kind: 'lost', from: acme })
    expect(WorkspaceDeparture.of(acme, [org('o1', 'acme-inc')])).toMatchObject({ kind: 'renamed', to: { slug: 'acme-inc' } })
  })
})
