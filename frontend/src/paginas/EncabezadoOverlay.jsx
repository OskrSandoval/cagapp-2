/**
 * Encabezado de las pantallas superpuestas (Detalle, Crear Baño, Perfil,
 * Sugerencias): botón "←" con nombre accesible y el título. `refVolver`
 * permite que cada pantalla enfoque Volver al abrirse.
 */
export default function EncabezadoOverlay({ titulo, onVolver, refVolver }) {
  return (
    <div className="detalle-nav">
      <button type="button" ref={refVolver} className="detalle-volver" aria-label="Volver" onClick={onVolver}>
        ←
      </button>
      <span>{titulo}</span>
    </div>
  );
}
