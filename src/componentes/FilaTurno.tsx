import { Pressable, StyleSheet, View } from 'react-native';
import { ESPACIADO, FUENTES, RADIO, TOQUE_MINIMO, useTema } from '@/tema';
import type { Turno } from '@/tipos';
import { formatearPrecio } from '@/utilidades/formato';
import { Icono, type NombreIcono } from './Icono';
import { Texto } from './Texto';

/** Lo que la fila tiene que mostrar: el estado del turno más lo que sabe la pantalla. */
export type Vista = 'libre' | 'propia' | 'reservado' | 'fijo' | 'mantenimiento' | 'pasado';

export function vistaDeTurno(turno: Turno, pasado: boolean, propia: boolean): Vista {
  if (propia) return 'propia';
  if (turno.estado === 'libre') return pasado ? 'pasado' : 'libre';
  return turno.estado;
}

interface Props {
  turno: Turno;
  vista: Vista;
  /** Texto extra: el grupo de la fija o el motivo del bloqueo. */
  detalle?: string | null;
  seleccionado?: boolean;
  onPress?: () => void;
}

/** Una hora de la grilla: "19:00  libre  $ 12.000". Se lee de noche y con sol. */
export function FilaTurno({ turno, vista, detalle, seleccionado, onPress }: Props) {
  const { c } = useTema();

  const config: Record<Vista, { etiqueta: string; icono: NombreIcono; color: string; fondo: string }> = {
    libre: { etiqueta: 'Libre', icono: 'checkmark-circle-outline', color: c.cesped, fondo: c.superficie },
    propia: { etiqueta: 'Tu reserva', icono: 'star', color: c.textoSobreAcento, fondo: c.acento },
    reservado: { etiqueta: 'Ocupado', icono: 'close-circle-outline', color: c.textoSuave, fondo: c.superficieElevada },
    fijo: { etiqueta: 'Fijo', icono: 'repeat-outline', color: c.textoSuave, fondo: c.superficieElevada },
    mantenimiento: { etiqueta: 'Mantenimiento', icono: 'construct-outline', color: c.aviso, fondo: c.fondoAviso },
    pasado: { etiqueta: 'Ya pasó', icono: 'time-outline', color: c.textoSuave, fondo: c.superficieElevada },
  };
  const k = config[vista];
  const reservable = vista === 'libre';
  // El verde césped de noche casi no se ve sobre la superficie oscura: el libre va con texto claro.
  const colorEstado = vista === 'libre' ? c.texto : k.color;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={reservable ? 'button' : 'text'}
      accessibilityState={{ selected: !!seleccionado, disabled: !reservable }}
      accessibilityLabel={`${turno.inicio}, ${k.etiqueta}${detalle ? `, ${detalle}` : ''}${reservable ? `, ${formatearPrecio(turno.precio)}` : ''}`}
      style={({ pressed }) => [
        estilos.fila,
        { backgroundColor: k.fondo, borderColor: seleccionado ? c.acento : c.borde },
        seleccionado && estilos.seleccionada,
        vista === 'pasado' && estilos.apagada,
        pressed && reservable && { opacity: 0.8 },
      ]}
    >
      {reservable && <View style={[estilos.marca, { backgroundColor: c.cesped }]} />}
      <Texto peso="negrita" style={estilos.hora} color={vista === 'propia' ? c.textoSobreAcento : c.texto}>
        {turno.inicio}
      </Texto>
      <Icono nombre={seleccionado ? 'radio-button-on' : k.icono} color={seleccionado ? c.cesped : vista === 'libre' ? c.cesped : k.color} tamano={20} />
      <View style={estilos.flex}>
        <Texto peso={reservable || vista === 'propia' ? 'seminegrita' : 'regular'} color={colorEstado}>
          {k.etiqueta.toUpperCase()}
        </Texto>
        {detalle ? (
          <Texto variante="chico" color={vista === 'propia' ? c.textoSobreAcento : k.color} numberOfLines={2}>
            {detalle}
          </Texto>
        ) : null}
      </View>
      {reservable && (
        <Texto variante="etiqueta" peso="seminegrita">
          {formatearPrecio(turno.precio)}
        </Texto>
      )}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  fila: {
    minHeight: TOQUE_MINIMO + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACIADO.m,
    paddingHorizontal: ESPACIADO.m,
    paddingVertical: ESPACIADO.s,
    borderRadius: RADIO.control,
    borderWidth: 1,
    overflow: 'hidden',
  },
  seleccionada: { borderWidth: 3 },
  apagada: { opacity: 0.55 },
  marca: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  hora: { fontFamily: FUENTES.negrita, width: 56 },
  flex: { flex: 1 },
});
