export const MONEDAS = [
  ['COP', 'Peso colombiano'],
  ['USD', 'Dólar'],
  ['EUR', 'Euro'],
  ['MXN', 'Peso mexicano'],
  ['PEN', 'Sol'],
]

const LOCALES = {
  COP: 'es-CO',
  USD: 'en-US',
  EUR: 'es-ES',
  MXN: 'es-MX',
  PEN: 'es-PE',
}

export function formatearMiles(texto) {
  const limpio = String(texto).replace(/[^\d,]/g, '')
  const coma = limpio.indexOf(',')
  const entero = (coma === -1 ? limpio : limpio.slice(0, coma)).replace(/^0+(?=\d)/, '')
  const decimales = coma === -1 ? null : limpio.slice(coma + 1).replace(/,/g, '').slice(0, 2)
  const conPuntos = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  if (decimales === null) return conPuntos
  return `${conPuntos || '0'},${decimales}`
}

export function leerMonto(texto) {
  const limpio = String(texto ?? '').trim().replace(/\s/g, '')
  if (!limpio) return NaN
  const normal = limpio.includes(',')
    ? limpio.replace(/\./g, '').replace(',', '.')
    : /^\d{1,3}(\.\d{3})+$/.test(limpio)
      ? limpio.replace(/\./g, '')
      : limpio
  const numero = Number(normal)
  return Number.isFinite(numero) ? Math.round(numero * 100) / 100 : NaN
}

export function formatoMoneda(valor, codigo = 'COP') {
  const numero = Number(valor)
  if (!Number.isFinite(numero)) return ''
  return new Intl.NumberFormat(LOCALES[codigo] || 'es-CO', {
    style: 'currency',
    currency: MONEDAS.some(([item]) => item === codigo) ? codigo : 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numero)
}
