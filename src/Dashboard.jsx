import { useEffect, useState } from 'react'
import {
  Banknote,
  CalendarRange,
  ChevronDown,
  ClipboardList,
  HandCoins,
  LogOut,
  Pencil,
  Receipt,
  Route,
  Settings,
  Sun,
  Sunrise,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react'
import logo from './assets/logo-gotaapp.png'
import { pedir } from './api'
import { fechaVisible, pendientes } from './cobros'
import Icono from './Icono'
import { formatearMiles, formatoMoneda, leerMonto, MONEDAS } from './moneda'
import Marcadores from './Marcadores'
import PanelCorredor from './PanelCorredor'
import { aplicarPago, totales } from './resumen'

function Resumen({ icono, children }) {
  return (
    <summary>
      <span className="resumen-titulo">
        <Icono icono={icono} />
        <h2>{children}</h2>
      </span>
      <Icono icono={ChevronDown} className="flecha" />
    </summary>
  )
}

const vacioCliente = {
  nombrePersonal: '',
  nombreNegocio: '',
  telefono1: '',
  telefono2: '',
  direccion: '',
  referido: '',
}

const vacioDeuda = {
  busqueda: '',
  clienteId: '',
  porcentaje: '',
  valorPrestamo: '',
  numeroCuotas: '',
  plazo: 'diario',
  fecha: '',
}

const plazos = [
  ['diario', 'Diario'],
  ['semanal', 'Semanal'],
  ['quincenal', 'Quincenal'],
  ['mensual', 'Mensual'],
]

function fechaHoy() {
  const fecha = new Date()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${fecha.getFullYear()}-${mes}-${dia}`
}

function coincideCliente(persona, busqueda) {
  return `${persona.nombre_personal} ${persona.nombre_negocio} ${persona.telefono_1}`
    .toLowerCase()
    .includes(busqueda)
}

function cuotaCalculada(deuda) {
  const valor = Number(String(deuda.valorPrestamo).replace(',', '.'))
  const cuotas = Number(deuda.numeroCuotas)
  const porcentaje = Number(deuda.porcentaje)
  if (!Number.isFinite(valor) || valor <= 0 || !Number.isInteger(cuotas) || cuotas <= 0 || !Number.isFinite(porcentaje)) {
    return ''
  }
  return (Math.round((valor * (1 + porcentaje / 100) / cuotas) * 100) / 100).toFixed(2)
}

const vacioCorredor = {
  nombre: '',
  correo: '',
  telefono: '',
  documento: '',
  zona: '',
  contrasena: '',
}

export default function Dashboard({ token, onSalir }) {
  const [panel, setPanel] = useState(null)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [porcentaje, setPorcentaje] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [modal, setModal] = useState('')
  const [nombreRuta, setNombreRuta] = useState('')
  const [corredorRuta, setCorredorRuta] = useState('')
  const [clientesRuta, setClientesRuta] = useState([])
  const [corredor, setCorredor] = useState(vacioCorredor)
  const [cliente, setCliente] = useState(vacioCliente)
  const [deuda, setDeuda] = useState(vacioDeuda)
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false)
  const [filtroCobro, setFiltroCobro] = useState('hoy')
  const [abono, setAbono] = useState({ deudaId: '', valor: '', fecha: '' })
  const [editandoId, setEditandoId] = useState('')
  const [errorModal, setErrorModal] = useState('')
  const [creando, setCreando] = useState(false)

  const esAdministrador = panel?.usuario?.rol === 'administrador'
  const codigoMoneda = panel?.moneda || 'COP'
  const dinero = (valor) => formatoMoneda(valor, codigoMoneda)
  const cobros = pendientes(panel?.deudas, filtroCobro)
  const clientesRutaDisponibles = (panel?.clientes || []).filter(
    (persona) =>
      (panel?.deudas || []).some((item) => item.cliente_id === persona.id && item.estado === 'activa') &&
      !(panel?.rutas || []).some(
        (ruta) => ruta.id !== editandoId && (ruta.clientes || []).some((cliente) => cliente.id === persona.id),
      ),
  )
  const textoBusqueda = deuda.busqueda.trim().toLowerCase()
  const sugerencias = textoBusqueda
    ? (panel?.clientes || []).filter((persona) => coincideCliente(persona, textoBusqueda))
    : []

  async function cargar() {
    const datos = await pedir('/api/panel', { token })
    setPanel(datos)
  }

  useEffect(() => {
    cargar().catch((cargaError) => {
      if (cargaError.status === 401 || cargaError.status === 403) {
        onSalir()
        return
      }
      setError(cargaError.message)
    })
  }, [token])

  useEffect(() => {
    if (!modal) return undefined
    function onKeyDown(event) {
      if (event.key === 'Escape') setModal('')
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [modal])

  async function guardarInteres(event) {
    event.preventDefault()
    setAviso('')
    setError('')
    setGuardando(true)
    try {
      await pedir('/api/intereses', {
        method: 'PUT',
        token,
        datos: { porcentaje },
      })
      await cargar()
      setPorcentaje('')
      setAviso('Interés guardado.')
    } catch (guardadoError) {
      setError(guardadoError.message)
    } finally {
      setGuardando(false)
    }
  }

  async function guardarMoneda(codigo) {
    setAviso('')
    setError('')
    try {
      await pedir('/api/moneda', {
        method: 'PUT',
        token,
        datos: { moneda: codigo },
      })
      await cargar()
    } catch (monedaError) {
      setError(monedaError.message)
    }
  }

  function abrirAbono(persona) {
    const activas = (panel?.deudas || []).filter(
      (item) => item.cliente_id === persona.id && item.estado !== 'cancelada' && Number(item.saldo) > 0,
    )
    setErrorModal('')
    setEditandoId('')
    setAbono({
      clienteId: persona.id,
      deudaId: activas[0]?.id || '',
      valor: '',
      fecha: fechaHoy(),
    })
    setModal('abono')
  }

  async function crearAbono(event) {
    event.preventDefault()
    const pagado = leerMonto(abono.valor)
    if (!abono.deudaId || !Number.isFinite(pagado) || pagado <= 0 || !abono.fecha) {
      setErrorModal('Selecciona la deuda, el valor y la fecha del abono.')
      return
    }
    setCreando(true)
    setErrorModal('')
    try {
      const resultado = await pedir('/api/abonos', {
        method: 'POST',
        token,
        datos: {
          deudaId: abono.deudaId,
          valor: pagado,
          fecha: abono.fecha,
        },
      })
      const deuda = (panel?.deudas || []).find((item) => item.id === abono.deudaId)
      setPanel((actual) =>
        aplicarPago(actual, {
          deudaId: abono.deudaId,
          clienteId: deuda?.cliente_id,
          valor: resultado.valor ?? pagado,
          fecha: abono.fecha,
          estado: resultado.estado,
          nombrePersonal: deuda?.nombre_personal,
          nombreNegocio: deuda?.nombre_negocio,
        }),
      )
      await cargar()
      setModal('')
      setAviso(resultado.estado === 'cancelada' ? 'Deuda cancelada.' : 'Abono registrado.')
      setError('')
    } catch (abonoError) {
      setErrorModal(abonoError.message)
    } finally {
      setCreando(false)
    }
  }

  function abrirModal(tipo) {
    setErrorModal('')
    setEditandoId('')
    setNombreRuta('')
    setCorredorRuta('')
    setClientesRuta([])
    setCorredor(vacioCorredor)
    setCliente(vacioCliente)
    setDeuda({ ...vacioDeuda, fecha: fechaHoy() })
    setMostrarSugerencias(false)
    setModal(tipo)
  }

  function abrirEdicion(tipo, item) {
    setErrorModal('')
    setMostrarSugerencias(false)
    setEditandoId(item.id)
    if (tipo === 'ruta') {
      setNombreRuta(item.nombre || '')
      setCorredorRuta(item.corredor_id || '')
      setClientesRuta((item.clientes || []).map((cliente) => cliente.id))
    }
    if (tipo === 'cliente') {
      setCliente({
        nombrePersonal: item.nombre_personal || '',
        nombreNegocio: item.nombre_negocio || '',
        telefono1: item.telefono_1 || '',
        telefono2: item.telefono_2 || '',
        direccion: item.direccion || '',
        referido: item.referido || '',
      })
    }
    if (tipo === 'corredor') {
      setCorredor({
        nombre: item.nombre || '',
        correo: item.correo || '',
        telefono: item.telefono || '',
        documento: item.documento || '',
        zona: item.zona || '',
        contrasena: '',
      })
    }
    if (tipo === 'deuda') {
      setDeuda({
        busqueda: `${item.nombre_personal} · ${item.nombre_negocio}`,
        clienteId: item.cliente_id,
        porcentaje: String(Number(item.porcentaje)),
        valorPrestamo: String(item.valor_prestamo),
        numeroCuotas: String(item.numero_cuotas),
        plazo: item.plazo,
        fecha: String(item.fecha).slice(0, 10),
      })
    }
    setModal(tipo)
  }

  function escribirBusqueda(valor) {
    setDeuda((actual) => ({ ...actual, busqueda: valor, clienteId: '' }))
    setMostrarSugerencias(true)
  }

  function elegirCliente(persona) {
    setDeuda((actual) => ({
      ...actual,
      clienteId: persona.id,
      busqueda: `${persona.nombre_personal} · ${persona.nombre_negocio}`,
    }))
    setMostrarSugerencias(false)
  }

  async function crearRuta(event) {
    event.preventDefault()
    if (!nombreRuta.trim() || !corredorRuta || !clientesRuta.length) {
      setErrorModal('Escribe el nombre, asigna un corredor y añade clientes con deuda activa.')
      return
    }
    setCreando(true)
    setErrorModal('')
    try {
      await pedir(editandoId ? `/api/rutas/${editandoId}` : '/api/rutas', {
        method: editandoId ? 'PUT' : 'POST',
        token,
        datos: {
          nombre: nombreRuta.trim(),
          corredorId: corredorRuta,
          clienteIds: clientesRuta,
        },
      })
      await cargar()
      setModal('')
      setAviso(editandoId ? 'Ruta actualizada.' : 'Ruta creada.')
      setError('')
    } catch (rutaError) {
      setErrorModal(rutaError.message)
    } finally {
      setCreando(false)
    }
  }

  async function crearCorredor(event) {
    event.preventDefault()
    if (
      !corredor.nombre.trim() ||
      !corredor.correo.trim() ||
      !corredor.telefono.trim() ||
      !corredor.documento.trim() ||
      !corredor.zona.trim() ||
      (!editandoId && !corredor.contrasena)
    ) {
      setErrorModal('Completa los datos del corredor.')
      return
    }
    if (corredor.contrasena && corredor.contrasena.length < 6) {
      setErrorModal('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    setCreando(true)
    setErrorModal('')
    try {
      await pedir(editandoId ? `/api/corredores/${editandoId}` : '/api/corredores', {
        method: editandoId ? 'PUT' : 'POST',
        token,
        datos: {
          nombre: corredor.nombre.trim(),
          correo: corredor.correo.trim(),
          telefono: corredor.telefono.trim(),
          documento: corredor.documento.trim(),
          zona: corredor.zona.trim(),
          contrasena: corredor.contrasena,
        },
      })
      await cargar()
      setModal('')
      setAviso(editandoId ? 'Corredor actualizado.' : 'Corredor creado.')
      setError('')
    } catch (corredorError) {
      setErrorModal(corredorError.message)
    } finally {
      setCreando(false)
    }
  }

  function cambiarCorredor(campo, valor) {
    setCorredor((actual) => ({ ...actual, [campo]: valor }))
  }

  function cambiarCliente(campo, valor) {
    setCliente((actual) => ({ ...actual, [campo]: valor }))
  }

  function cambiarDeuda(campo, valor) {
    setDeuda((actual) => ({ ...actual, [campo]: valor }))
  }

  async function crearDeuda(event) {
    event.preventDefault()
    if (!deuda.clienteId || !deuda.porcentaje || !deuda.valorPrestamo || !deuda.numeroCuotas || !deuda.plazo || !deuda.fecha) {
      setErrorModal('Completa cliente, interés, préstamo, cuotas, plazo y fecha.')
      return
    }
    setCreando(true)
    setErrorModal('')
    try {
      await pedir(editandoId ? `/api/deudas/${editandoId}` : '/api/deudas', {
        method: editandoId ? 'PUT' : 'POST',
        token,
        datos: {
          clienteId: deuda.clienteId,
          porcentaje: Number(deuda.porcentaje),
          valorPrestamo: deuda.valorPrestamo,
          numeroCuotas: Number(deuda.numeroCuotas),
          plazo: deuda.plazo,
          fecha: deuda.fecha,
        },
      })
      await cargar()
      setModal('')
      setAviso(editandoId ? 'Deuda actualizada.' : 'Deuda creada.')
      setError('')
    } catch (deudaError) {
      setErrorModal(deudaError.message)
    } finally {
      setCreando(false)
    }
  }

  async function crearCliente(event) {
    event.preventDefault()
    if (
      !cliente.nombrePersonal.trim() ||
      !cliente.nombreNegocio.trim() ||
      !cliente.telefono1.trim() ||
      !cliente.direccion.trim()
    ) {
      setErrorModal('Completa nombre personal, nombre del negocio, teléfono 1 y dirección.')
      return
    }
    setCreando(true)
    setErrorModal('')
    try {
      await pedir(editandoId ? `/api/clientes/${editandoId}` : '/api/clientes', {
        method: editandoId ? 'PUT' : 'POST',
        token,
        datos: {
          nombrePersonal: cliente.nombrePersonal.trim(),
          nombreNegocio: cliente.nombreNegocio.trim(),
          telefono1: cliente.telefono1.trim(),
          telefono2: cliente.telefono2.trim(),
          direccion: cliente.direccion.trim(),
          referido: cliente.referido.trim(),
        },
      })
      await cargar()
      setModal('')
      setAviso(editandoId ? 'Cliente actualizado.' : 'Cliente creado.')
      setError('')
    } catch (clienteError) {
      setErrorModal(clienteError.message)
    } finally {
      setCreando(false)
    }
  }

  function reflejarPago(pago) {
    setPanel((actual) => aplicarPago(actual, pago))
  }

  if (panel?.usuario?.rol === 'corredor') {
    return (
      <PanelCorredor panel={panel} token={token} onSalir={onSalir} onActualizar={cargar} onPago={reflejarPago} />
    )
  }

  const cifras = totales(panel?.deudas)

  return (
    <div className="app-dashboard">
      <header className="barra">
        <img className="logo logo-barra" src={logo} alt="GotaApp" />
        <div className="barra-titulo">
          <p className="barra-sistema">Sistema de gestión gota gota</p>
          <p className="barra-usuario">
            {panel ? `${panel.usuario.nombre} · ${panel.usuario.rol}` : 'Cargando...'}
          </p>
        </div>
        <button className="button button-salir" type="button" onClick={onSalir}>
          <Icono icono={LogOut} size={16} />
          Salir
        </button>
      </header>

      <Marcadores
        moneda={panel?.moneda}
        items={[
          ['Dinero prestado', cifras.prestado],
          ['Dinero retornado', cifras.retornado],
          ['Utilidades actuales', cifras.utilidadActual],
          ['Proyección de utilidades', cifras.utilidadProyectada],
        ]}
      />

      <main className="contenido">
        <section className="panel lista lista-desplegable">
          <details>
            <Resumen icono={Settings}>Configuración</Resumen>
            <div className="lista-cuerpo">
          <div className="field">
            <label htmlFor="moneda">Formato de moneda</label>
            <select
              id="moneda"
              name="moneda"
              value={codigoMoneda}
              onChange={(event) => guardarMoneda(event.target.value)}
              disabled={!esAdministrador}
            >
              {MONEDAS.map(([codigo, etiqueta]) => (
                <option key={codigo} value={codigo}>
                  {etiqueta}
                </option>
              ))}
            </select>
          </div>
          <form onSubmit={guardarInteres} noValidate>
            <div className="field">
              <label htmlFor="porcentaje">Porcentaje de interés</label>
              <input
                id="porcentaje"
                name="porcentaje"
                inputMode="decimal"
                value={porcentaje}
                onChange={(event) => setPorcentaje(event.target.value)}
                disabled={!esAdministrador}
              />
            </div>
            {esAdministrador ? (
              <button className="button button-ajuste" type="submit" disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            ) : null}
          </form>
          {panel?.porcentajes?.length ? (
            <ul className="porcentajes">
              {panel.porcentajes.map((item) => (
                <li key={item.id}>{item.porcentaje}%</li>
              ))}
            </ul>
          ) : (
            <p className="nota">Aún no hay porcentajes.</p>
          )}
            </div>
          </details>
        </section>

        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
        {aviso ? <p className="aviso">{aviso}</p> : null}

        {esAdministrador ? (
          <div className="acciones">
            <button className="button button-ajuste" type="button" onClick={() => abrirModal('ruta')}>
              <Icono icono={Route} size={16} />
              Crear ruta
            </button>
            <button className="button button-secundario-linea" type="button" onClick={() => abrirModal('corredor')}>
              <Icono icono={UserPlus} size={16} />
              Crear corredor
            </button>
            <button className="button button-ajuste" type="button" onClick={() => abrirModal('cliente')}>
              <Icono icono={Users} size={16} />
              Crear cliente
            </button>
            <button className="button button-secundario-linea" type="button" onClick={() => abrirModal('deuda')}>
              <Icono icono={Wallet} size={16} />
              Crear deuda
            </button>
          </div>
        ) : null}

        <section className="panel lista">
          <h2 className="resumen-titulo">
            <Icono icono={Route} />
            Rutas
          </h2>
          {panel?.rutas?.length ? (
            <ul>
              {panel.rutas.map((ruta) => (
                <li key={ruta.id}>
                  <span>{ruta.nombre}</span>
                  <span>{ruta.corredor_nombre || 'Sin corredor'}</span>
                  <span>
                    {(ruta.clientes || []).map((cliente) => cliente.nombre_personal).join(', ') || 'Sin clientes'}
                  </span>
                  {esAdministrador ? (
                    <button className="button button-secondary button-editar" type="button" onClick={() => abrirEdicion('ruta', ruta)}>
                      <Icono icono={Pencil} size={15} />
                      Editar
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p>Aún no hay rutas.</p>
          )}
        </section>

        <section className="panel lista lista-desplegable">
          <details>
            <Resumen icono={HandCoins}>Pendientes por cobrar</Resumen>
            <div className="lista-cuerpo">
              <div className="filtros-cobro" role="group" aria-label="Filtrar cobros">
                {[
                  ['hoy', 'Hoy', Sun],
                  ['manana', 'Mañana', Sunrise],
                  ['semana', 'Esta semana', CalendarRange],
                ].map(([valor, etiqueta, icono]) => (
                  <button
                    key={valor}
                    className={`button button-secondary${filtroCobro === valor ? ' filtro-activo' : ''}`}
                    type="button"
                    aria-pressed={filtroCobro === valor}
                    onClick={() => setFiltroCobro(valor)}
                  >
                    <Icono icono={icono} size={15} />
                    {etiqueta}
                  </button>
                ))}
              </div>
              {cobros.length ? (
                <ul>
                  {cobros.map((item) => (
                    <li key={item.id}>
                      <strong>{item.nombre}</strong>
                      <span>{item.negocio}</span>
                      <span>
                        {item.fecha} · {item.plazo}
                      </span>
                      <span>{dinero(item.valor)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No hay cobros para este periodo.</p>
              )}
            </div>
          </details>
        </section>

        <section className="panel lista lista-desplegable">
          <details>
            <Resumen icono={Receipt}>Deudas</Resumen>
            <div className="lista-cuerpo">
              {panel?.deudas?.length ? (
                <ul>
                  {panel.deudas.map((item) => (
                    <li key={item.id}>
                      <strong>{item.nombre_personal}</strong>
                      <span>{item.nombre_negocio}</span>
                      <span className={item.estado === 'cancelada' ? 'estado-cancelada' : 'estado-activa'}>
                        {item.estado === 'cancelada' ? 'Cancelada' : 'Activa'}
                      </span>
                      <span>
                        Préstamo {dinero(item.valor_prestamo)} · {item.numero_cuotas} cuotas {item.plazo}
                      </span>
                      <span>
                        Cuota {dinero(item.valor_cuota)} · Saldo {dinero(item.saldo)} · {String(item.fecha).slice(0, 10)}
                      </span>
                      {esAdministrador ? (
                        <button className="button button-secondary button-editar" type="button" onClick={() => abrirEdicion('deuda', item)}>
                          <Icono icono={Pencil} size={15} />
                          Editar
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Aún no hay deudas.</p>
              )}
            </div>
          </details>
        </section>

        <section className="panel lista lista-desplegable">
          <details>
            <Resumen icono={ClipboardList}>Pagos registrados</Resumen>
            <div className="lista-cuerpo">
              {panel?.abonos?.length ? (
                <div className="tabla-contenedor">
                  <table className="tabla">
                    <thead>
                      <tr>
                        <th>Cliente</th>
                        <th>Valor pagado</th>
                        <th>Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {panel.abonos.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <strong>{item.nombre_personal}</strong>
                            <span className="tabla-detalle">{item.nombre_negocio}</span>
                          </td>
                          <td>{dinero(item.valor)}</td>
                          <td>{fechaVisible(item.fecha)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>Aún no hay pagos registrados.</p>
              )}
            </div>
          </details>
        </section>

        <section className="panel lista lista-desplegable">
          <details>
            <Resumen icono={Users}>Clientes</Resumen>
            <div className="lista-cuerpo">
              {panel?.clientes?.length ? (
                <ul>
                  {panel.clientes.map((persona) => (
                    <li key={persona.id}>
                      <strong>{persona.nombre_personal}</strong>
                      <span>{persona.nombre_negocio}</span>
                      <span>{persona.telefono_1}</span>
                      <span>{persona.direccion}</span>
                      {(panel?.deudas || [])
                        .filter((item) => item.cliente_id === persona.id)
                        .map((item) => (
                          <span key={item.id} className={item.estado === 'cancelada' ? 'estado-cancelada' : 'estado-activa'}>
                            Deuda {item.estado === 'cancelada' ? 'cancelada' : 'activa'} · Saldo {dinero(item.saldo)}
                          </span>
                        ))}
                      {(panel?.abonos || [])
                        .filter((item) => item.cliente_id === persona.id)
                        .map((item) => (
                          <span key={item.id}>
                            Abono {dinero(item.valor)} · {fechaVisible(item.fecha)}
                          </span>
                        ))}
                      {esAdministrador ? (
                        <div className="acciones-item">
                          <button className="button button-secondary button-editar" type="button" onClick={() => abrirEdicion('cliente', persona)}>
                            <Icono icono={Pencil} size={15} />
                            Editar
                          </button>
                          {(panel?.deudas || []).some(
                            (item) => item.cliente_id === persona.id && item.estado !== 'cancelada' && Number(item.saldo) > 0,
                          ) ? (
                            <button className="button button-editar" type="button" onClick={() => abrirAbono(persona)}>
                              <Icono icono={Banknote} size={15} />
                              Abonar
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Aún no hay clientes.</p>
              )}
            </div>
          </details>
        </section>

        <section className="panel lista lista-desplegable">
          <details>
            <Resumen icono={UserPlus}>Corredores</Resumen>
            <div className="lista-cuerpo">
              {panel?.corredores?.length ? (
                <ul>
                  {panel.corredores.map((persona) => (
                    <li key={persona.id}>
                      <strong>{persona.nombre}</strong>
                      <span>{persona.correo}</span>
                      <span>{persona.telefono}</span>
                      <span>{persona.documento}</span>
                      <span>{persona.zona}</span>
                      {esAdministrador ? (
                        <button className="button button-secondary button-editar" type="button" onClick={() => abrirEdicion('corredor', persona)}>
                          <Icono icono={Pencil} size={15} />
                          Editar
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Aún no hay corredores.</p>
              )}
            </div>
          </details>
        </section>
      </main>

      {modal === 'ruta' ? (
        <div className="overlay" onClick={() => setModal('')}>
          <form
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-ruta"
            onClick={(event) => event.stopPropagation()}
            onSubmit={crearRuta}
            noValidate
          >
            <header className="modal-header">
              <h2 id="titulo-ruta">{editandoId ? 'Editar ruta' : 'Crear ruta'}</h2>
            </header>
            <div className="field">
              <label htmlFor="nombre-ruta">Nombre</label>
              <input
                id="nombre-ruta"
                name="nombre"
                autoFocus
                value={nombreRuta}
                onChange={(event) => setNombreRuta(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="corredor-ruta">Corredor</label>
              <select
                id="corredor-ruta"
                name="corredorId"
                value={corredorRuta}
                onChange={(event) => setCorredorRuta(event.target.value)}
              >
                <option value="">Selecciona un corredor</option>
                {(panel?.corredores || []).map((persona) => (
                  <option key={persona.id} value={persona.id}>
                    {persona.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <p className="etiqueta" id="clientes-ruta-titulo">Clientes con deuda activa</p>
              <div className="opciones-clientes" role="group" aria-labelledby="clientes-ruta-titulo">
                {clientesRutaDisponibles.length ? clientesRutaDisponibles.map((persona) => (
                    <label key={persona.id} className="opcion-cliente">
                      <input
                        type="checkbox"
                        checked={clientesRuta.includes(persona.id)}
                        onChange={() =>
                          setClientesRuta((actual) =>
                            actual.includes(persona.id)
                              ? actual.filter((id) => id !== persona.id)
                              : [...actual, persona.id],
                          )
                        }
                      />
                      <span>
                        {persona.nombre_personal} · {persona.nombre_negocio}
                      </span>
                    </label>
                  )) : (
                  <p className="nota">No hay clientes con deuda activa disponibles.</p>
                )}
              </div>
            </div>
            {errorModal ? (
              <p className="error" role="alert">
                {errorModal}
              </p>
            ) : null}
            <div className="modal-actions">
              <button className="button button-secondary" type="button" onClick={() => setModal('')} disabled={creando}>
                Cancelar
              </button>
              <button className="button" type="submit" disabled={creando}>
                {creando ? 'Guardando...' : editandoId ? 'Guardar' : 'Crear ruta'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {modal === 'deuda' ? (
        <div className="overlay" onClick={() => setModal('')}>
          <form
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-deuda"
            onClick={(event) => event.stopPropagation()}
            onSubmit={crearDeuda}
            noValidate
          >
            <header className="modal-header">
              <h2 id="titulo-deuda">{editandoId ? 'Editar deuda' : 'Crear deuda'}</h2>
            </header>
            <div className="field buscador">
              <label htmlFor="buscar-cliente">Buscar cliente</label>
              <input
                id="buscar-cliente"
                name="busqueda"
                autoFocus
                autoComplete="off"
                role="combobox"
                aria-expanded={mostrarSugerencias && Boolean(textoBusqueda)}
                aria-controls="sugerencias-cliente"
                aria-autocomplete="list"
                value={deuda.busqueda}
                onChange={(event) => escribirBusqueda(event.target.value)}
                onFocus={() => setMostrarSugerencias(true)}
                onBlur={() => setMostrarSugerencias(false)}
              />
              {mostrarSugerencias && textoBusqueda ? (
                <ul id="sugerencias-cliente" className="sugerencias" role="listbox">
                  {sugerencias.length ? (
                    sugerencias.map((persona) => (
                      <li key={persona.id} role="presentation">
                        <button
                          type="button"
                          role="option"
                          aria-selected={deuda.clienteId === persona.id}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => elegirCliente(persona)}
                        >
                          <strong>{persona.nombre_personal}</strong>
                          <span>{persona.nombre_negocio}</span>
                          <span>{persona.telefono_1}</span>
                        </button>
                      </li>
                    ))
                  ) : (
                    <li className="sugerencia-vacia">Ningún cliente coincide.</li>
                  )}
                </ul>
              ) : null}
              {deuda.clienteId ? <p className="cliente-elegido">Cliente seleccionado.</p> : null}
            </div>
            <div className="field">
              <label htmlFor="interes-deuda">Porcentaje de interés</label>
              <select
                id="interes-deuda"
                name="porcentaje"
                value={deuda.porcentaje}
                onChange={(event) => cambiarDeuda('porcentaje', event.target.value)}
              >
                <option value="">Selecciona un interés</option>
                {(panel?.porcentajes || []).map((item) => (
                  <option key={item.id} value={String(Number(item.porcentaje))}>
                    {Number(item.porcentaje)}%
                  </option>
                ))}
                {deuda.porcentaje &&
                !(panel?.porcentajes || []).some(
                  (item) => String(Number(item.porcentaje)) === String(Number(deuda.porcentaje)),
                ) ? (
                  <option value={String(Number(deuda.porcentaje))}>{Number(deuda.porcentaje)}%</option>
                ) : null}
              </select>
            </div>
            <div className="campos-dobles">
              <div className="field">
                <label htmlFor="valor-prestamo">Valor del préstamo</label>
                <input
                  id="valor-prestamo"
                  name="valorPrestamo"
                  inputMode="decimal"
                  value={deuda.valorPrestamo}
                  onChange={(event) => cambiarDeuda('valorPrestamo', event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="numero-cuotas">Número de cuotas</label>
                <input
                  id="numero-cuotas"
                  name="numeroCuotas"
                  inputMode="numeric"
                  value={deuda.numeroCuotas}
                  onChange={(event) => cambiarDeuda('numeroCuotas', event.target.value)}
                />
              </div>
            </div>
            <div className="campos-dobles">
              <div className="field">
                <label htmlFor="plazo-deuda">Plazo</label>
                <select
                  id="plazo-deuda"
                  name="plazo"
                  value={deuda.plazo}
                  onChange={(event) => cambiarDeuda('plazo', event.target.value)}
                >
                  {plazos.map(([valor, etiqueta]) => (
                    <option key={valor} value={valor}>
                      {etiqueta}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="fecha-deuda">Fecha</label>
                <input
                  id="fecha-deuda"
                  name="fecha"
                  type="date"
                  value={deuda.fecha}
                  onChange={(event) => cambiarDeuda('fecha', event.target.value)}
                />
              </div>
            </div>
            <p className="cuota-calculada">
              Valor de la cuota: {cuotaCalculada(deuda) ? dinero(cuotaCalculada(deuda)) : '—'}
            </p>
            {errorModal ? (
              <p className="error" role="alert">
                {errorModal}
              </p>
            ) : null}
            <div className="modal-actions">
              <button className="button button-secondary" type="button" onClick={() => setModal('')} disabled={creando}>
                Cancelar
              </button>
              <button className="button" type="submit" disabled={creando}>
                {creando ? 'Guardando...' : editandoId ? 'Guardar' : 'Crear deuda'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {modal === 'cliente' ? (
        <div className="overlay" onClick={() => setModal('')}>
          <form
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-cliente"
            onClick={(event) => event.stopPropagation()}
            onSubmit={crearCliente}
            noValidate
          >
            <header className="modal-header">
              <h2 id="titulo-cliente">{editandoId ? 'Editar cliente' : 'Crear cliente'}</h2>
            </header>
            <div className="field">
              <label htmlFor="nombre-personal">Nombre personal</label>
              <input
                id="nombre-personal"
                name="nombrePersonal"
                autoFocus
                value={cliente.nombrePersonal}
                onChange={(event) => cambiarCliente('nombrePersonal', event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="nombre-negocio">Nombre del negocio</label>
              <input
                id="nombre-negocio"
                name="nombreNegocio"
                value={cliente.nombreNegocio}
                onChange={(event) => cambiarCliente('nombreNegocio', event.target.value)}
              />
            </div>
            <div className="campos-dobles">
              <div className="field">
                <label htmlFor="telefono-1">Teléfono 1</label>
                <input
                  id="telefono-1"
                  name="telefono1"
                  inputMode="tel"
                  value={cliente.telefono1}
                  onChange={(event) => cambiarCliente('telefono1', event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="telefono-2">Teléfono 2</label>
                <input
                  id="telefono-2"
                  name="telefono2"
                  inputMode="tel"
                  value={cliente.telefono2}
                  onChange={(event) => cambiarCliente('telefono2', event.target.value)}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="direccion-cliente">Dirección</label>
              <input
                id="direccion-cliente"
                name="direccion"
                value={cliente.direccion}
                onChange={(event) => cambiarCliente('direccion', event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="referido-cliente">Referido</label>
              <input
                id="referido-cliente"
                name="referido"
                value={cliente.referido}
                onChange={(event) => cambiarCliente('referido', event.target.value)}
              />
            </div>
            {errorModal ? (
              <p className="error" role="alert">
                {errorModal}
              </p>
            ) : null}
            <div className="modal-actions">
              <button className="button button-secondary" type="button" onClick={() => setModal('')} disabled={creando}>
                Cancelar
              </button>
              <button className="button" type="submit" disabled={creando}>
                {creando ? 'Guardando...' : editandoId ? 'Guardar' : 'Crear cliente'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {modal === 'corredor' ? (
        <div className="overlay" onClick={() => setModal('')}>
          <form
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-corredor"
            onClick={(event) => event.stopPropagation()}
            onSubmit={crearCorredor}
            noValidate
          >
            <header className="modal-header">
              <h2 id="titulo-corredor">{editandoId ? 'Editar corredor' : 'Crear corredor'}</h2>
            </header>
            <div className="field">
              <label htmlFor="nombre-corredor">Nombre</label>
              <input
                id="nombre-corredor"
                name="nombre"
                autoFocus
                value={corredor.nombre}
                onChange={(event) => cambiarCorredor('nombre', event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="correo-corredor">Correo</label>
              <input
                id="correo-corredor"
                name="correo"
                type="email"
                value={corredor.correo}
                onChange={(event) => cambiarCorredor('correo', event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="telefono-corredor">Teléfono</label>
              <input
                id="telefono-corredor"
                name="telefono"
                value={corredor.telefono}
                onChange={(event) => cambiarCorredor('telefono', event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="documento-corredor">Documento</label>
              <input
                id="documento-corredor"
                name="documento"
                value={corredor.documento}
                onChange={(event) => cambiarCorredor('documento', event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="zona-corredor">Zona</label>
              <input
                id="zona-corredor"
                name="zona"
                value={corredor.zona}
                onChange={(event) => cambiarCorredor('zona', event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="contrasena-corredor">{editandoId ? 'Nueva contraseña' : 'Contraseña'}</label>
              <input
                id="contrasena-corredor"
                name="contrasena"
                type="password"
                autoComplete="new-password"
                value={corredor.contrasena}
                onChange={(event) => cambiarCorredor('contrasena', event.target.value)}
              />
              {editandoId ? <p className="nota">Si la dejas vacía, se conserva la contraseña actual.</p> : null}
            </div>
            {errorModal ? (
              <p className="error" role="alert">
                {errorModal}
              </p>
            ) : null}
            <div className="modal-actions">
              <button className="button button-secondary" type="button" onClick={() => setModal('')} disabled={creando}>
                Cancelar
              </button>
              <button className="button" type="submit" disabled={creando}>
                {creando ? 'Guardando...' : editandoId ? 'Guardar' : 'Crear corredor'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {modal === 'abono' ? (
        <div className="overlay" onClick={() => setModal('')}>
          <form
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-abono"
            onClick={(event) => event.stopPropagation()}
            onSubmit={crearAbono}
            noValidate
          >
            <header className="modal-header">
              <h2 id="titulo-abono">Registrar abono</h2>
            </header>
            <div className="field">
              <label htmlFor="deuda-abono">Deuda</label>
              <select
                id="deuda-abono"
                name="deudaId"
                value={abono.deudaId}
                onChange={(event) => setAbono((actual) => ({ ...actual, deudaId: event.target.value }))}
              >
                {(panel?.deudas || [])
                  .filter(
                    (item) =>
                      item.cliente_id === abono.clienteId && item.estado !== 'cancelada' && Number(item.saldo) > 0,
                  )
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nombre_personal} · Saldo {dinero(item.saldo)}
                    </option>
                  ))}
              </select>
            </div>
            <div className="campos-dobles">
              <div className="field">
                <label htmlFor="valor-abono">Valor</label>
                <input
                  id="valor-abono"
                  name="valor"
                  inputMode="decimal"
                  value={abono.valor}
                  onChange={(event) =>
                    setAbono((actual) => ({ ...actual, valor: formatearMiles(event.target.value) }))
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="fecha-abono">Fecha</label>
                <input
                  id="fecha-abono"
                  name="fecha"
                  type="date"
                  value={abono.fecha}
                  onChange={(event) => setAbono((actual) => ({ ...actual, fecha: event.target.value }))}
                />
              </div>
            </div>
            {errorModal ? (
              <p className="error" role="alert">
                {errorModal}
              </p>
            ) : null}
            <div className="modal-actions">
              <button className="button button-secondary" type="button" onClick={() => setModal('')} disabled={creando}>
                Cancelar
              </button>
              <button className="button" type="submit" disabled={creando}>
                {creando ? 'Guardando...' : 'Registrar'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}
