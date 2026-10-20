import type { ComponentProps } from 'react';
import { Ionicons } from '@react-native-vector-icons/ionicons';
import glifos from '@react-native-vector-icons/ionicons/glyphmaps/Ionicons.json';

export type NombreIcono = ComponentProps<typeof Ionicons>['name'];

/** El ícono de un Deporte viene de la API como string: se valida antes de usarlo. */
export function nombreIconoSeguro(nombre: string, porDefecto: NombreIcono = 'ellipse-outline'): NombreIcono {
  return nombre in glifos ? (nombre as NombreIcono) : porDefecto;
}

interface Props {
  nombre: NombreIcono;
  tamano?: number;
  color: string;
}

export function Icono({ nombre, tamano = 20, color }: Props) {
  return <Ionicons name={nombre} size={tamano} color={color} accessibilityElementsHidden importantForAccessibility="no" />;
}
