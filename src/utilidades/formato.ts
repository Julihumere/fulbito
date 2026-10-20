/** "$ 12.000" — se arma a mano para no depender del soporte de Intl en cada teléfono. */
export function formatearPrecio(pesos: number): string {
  const entero = Math.round(pesos).toString();
  const conPuntos = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `$ ${conPuntos}`;
}

/** "Emiliano Ruiz" → "Emiliano" */
export function primerNombre(nombreCompleto: string): string {
  return nombreCompleto.trim().split(/\s+/)[0] ?? nombreCompleto;
}

/** "Emiliano Ruiz" → "ER" */
export function iniciales(nombreCompleto: string): string {
  return nombreCompleto
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function emailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
