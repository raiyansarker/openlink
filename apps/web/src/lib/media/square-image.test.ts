import { describe, expect, test } from 'bun:test'

import { SquareImage } from './square-image'

describe('SquareImage.centeredSquare', () => {
  test('crops landscape, portrait and square images around the centre', () => {
    expect(SquareImage.centeredSquare(400, 200)).toEqual({ sx: 100, sy: 0, size: 200 })
    expect(SquareImage.centeredSquare(200, 401)).toEqual({ sx: 0, sy: 100, size: 200 })
    expect(SquareImage.centeredSquare(300, 300)).toEqual({ sx: 0, sy: 0, size: 300 })
  })
})

describe('SquareImage.problemWith', () => {
  test('accepts supported raster images within the size limit', () => {
    expect(SquareImage.problemWith({ type: 'image/png', size: 1000 })).toBeNull()
    expect(SquareImage.problemWith({ type: 'image/webp', size: SquareImage.MAX_UPLOAD_BYTES })).toBeNull()
  })

  test('rejects SVG, other types and oversized files', () => {
    expect(SquareImage.problemWith({ type: 'image/svg+xml', size: 10 })).toContain('PNG, JPG')
    expect(SquareImage.problemWith({ type: 'application/pdf', size: 10 })).toContain('PNG, JPG')
    expect(SquareImage.problemWith({ type: 'image/jpeg', size: SquareImage.MAX_UPLOAD_BYTES + 1 })).toContain('10 MB')
  })
})
