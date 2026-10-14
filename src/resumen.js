function redondear(numero) {
  return Math.round(Number(numero) * 100) / 100
}

function totalDeuda(deuda) {
  const total = Number(deuda.total)
  if (Number.isFinite(total) && total > 0) return total
  return Number(deuda.valor_cuota) * Number(deuda.numero_cuotas) || 0
}

function cobradoDeuda(deuda, total) {
  const abonado = Number(deuda.total_abonado)
  if (Number.isFinite(abonado)) return Math.min(Math.max(abonado, 0), total)
  return Math.max(0, redondear(total - Number(deuda.saldo || 0)))
}

export function totales(deudas) {
  let prestado = 0
  let retornado = 0
  let utilidadActual = 0
  let utilidadProyectada = 0
  for (const deuda of deudas || []) {
    const capital = Number(deuda.valor_prestamo) || 0
    const total = totalDeuda(deuda)
    const cobrado = cobradoDeuda(deuda, total)
    const interes = Math.max(0, total - capital)
    const fraccion = total > 0 ? cobrado / total : 0
    prestado += capital
    retornado += cobrado
    utilidadActual += interes * fraccion
    utilidadProyectada += interes * (1 - fraccion)
  }
  return {
    prestado: redondear(prestado),
    retornado: redondear(retornado),
    utilidadActual: redondear(utilidadActual),
    utilidadProyectada: redondear(utilidadProyectada),
  }
}

export function aplicarPago(panel, pago) {
  if (!panel) return panel
  const valor = redondear(pago.valor)
  const deudas = (panel.deudas || []).map((deuda) => {
    if (deuda.id !== pago.deudaId) return deuda
    const total = totalDeuda(deuda)
    const abonado = redondear((Number(deuda.total_abonado) || 0) + valor)
    const saldo = Math.max(0, redondear(total - abonado))
    return {
      ...deuda,
      total_abonado: abonado,
      saldo,
      estado: pago.estado || (saldo <= 0.009 ? 'cancelada' : 'activa'),
    }
  })
  const deuda = (panel.deudas || []).find((item) => item.id === pago.deudaId)
  return {
    ...panel,
    deudas,
    abonos: [
      {
        id: `local-${pago.deudaId}-${Date.now()}`,
        cliente_id: pago.clienteId || deuda?.cliente_id,
        deuda_id: pago.deudaId,
        valor,
        fecha: pago.fecha,
        nombre_personal: pago.nombrePersonal || deuda?.nombre_personal || '',
        nombre_negocio: pago.nombreNegocio || deuda?.nombre_negocio || '',
      },
      ...(panel.abonos || []),
    ],
  }
}
