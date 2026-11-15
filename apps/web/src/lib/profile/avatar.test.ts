import { describe, expect, test } from 'bun:test'

import { AvatarImage } from './avatar'

describe('AvatarImage.centeredSquare', () => {
  test('crops landscape, portrait and square images around the centre', () => {
    expect(AvatarImage.centeredSquare(400, 200)).toEqual({ sx: 100, sy: 0, size: 200 })
    expect(AvatarImage.centeredSquare(200, 401)).toEqual({ sx: 0, sy: 100, size: 200 })
    expect(AvatarImage.centeredSquare(300, 300)).toEqual({ sx: 0, sy: 0, size: 300 })
  })
})

describe('AvatarImage.problemWith', () => {
  test('accepts supported raster images within the size limit', () => {
    expect(AvatarImage.problemWith({ type: 'image/png', size: 1000 })).toBeNull()
    expect(AvatarImage.problemWith({ type: 'image/webp', size: AvatarImage.MAX_UPLOAD_BYTES })).toBeNull()
  })

  test('rejects SVG, other types and oversized files', () => {
    expect(AvatarImage.problemWith({ type: 'image/svg+xml', size: 10 })).toContain('PNG, JPG')
    expect(AvatarImage.problemWith({ type: 'application/pdf', size: 10 })).toContain('PNG, JPG')
    expect(AvatarImage.problemWith({ type: 'image/jpeg', size: AvatarImage.MAX_UPLOAD_BYTES + 1 })).toContain('10 MB')
  })
})
