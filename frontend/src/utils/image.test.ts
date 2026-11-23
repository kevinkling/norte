import { describe, expect, it } from 'vitest'
import { compressImage, fitWithin, MAX_SIDE, renameFor } from './image'

describe('fitWithin', () => {
  it('no agranda fotos chicas', () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 })
    expect(fitWithin(MAX_SIDE, 900)).toEqual({ width: MAX_SIDE, height: 900 })
  })

  it('achica por el lado más largo manteniendo la proporción', () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 1600, height: 1200 })
    expect(fitWithin(3024, 4032)).toEqual({ width: 1200, height: 1600 })
  })

  it('nunca devuelve un lado en cero', () => {
    expect(fitWithin(10000, 2, 100)).toEqual({ width: 100, height: 1 })
  })
})

describe('renameFor', () => {
  it('cambia la extensión según el tipo', () => {
    expect(renameFor('IMG_1234.HEIC', 'image/webp')).toBe('IMG_1234.webp')
    expect(renameFor('foto.png', 'image/jpeg')).toBe('foto.jpg')
    expect(renameFor('captura', 'image/webp')).toBe('captura.webp')
    expect(renameFor('.png', 'image/webp')).toBe('foto.webp')
  })
})

describe('compressImage', () => {
  it('deja pasar GIF y archivos que no son imágenes', async () => {
    const gif = new File(['x'], 'a.gif', { type: 'image/gif' })
    const txt = new File(['x'], 'a.txt', { type: 'text/plain' })
    expect(await compressImage(gif)).toBe(gif)
    expect(await compressImage(txt)).toBe(txt)
  })
})
