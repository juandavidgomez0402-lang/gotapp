export default function Icono({ icono: Dibujo, size = 18, className }) {
  return (
    <Dibujo
      className={className ? `icono ${className}` : 'icono'}
      size={size}
      strokeWidth={1.5}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
    />
  )
}
