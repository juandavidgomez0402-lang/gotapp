import { useEffect, useState } from 'react'
import logo from './assets/logo-gotaapp.png'
import { pedir } from './api'

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
  const [corredor, setCorredor] = useState(vacioCorredor)
  const [cliente, setCliente] = useState(vacioCliente)
  const [deuda, setDeuda] = useState(vacioDeuda)
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false)
  const [editandoId, setEditandoId] = useState('')
  const [errorModal, setErrorModal] = useState('')
  const [creando, setCreando] = useState(false)

  const esAdministrador = panel?.usuario?.rol === 'administrador'
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

  function abrirModal(tipo) {
    setErrorModal('')
    setEditandoId('')
    setNombreRuta('')
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
    if (tipo === 'ruta') setNombreRuta(item.nombre || '')
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
    if (!nombreRuta.trim()) {
      setErrorModal('Escribe el nombre de la ruta.')
      return
    }
    setCreando(true)
    setErrorModal('')
    try {
      await pedir(editandoId ? `/api/rutas/${editandoId}` : '/api/rutas', {
        method: editandoId ? 'PUT' : 'POST',
        token,
        datos: { nombre: nombreRuta.trim() },
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
          Salir
        </button>
      </header>

      <main className="contenido">
        <section className="panel">
          <h1>Intereses</h1>
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
              Crear ruta
            </button>
            <button className="button button-secundario-linea" type="button" onClick={() => abrirModal('corredor')}>
              Crear corredor
            </button>
            <button className="button button-ajuste" type="button" onClick={() => abrirModal('cliente')}>
              Crear cliente
            </button>
            <button className="button button-secundario-linea" type="button" onClick={() => abrirModal('deuda')}>
              Crear deuda
            </button>
          </div>
        ) : null}

        <section className="panel lista">
          <h2>Rutas</h2>
          {panel?.rutas?.length ? (
            <ul>
              {panel.rutas.map((ruta) => (
                <li key={ruta.id}>
                  <span>{ruta.nombre}</span>
                  {esAdministrador ? (
                    <button className="button button-secondary button-editar" type="button" onClick={() => abrirEdicion('ruta', ruta)}>
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
            <summary>
              <h2>Deudas</h2>
            </summary>
            <div className="lista-cuerpo">
              {panel?.deudas?.length ? (
                <ul>
                  {panel.deudas.map((item) => (
                    <li key={item.id}>
                      <strong>{item.nombre_personal}</strong>
                      <span>{item.nombre_negocio}</span>
                      <span>
                        Préstamo {item.valor_prestamo} · {item.numero_cuotas} cuotas {item.plazo}
                      </span>
                      <span>Cuota {item.valor_cuota} · {String(item.fecha).slice(0, 10)}</span>
                      {esAdministrador ? (
                        <button className="button button-secondary button-editar" type="button" onClick={() => abrirEdicion('deuda', item)}>
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
            <summary>
              <h2>Clientes</h2>
            </summary>
            <div className="lista-cuerpo">
              {panel?.clientes?.length ? (
                <ul>
                  {panel.clientes.map((persona) => (
                    <li key={persona.id}>
                      <strong>{persona.nombre_personal}</strong>
                      <span>{persona.nombre_negocio}</span>
                      <span>{persona.telefono_1}</span>
                      <span>{persona.direccion}</span>
                      {esAdministrador ? (
                        <button className="button button-secondary button-editar" type="button" onClick={() => abrirEdicion('cliente', persona)}>
                          Editar
                        </button>
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
            <summary>
              <h2>Corredores</h2>
            </summary>
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
              Valor de la cuota: {cuotaCalculada(deuda) || '—'}
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
    </div>
  )
}
