import { describe, expect, it } from 'vitest'
import { describeLink, detectSource, extractUrl, isUrl, sameLink, titleFromMercadoLibre } from './links'

describe('links', () => {
  it('saca el URL de un texto compartido', () => {
    expect(extractUrl('Mirá esto https://www.instagram.com/p/abc123/?igsh=xyz.')).toBe('https://www.instagram.com/p/abc123/?igsh=xyz')
    expect(extractUrl('sin link')).toBeNull()
    expect(extractUrl(null)).toBeNull()
  })

  it('reconoce la plataforma', () => {
    expect(detectSource('https://www.instagram.com/p/abc/')).toBe('instagram')
    expect(detectSource('https://pin.it/3xYz')).toBe('pinterest')
    expect(detectSource('https://ar.pinterest.com/pin/123/')).toBe('pinterest')
    expect(detectSource('https://articulo.mercadolibre.com.ar/MLA-123-teclado-_JM')).toBe('mercadolibre')
    expect(detectSource('https://www.mercadolibre.com.ar/teclado/p/MLA123')).toBe('mercadolibre')
    expect(detectSource('https://meli.la/abc')).toBe('mercadolibre')
    expect(detectSource('https://example.com/x')).toBe('web')
    expect(detectSource('no es url')).toBe('web')
  })

  it('arma un título legible desde el link de Mercado Libre', () => {
    expect(titleFromMercadoLibre('https://articulo.mercadolibre.com.ar/MLA-1234567-teclado-mecanico-redragon-kumara-_JM')).toBe('Teclado mecanico redragon kumara')
    expect(titleFromMercadoLibre('https://www.mercadolibre.com.ar/memoria-ram-fury-16gb/p/MLA19012345')).toBe('Memoria ram fury 16gb')
    expect(describeLink('https://meli.la/abc').defaultTitle).toBe('Producto de Mercado Libre')
    expect(describeLink('https://www.example.com/x').defaultTitle).toBe('example.com')
  })

  it('detecta URLs y duplicados', () => {
    expect(isUrl(' https://a.com/x ')).toBe(true)
    expect(isUrl('comprar ram')).toBe(false)
    expect(sameLink('https://www.instagram.com/p/abc/?igsh=1', 'https://instagram.com/p/abc')).toBe(true)
    expect(sameLink('https://a.com/x', 'https://a.com/y')).toBe(false)
  })
})
