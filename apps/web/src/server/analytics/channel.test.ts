import { describe, expect, test } from 'bun:test'

import { ChannelClassifier } from './channel'

describe('ChannelClassifier', () => {
  test('QR scans win, and no referrer is direct', () => {
    expect(ChannelClassifier.classify('t.co', true)).toBe('qr')
    expect(ChannelClassifier.classify(null, false)).toBe('direct')
  })

  test('groups known hosts, including country search domains and subdomains', () => {
    expect(ChannelClassifier.classify('www.google.co.uk', false)).toBe('search')
    expect(ChannelClassifier.classify('duckduckgo.com', false)).toBe('search')
    expect(ChannelClassifier.classify('mail.google.com', false)).toBe('email')
    expect(ChannelClassifier.classify('l.facebook.com', false)).toBe('social')
    expect(ChannelClassifier.classify('t.co', false)).toBe('social')
    expect(ChannelClassifier.classify('blog.example.com', false)).toBe('referral')
    expect(ChannelClassifier.classify('googleusercontent.com', false)).toBe('referral')
  })
})
