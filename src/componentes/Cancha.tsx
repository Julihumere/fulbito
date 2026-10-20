/**
 * Piezas de la cancha dibujadas con Views: franjas de césped cortado y
 * líneas de cal. Sin imágenes, así pesan nada y funcionan sin conexión.
 */
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useTema } from '@/tema';

export const GROSOR_CAL = 2;

/** Franjas horizontales de césped, como se ve una cancha recién cortada desde arriba. */
export function CespedFranjas({ franjas = 12, style }: { franjas?: number; style?: ViewStyle }) {
  const { c } = useTema();
  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      {Array.from({ length: franjas }, (_, i) => (
        <View key={i} style={{ flex: 1, backgroundColor: i % 2 === 0 ? c.cesped : c.cespedAlterno }} />
      ))}
    </View>
  );
}

/** Círculo de cal (círculo central, punto penal, medialuna). */
export function CirculoCal({ diametro, style, relleno }: { diametro: number; style?: ViewStyle; relleno?: boolean }) {
  const { c } = useTema();
  return (
    <View
      pointerEvents="none"
      style={[
        {
          width: diametro,
          height: diametro,
          borderRadius: diametro / 2,
          borderWidth: relleno ? 0 : GROSOR_CAL,
          borderColor: c.cal,
          backgroundColor: relleno ? c.cal : 'transparent',
        },
        style,
      ]}
    />
  );
}

/**
 * Medialuna del área: sólo se ve la parte del círculo que asoma por
 * encima de la línea del área.
 */
export function Medialuna({ diametro = 150, alto = 34 }: { diametro?: number; alto?: number }) {
  return (
    <View style={{ height: alto, width: diametro, overflow: 'hidden', alignSelf: 'center' }} pointerEvents="none">
      <CirculoCal diametro={diametro} />
    </View>
  );
}
