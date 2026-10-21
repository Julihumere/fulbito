import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ESPACIADO, RADIO, TOQUE_MINIMO, useTema } from '@/tema';
import { fechaLarga, fechaRelativa, hoy, NOMBRES_DIAS, diaDeLaSemana, sumarDias } from '@/utilidades/fechas';
import { DIAS_RESERVABLES } from '@/utilidades/reglas';
import { Icono } from './Icono';
import { Texto } from './Texto';

interface Props {
  fecha: string;
  onCambiar: (fecha: string) => void;
}

/** "< Sábado 19 de septiembre >" y abajo los próximos siete días para saltar directo. */
export function SelectorDia({ fecha, onCambiar }: Props) {
  const { c } = useTema();
  const primero = hoy();
  const ultimo = sumarDias(primero, DIAS_RESERVABLES - 1);
  const dias = Array.from({ length: DIAS_RESERVABLES }, (_, i) => sumarDias(primero, i));

  return (
    <View style={estilos.contenedor}>
      <View style={[estilos.fila, { backgroundColor: c.superficie, borderColor: c.borde }]}>
        <Flecha icono="chevron-back" etiqueta="Día anterior" deshabilitada={fecha <= primero} onPress={() => onCambiar(sumarDias(fecha, -1))} />
        <Texto peso="seminegrita" centrado style={estilos.flex} accessibilityRole="header">
          {fechaLarga(fecha)}
        </Texto>
        <Flecha icono="chevron-forward" etiqueta="Día siguiente" deshabilitada={fecha >= ultimo} onPress={() => onCambiar(sumarDias(fecha, 1))} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.dias}>
        {dias.map((d) => {
          const activo = d === fecha;
          const relativa = fechaRelativa(d);
          const nombre = relativa === 'Hoy' || relativa === 'Mañana' ? relativa : NOMBRES_DIAS[diaDeLaSemana(d)].slice(0, 3);
          return (
            <Pressable
              key={d}
              onPress={() => onCambiar(d)}
              accessibilityRole="button"
              accessibilityState={{ selected: activo }}
              accessibilityLabel={fechaLarga(d)}
              style={[estilos.dia, { backgroundColor: activo ? c.acento : c.superficie, borderColor: activo ? c.acento : c.borde }]}
            >
              <Texto variante="chico" color={activo ? c.textoSobreAcento : c.textoSuave}>
                {nombre}
              </Texto>
              <Texto peso="negrita" color={activo ? c.textoSobreAcento : c.texto}>
                {d.slice(8, 10)}
              </Texto>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function Flecha({
  icono, etiqueta, deshabilitada, onPress,
}: { icono: 'chevron-back' | 'chevron-forward'; etiqueta: string; deshabilitada: boolean; onPress: () => void }) {
  const { c } = useTema();
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitada}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ disabled: deshabilitada }}
      style={[estilos.flecha, deshabilitada && { opacity: 0.3 }]}
    >
      <Icono nombre={icono} color={c.texto} tamano={24} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  contenedor: { gap: ESPACIADO.s },
  fila: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: RADIO.control },
  flex: { flex: 1 },
  flecha: { width: TOQUE_MINIMO, height: TOQUE_MINIMO, alignItems: 'center', justifyContent: 'center' },
  dias: { gap: ESPACIADO.s },
  dia: {
    minWidth: 56,
    minHeight: TOQUE_MINIMO + 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: RADIO.control,
    paddingHorizontal: ESPACIADO.s,
  },
});
