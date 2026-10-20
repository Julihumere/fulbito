import { Pressable, StyleSheet } from 'react-native';
import { ESPACIADO, RADIO, useTema } from '@/tema';
import { Icono, type NombreIcono } from './Icono';
import { Texto } from './Texto';

interface Props {
  texto: string;
  activo: boolean;
  onPress: () => void;
  icono?: NombreIcono;
  /** Color del deporte, para el ícono cuando el chip no está activo. */
  colorIcono?: string;
}

export function Chip({ texto, activo, onPress, icono, colorIcono }: Props) {
  const { c } = useTema();
  const colorTexto = activo ? c.textoSobreAcento : c.texto;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}
      accessibilityLabel={`Filtrar: ${texto}`}
      style={({ pressed }) => [
        estilos.chip,
        { backgroundColor: activo ? c.acento : c.superficie, borderColor: activo ? c.acento : c.borde },
        pressed && { opacity: 0.8 },
      ]}
    >
      {icono && <Icono nombre={icono} tamano={17} color={activo ? colorTexto : colorIcono ?? c.textoSuave} />}
      <Texto variante="etiqueta" peso={activo ? 'negrita' : 'regular'} color={colorTexto}>
        {texto}
      </Texto>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  chip: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACIADO.xs + 2,
    paddingHorizontal: ESPACIADO.m + 2,
    borderRadius: RADIO.pastilla,
    borderWidth: 1.5,
  },
});
