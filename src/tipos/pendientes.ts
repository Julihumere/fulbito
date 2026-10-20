/**
 * Tipos que el documento NO define y que hacen falta para avanzar.
 * Están separados a propósito: cuando la cátedra publique la API se
 * reemplazan por los oficiales sin tocar los tipos del documento.
 * Ver docs/ANALISIS.md, sección "Huecos".
 */
import type { Usuario } from './usuario';

/** Respuesta del inicio de sesión (endpoint no especificado todavía). */
export interface SesionIniciada {
  token: string;
  usuario: Usuario;
}

export interface CredencialesIngreso {
  email: string;
  contrasena: string;
}
