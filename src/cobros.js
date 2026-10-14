export function fechaVisible(iso) {
  const [anio, mes, dia] = String(iso || '').slice(0, 10).split('-')
  if (!anio || !mes || !dia) return ''
  return `${dia}/${mes}/${anio}`
}

export function isoLocal(fecha = new Date()) {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${fecha.getFullYear()}-${mes}-${dia}`
}

export function sumarDias(iso, dias) {
  const [anio, mes, dia] = iso.slice(0, 10).split('-').map(Number)
  const fecha = new Date(anio, mes - 1, dia)
  fecha.setDate(fecha.getDate() + dias)
  return isoLocal(fecha)
}

export function sumarMeses(iso, meses) {
  const [anio, mes, dia] = iso.slice(0, 10).split('-').map(Number)
  const fecha = new Date(anio, mes - 1 + meses, dia)
  return isoLocal(fecha)
}

export function fechaCuota(deuda, indice) {
  const fecha = String(deuda.fecha).slice(0, 10)
  if (deuda.plazo === 'diario') return sumarDias(fecha, indice)
  if (deuda.plazo === 'semanal') return sumarDias(fecha, indice * 7)
  if (deuda.plazo === 'quincenal') return sumarDias(fecha, indice * 15)
  return sumarMeses(fecha, indice)
}

export function inicioSemana(iso) {
  const [anio, mes, dia] = iso.split('-').map(Number)
  const fecha = new Date(anio, mes - 1, dia)
  const desplazamiento = fecha.getDay() === 0 ? -6 : 1 - fecha.getDay()
  return sumarDias(iso, desplazamiento)
}

export function valorEnFecha(deuda, fechaObjetivo) {
  if (deuda.estado === 'cancelada') return 0
  const cuota = Number(deuda.valor_cuota)
  const abonado = Number(deuda.total_abonado || 0)
  const saldo = Number(deuda.saldo)
  const cuotas = Number(deuda.numero_cuotas)
  if (!Number.isFinite(cuota) || cuota <= 0 || saldo <= 0) return 0
  for (let indice = 1; indice <= cuotas; indice += 1) {
    if (fechaCuota(deuda, indice) !== fechaObjetivo) continue
    const umbral = Math.round(indice * cuota * 100) / 100
    if (abonado >= umbral - 0.009) return 0
    const falta = Math.round((umbral - abonado) * 100) / 100
    return Math.min(cuota, falta, saldo)
  }
  return 0
}

export function resumenHoy(deudas, abonos, hoy = isoLocal()) {
  let programado = 0
  let pendiente = 0
  for (const deuda of deudas || []) {
    const pagosHoy = (abonos || [])
      .filter((abono) => abono.deuda_id === deuda.id && String(abono.fecha).slice(0, 10) === hoy)
      .reduce((suma, abono) => suma + Number(abono.valor || 0), 0)
    const abonado = Number(deuda.total_abonado || 0)
    const previo = Math.max(0, Math.round((abonado - pagosHoy) * 100) / 100)
    const saldoPrevio = Math.round((Number(deuda.saldo || 0) + pagosHoy) * 100) / 100
    programado += valorEnFecha(
      {
        ...deuda,
        total_abonado: previo,
        saldo: saldoPrevio,
        estado: saldoPrevio > 0.009 ? 'activa' : deuda.estado,
      },
      hoy,
    )
    pendiente += valorEnFecha(deuda, hoy)
  }
  const recaudado = (abonos || [])
    .filter((abono) => String(abono.fecha).slice(0, 10) === hoy)
    .reduce((suma, abono) => suma + Number(abono.valor || 0), 0)
  const redondear = (numero) => Math.round(numero * 100) / 100
  return {
    programado: redondear(programado),
    recaudado: redondear(recaudado),
    pendiente: redondear(pendiente),
  }
}

export function pendientes(deudas, filtro, hoy = isoLocal()) {
  const manana = sumarDias(hoy, 1)
  const desde = filtro === 'semana' ? inicioSemana(hoy) : filtro === 'manana' ? manana : hoy
  const hasta = filtro === 'semana' ? sumarDias(desde, 6) : desde
  const lista = []
  for (const deuda of deudas || []) {
    let fecha = desde
    while (fecha <= hasta) {
      const valor = valorEnFecha(deuda, fecha)
      if (valor > 0) {
        lista.push({
          id: `${deuda.id}-${fecha}`,
          nombre: deuda.nombre_personal,
          negocio: deuda.nombre_negocio,
          fecha,
          valor,
          plazo: deuda.plazo,
        })
      }
      fecha = sumarDias(fecha, 1)
    }
  }
  return lista
}
