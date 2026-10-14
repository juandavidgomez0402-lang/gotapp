import { formatoMoneda } from './moneda'

export default function Marcadores({ items, moneda, tres = false }) {
  const dinero = (valor) => formatoMoneda(valor, moneda || 'COP')
  return (
    <section className={`marcadores${tres ? ' marcadores-tres' : ''}`} aria-label="Resumen de dinero">
      {items.map(([titulo, valor]) => (
        <article className="marcador" key={titulo}>
          <span>{titulo}</span>
          <strong>{dinero(valor)}</strong>
        </article>
      ))}
    </section>
  )
}
