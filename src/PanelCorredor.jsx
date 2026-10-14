import { useState } from 'react'
import { Banknote, LogOut } from 'lucide-react'
import logo from './assets/logo-gotaapp.png'
import { pedir } from './api'
import Icono from './Icono'
import { formatoMoneda } from './moneda'

function fechaHoy() {
  const fecha = new Date()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${fecha.getFullYear()}-${mes}-${dia}`
}

export default function PanelCorredor({ panel, token, onSalir, onActualizar }) {
  const [modal, setModal] = useState(null)
  const [valor, setValor] = useState('')
  const [fecha, setFecha] = useState(fechaHoy())
  const [deudaId, setDeudaId] = useState('')
  const [avisoInferior, setAvisoInferior] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [guardando, setGuardando] = useState(false)

  const dinero = (monto) => formatoMoneda(monto, panel?.moneda || 'COP')
  const deudasCliente = (panel?.deudas || []).filter(
    (item) => item.cliente_id === modal?.id && item.estado !== 'cancelada' && Number(item.saldo) > 0,
  )
  const deudaElegida = deudasCliente.find((item) => item.id === deudaId) || deudasCliente[0]
  const minimo = deudaElegida ? Math.min(Number(deudaElegida.valor_cuota), Number(deudaElegida.saldo)) : 0
  const pago = Number(String(valor).replace(',', '.'))
  const esInferior = Number.isFinite(pago) && pago > 0 && pago + 0.009 < minimo

  function abrirPago(persona) {
    const deudas = (panel?.deudas || []).filter(
      (item) => item.cliente_id === persona.id && item.estado !== 'cancelada' && Number(item.saldo) > 0,
    )
    setModal(persona)
    setDeudaId(deudas[0]?.id || '')
    setValor('')
    setFecha(fechaHoy())
    setAvisoInferior(false)
    setError('')
  }

  async function registrarPago(event) {
    event.preventDefault()
    if (!deudaElegida || !Number.isFinite(pago) || pago <= 0) {
      setError('Escribe el valor del pago.')
      return
    }
    if (esInferior && !avisoInferior) {
      setAvisoInferior(true)
      setError('')
      return
    }
    setGuardando(true)
    setError('')
    try {
      const resultado = await pedir('/api/abonos', {
        method: 'POST',
        token,
        datos: {
          deudaId: deudaElegida.id,
          valor,
          fecha,
        },
      })
      await onActualizar()
      setModal(null)
      setAviso(
        resultado.inferior
          ? 'Pago registrado. Es inferior a la cuota mínima y se restó de la deuda.'
          : resultado.estado === 'cancelada'
            ? 'Pago registrado. La deuda quedó cancelada.'
            : 'Pago registrado. Se restó de la deuda.',
      )
    } catch (pagoError) {
      setError(pagoError.message)
    } finally {
      setGuardando(false)
    }
  }

  const clientesConDeuda = (panel?.clientes || []).filter((persona) =>
    (panel?.deudas || []).some(
      (item) => item.cliente_id === persona.id && item.estado !== 'cancelada' && Number(item.saldo) > 0,
    ),
  )

  return (
    <div className="app-dashboard">
      <header className="barra">
        <img className="logo logo-barra" src={logo} alt="GotaApp" />
        <div className="barra-titulo">
          <p className="barra-sistema">Sistema de gestión gota gota</p>
          <p className="barra-usuario">{panel.usuario.nombre} · corredor</p>
        </div>
        <button className="button button-salir" type="button" onClick={onSalir}>
          <Icono icono={LogOut} size={16} />
          Salir
        </button>
      </header>

      <main className="contenido">
        <section className="panel">
          <h1>Mi información</h1>
          <dl className="datos-corredor">
            <div>
              <dt>Nombre</dt>
              <dd>{panel.usuario.nombre}</dd>
            </div>
            <div>
              <dt>Correo</dt>
              <dd>{panel.usuario.correo}</dd>
            </div>
            <div>
              <dt>Teléfono</dt>
              <dd>{panel.usuario.telefono || '—'}</dd>
            </div>
            <div>
              <dt>Documento</dt>
              <dd>{panel.usuario.documento || '—'}</dd>
            </div>
            <div>
              <dt>Zona</dt>
              <dd>{panel.usuario.zona || '—'}</dd>
            </div>
          </dl>
        </section>

        {aviso ? <p className="aviso">{aviso}</p> : null}

        <section className="panel lista">
          <h2>Rutas asignadas</h2>
          {panel.rutas?.length ? (
            <div className="tabla-contenedor">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Ruta</th>
                    <th>Clientes</th>
                  </tr>
                </thead>
                <tbody>
                  {panel.rutas.map((ruta) => (
                    <tr key={ruta.id}>
                      <td>{ruta.nombre}</td>
                      <td>{(ruta.clientes || []).map((cliente) => cliente.nombre_personal).join(', ') || 'Sin clientes'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>Aún no tienes rutas asignadas.</p>
          )}
        </section>

        <section className="panel lista">
          <h2>Clientes con deuda</h2>
          {clientesConDeuda.length ? (
            <div className="tabla-contenedor">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Saldo</th>
                    <th>Pago mínimo</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {clientesConDeuda.map((persona) => {
                    const deudas = (panel.deudas || []).filter(
                      (item) => item.cliente_id === persona.id && item.estado !== 'cancelada' && Number(item.saldo) > 0,
                    )
                    const saldo = deudas.reduce((total, item) => total + Number(item.saldo), 0)
                    const cuota = Math.min(...deudas.map((item) => Number(item.valor_cuota)))
                    return (
                      <tr key={persona.id}>
                        <td>
                          <strong>{persona.nombre_personal}</strong>
                          <span className="tabla-detalle">{persona.nombre_negocio}</span>
                        </td>
                        <td>{dinero(saldo)}</td>
                        <td>{dinero(cuota)}</td>
                        <td>
                          <button className="button button-editar" type="button" onClick={() => abrirPago(persona)}>
                            <Icono icono={Banknote} size={15} />
                            Registrar pago
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No hay clientes con deuda en tus rutas.</p>
          )}
        </section>
      </main>

      {modal ? (
        <div className="overlay" onClick={() => setModal(null)}>
          <form
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-pago"
            onClick={(event) => event.stopPropagation()}
            onSubmit={registrarPago}
            noValidate
          >
            <header className="modal-header">
              <h2 id="titulo-pago">Registrar pago</h2>
            </header>
            <p className="nota">
              {modal.nombre_personal} · Pago mínimo {deudaElegida ? dinero(minimo) : '—'}
            </p>
            {deudasCliente.length > 1 ? (
              <div className="field">
                <label htmlFor="deuda-pago">Deuda</label>
                <select
                  id="deuda-pago"
                  value={deudaElegida?.id || ''}
                  onChange={(event) => {
                    setDeudaId(event.target.value)
                    setAvisoInferior(false)
                  }}
                >
                  {deudasCliente.map((item) => (
                    <option key={item.id} value={item.id}>
                      Saldo {dinero(item.saldo)} · Cuota {dinero(item.valor_cuota)}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="campos-dobles">
              <div className="field">
                <label htmlFor="valor-pago">Valor</label>
                <input
                  id="valor-pago"
                  inputMode="decimal"
                  value={valor}
                  onChange={(event) => {
                    setValor(event.target.value)
                    setAvisoInferior(false)
                  }}
                />
              </div>
              <div className="field">
                <label htmlFor="fecha-pago">Fecha</label>
                <input id="fecha-pago" type="date" value={fecha} onChange={(event) => setFecha(event.target.value)} />
              </div>
            </div>
            {avisoInferior ? (
              <p className="error" role="alert">
                El pago es inferior al mínimo de {dinero(minimo)}. Si continúas, se restará de la deuda.
              </p>
            ) : null}
            {error ? (
              <p className="error" role="alert">
                {error}
              </p>
            ) : null}
            <div className="modal-actions">
              <button className="button button-secondary" type="button" onClick={() => setModal(null)} disabled={guardando}>
                Cancelar
              </button>
              <button className="button" type="submit" disabled={guardando}>
                {guardando ? 'Guardando...' : avisoInferior ? 'Registrar de todos modos' : 'Registrar pago'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}
