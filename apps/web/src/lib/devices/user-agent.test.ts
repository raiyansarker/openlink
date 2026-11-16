import { describe, expect, test } from 'bun:test'

import { UserAgent } from './user-agent'

describe('UserAgent.describe', () => {
  test.each([
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', 'Chrome 141', 'macOS', 'laptop'],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Safari/605.1.15', 'Safari 19', 'macOS', 'laptop'],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0', 'Firefox 140', 'Windows', 'laptop'],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', 'Edge 141', 'Windows', 'laptop'],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Mobile/15E148 Safari/604.1', 'Safari 19', 'iOS', 'smartphone'],
    ['Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36', 'Chrome 141', 'Android', 'smartphone'],
    ['Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', 'Chrome 141', 'Linux', 'laptop'],
  ])('%s', (ua, client, os, kind) => {
    expect(UserAgent.describe(ua)).toEqual({ client, os, kind })
  })

  test('unknown or missing user agents are described honestly', () => {
    expect(UserAgent.describe('curl/8.7.1')).toEqual({ client: 'Unknown browser', os: 'Unknown system', kind: 'laptop' })
    expect(UserAgent.describe(null)).toEqual({ client: 'Unknown browser', os: 'Unknown system', kind: 'laptop' })
  })
})
