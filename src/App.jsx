import { useEffect, useState } from 'react'
import { LogIn, UserPlus } from 'lucide-react'
import logo from './assets/logo-gotaapp.png'
import { pedir } from './api'
import Icono from './Icono'
import Dashboard from './Dashboard'
import './App.css'

const LLAVE_SESION = 'gotaapp-token'

function App() {
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [ingresando, setIngresando] = useState(false)

  const [registroAbierto, setRegistroAbierto] = useState(false)
  const [nombre, setNombre] = useState('')
  const [correoRegistro, setCorreoRegistro] = useState('')
  const [contrasenaRegistro, setContrasenaRegistro] = useState('')
  const [errorRegistro, setErrorRegistro] = useState('')
  const [creando, setCreando] = useState(false)
  const [token, setToken] = useState('')

  useEffect(() => {
    const guardado = sessionStorage.getItem(LLAVE_SESION)
    if (guardado) setToken(guardado)
  }, [])

  async function cerrarSesion() {
    const actual = sessionStorage.getItem(LLAVE_SESION)
    sessionStorage.removeItem(LLAVE_SESION)
    setToken('')
    setContrasena('')
    setAviso('')
    if (!actual) return
    await pedir('/api/sesion', { method: 'DELETE', token: actual }).catch(() => {})
  }

  useEffect(() => {
    if (!registroAbierto) return undefined

    function onKeyDown(event) {
      if (event.key === 'Escape') setRegistroAbierto(false)
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [registroAbierto])

  function abrirRegistro() {
    setErrorRegistro('')
    setNombre('')
    setCorreoRegistro('')
    setContrasenaRegistro('')
    setRegistroAbierto(true)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setAviso('')

    if (!correo.trim() || !contrasena) {
      setError('Completa correo y contraseña.')
      return
    }

    setError('')
    setIngresando(true)

    try {
      const sesion = await pedir('/api/login', {
        method: 'POST',
        datos: {
          correo: correo.trim(),
          contrasena,
        },
      })
      sessionStorage.setItem(LLAVE_SESION, sesion.token)
      setToken(sesion.token)
    } catch (authError) {
      setError(authError.message)
    } finally {
      setIngresando(false)
    }
  }

  async function handleRegistro(event) {
    event.preventDefault()

    const nombreLimpio = nombre.trim()
    const correoLimpio = correoRegistro.trim()

    if (!correoLimpio || !nombreLimpio || !contrasenaRegistro) {
      setErrorRegistro('Completa correo, nombre y contraseña.')
      return
    }

    if (contrasenaRegistro.length < 6) {
      setErrorRegistro('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    setErrorRegistro('')
    setCreando(true)

    try {
      await pedir('/api/registro', {
        method: 'POST',
        datos: {
          correo: correoLimpio,
          nombre: nombreLimpio,
          contrasena: contrasenaRegistro,
        },
      })
      setCorreo(correoLimpio)
      setContrasena('')
      setRegistroAbierto(false)
      setAviso('Cuenta creada. Ya puedes ingresar.')
      setError('')
    } catch (authError) {
      setErrorRegistro(authError.message)
    } finally {
      setCreando(false)
    }
  }

  if (token) {
    return <Dashboard token={token} onSalir={cerrarSesion} />
  }

  return (
    <main className="page">
      <form className="login" onSubmit={handleSubmit} noValidate>
        <header className="login-header">
          <img className="logo" src={logo} alt="GotaApp" />
          <h1>
            Sistema de gestión <span>gota gota</span>
          </h1>
        </header>

        <div className="field">
          <label htmlFor="correo">Correo</label>
          <input
            id="correo"
            name="correo"
            type="email"
            autoComplete="username"
            value={correo}
            onChange={(event) => setCorreo(event.target.value)}
            aria-invalid={Boolean(error)}
          />
        </div>

        <div className="field">
          <label htmlFor="contrasena">Contraseña</label>
          <input
            id="contrasena"
            name="contrasena"
            type="password"
            autoComplete="current-password"
            value={contrasena}
            onChange={(event) => setContrasena(event.target.value)}
            aria-invalid={Boolean(error)}
          />
        </div>

        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}

        {aviso ? <p className="aviso">{aviso}</p> : null}

        <div className="botones-dobles">
          <button className="button" type="submit" disabled={ingresando}>
            <Icono icono={LogIn} size={16} />
            {ingresando ? 'Ingresando...' : 'Ingresar'}
          </button>
          <button className="button button-secondary" type="button" onClick={abrirRegistro}>
            <Icono icono={UserPlus} size={16} />
            Crear cuenta
          </button>
        </div>
      </form>

      {registroAbierto ? (
        <div className="overlay" onClick={() => setRegistroAbierto(false)}>
          <form
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-registro"
            onClick={(event) => event.stopPropagation()}
            onSubmit={handleRegistro}
            noValidate
          >
            <header className="modal-header">
              <img className="logo logo-compacto" src={logo} alt="" />
              <h2 id="titulo-registro">Crear cuenta</h2>
            </header>

            <div className="field">
              <label htmlFor="correo-registro">Correo</label>
              <input
                id="correo-registro"
                name="correo"
                type="email"
                autoComplete="email"
                autoFocus
                value={correoRegistro}
                onChange={(event) => setCorreoRegistro(event.target.value)}
                aria-invalid={Boolean(errorRegistro)}
              />
            </div>

            <div className="field">
              <label htmlFor="nombre">Nombre</label>
              <input
                id="nombre"
                name="nombre"
                type="text"
                autoComplete="name"
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                aria-invalid={Boolean(errorRegistro)}
              />
            </div>

            <div className="field">
              <label htmlFor="contrasena-registro">Contraseña</label>
              <input
                id="contrasena-registro"
                name="contrasena"
                type="password"
                autoComplete="new-password"
                value={contrasenaRegistro}
                onChange={(event) => setContrasenaRegistro(event.target.value)}
                aria-invalid={Boolean(errorRegistro)}
              />
            </div>

            {errorRegistro ? (
              <p className="error" role="alert">
                {errorRegistro}
              </p>
            ) : null}

            <div className="modal-actions">
              <button
                className="button button-secondary"
                type="button"
                onClick={() => setRegistroAbierto(false)}
                disabled={creando}
              >
                Cancelar
              </button>
              <button className="button" type="submit" disabled={creando}>
                {creando ? 'Creando...' : 'Crear cuenta'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </main>
  )
}

export default App
