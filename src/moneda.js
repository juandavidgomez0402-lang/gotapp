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
