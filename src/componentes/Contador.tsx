import { Pressable, StyleSheet, View } from 'react-native';
import { ESPACIADO, RADIO, TOQUE_MINIMO, useTema } from '@/tema';
import { Icono } from './Icono';
import { Texto } from './Texto';

interface Props {
  etiqueta: string;
  valor: number;
  minimo: number;
  maximo: number;
  onCambiar: (n: number) => void;
}

/** "−  10  +" con botones grandes, para elegir cuántos van a ser. */
export function Contador({ etiqueta, valor, minimo, maximo, onCambiar }: Props) {
  const { c } = useTema();
  const boton = (icono: 'remove' | 'add', destino: number, texto: string) => {
    const inactivo = destino < minimo || destino > maximo;
    return (
      <Pressable
        onPress={() => onCambiar(destino)}
        disabled={inactivo}
        accessibilityRole="button"
        accessibilityLabel={texto}
        style={[estilos.boton, { borderColor: c.borde, backgroundColor: c.superficie }, inactivo && { opacity: 0.35 }]}
      >
        <Icono nombre={icono} color={c.texto} tamano={22} />
      </Pressable>
    );
  };
  return (
    <View style={estilos.fila} accessible={false}>
      <Texto variante="etiqueta" peso="seminegrita" style={estilos.flex}>
        {etiqueta}
      </Texto>
      {boton('remove', valor - 1, 'Uno menos')}
      <Texto peso="negrita" variante="subtitulo" style={estilos.valor} accessibilityLiveRegion="polite" accessibilityLabel={`${valor} ${etiqueta}`}>
        {valor}
      </Texto>
      {boton('add', valor + 1, 'Uno más')}
    </View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: ESPACIADO.s },
  flex: { flex: 1 },
  boton: {
    width: TOQUE_MINIMO,
    height: TOQUE_MINIMO,
    borderRadius: RADIO.control,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valor: { minWidth: 40, textAlign: 'center' },
});
