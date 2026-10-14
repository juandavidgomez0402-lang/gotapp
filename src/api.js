export async function pedir(ruta, opciones = {}) {
  const headers = {}
  if (opciones.datos) headers['Content-Type'] = 'application/json'
  if (opciones.token) headers.Authorization = `Bearer ${opciones.token}`

  let respuesta
  try {
    respuesta = await fetch(ruta, {
      method: opciones.method || 'GET',
      headers,
      body: opciones.datos ? JSON.stringify(opciones.datos) : undefined,
    })
  } catch {
    throw new Error('No hay conexión con el servidor.')
  }

  const data = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok) {
    const error = new Error(data.error || 'No se pudo completar la operación.')
    error.status = respuesta.status
    throw error
  }
  return data
}
