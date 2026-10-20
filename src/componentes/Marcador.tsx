import { StyleSheet, View } from 'react-native';
import { ESPACIADO, FUENTES, RADIO, useTema } from '@/tema';
import { Texto } from './Texto';

/** El nombre de la app en el tablero del estadio, con LEDs ámbar. */
export function Marcador({ tamano = 'chico' }: { tamano?: 'chico' | 'grande' }) {
  const { c } = useTema();
  const grande = tamano === 'grande';
  return (
    <View
      accessibilityRole="header"
      accessibilityLabel="Fulbito"
      style={[estilos.tablero, grande && estilos.tableroGrande, { backgroundColor: c.tablero, borderColor: c.tableroLed }]}
    >
      <Texto
        variante={grande ? 'marcador' : 'subtitulo'}
        peso="negrita"
        color={c.tableroLed}
        style={[estilos.led, { textShadowColor: c.tableroLed, fontFamily: FUENTES.negrita }]}
      >
        Fulbito!
      </Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  tablero: {
    alignSelf: 'flex-start',
    borderRadius: RADIO.tablero,
    borderWidth: 1,
    paddingHorizontal: ESPACIADO.m,
    paddingVertical: ESPACIADO.xs,
  },
  tableroGrande: { alignSelf: 'center', paddingHorizontal: ESPACIADO.l, paddingVertical: ESPACIADO.s },
  led: { textShadowRadius: 10, textShadowOffset: { width: 0, height: 0 } },
});
