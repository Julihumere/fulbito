import { StyleSheet, View } from 'react-native';
import { ESPACIADO, FUENTES, RADIO, useTema } from '@/tema';
import type { Espacio, Reserva, Turno } from '@/tipos';
import { fechaRelativa, horaCorta, horaDeIso, rangoHorario } from '@/utilidades/fechas';
import { formatearPrecio } from '@/utilidades/formato';
import { Icono } from './Icono';
import { Texto } from './Texto';

interface Props {
  /** Encabezado de la tarjeta. Por defecto, "Tu próximo turno". */
  titulo?: string;
  reserva: Reserva;
  turno: Turno;
  espacio: Espacio | undefined;
  activas: number;
  /** Momento de referencia (ms) calculado al cargar los datos. */
  ahora: number;
}

/** El próximo turno con forma de entrada: talón con la hora y el resto con los datos. */
export function TarjetaProximoTurno({ titulo = 'Tu próximo turno', reserva, turno, espacio, activas, ahora }: Props) {
  const { c } = useTema();
  const cuando = fechaRelativa(turno.fecha);
  const yaNoSeCancela = Date.parse(reserva.cancelableHasta) <= ahora;

  return (
    <View
      style={[estilos.entrada, { backgroundColor: c.superficie, borderColor: c.cesped }]}
      accessible
      accessibilityLabel={`${titulo}: ${espacio?.nombre ?? ''}, ${cuando} ${rangoHorario(turno.inicio, turno.fin)}. Código ${reserva.codigoQr}`}
    >
      <View style={[estilos.talon, { backgroundColor: c.cesped }]}>
        <Texto variante="chico" color={c.textoSobreCespedSuave}>
          {cuando}
        </Texto>
        <Texto variante="titulo" peso="negrita" color={c.textoSobreCesped} style={estilos.hora}>
          {horaCorta(turno.inicio)}
        </Texto>
        <Texto variante="chico" color={c.textoSobreCespedSuave}>
          hs
        </Texto>
      </View>

      {/* Troquel de la entrada */}
      <View style={[estilos.troquel, { borderColor: c.borde }]} />

      <View style={estilos.datos}>
        <Texto variante="chico" color={c.textoSuave}>
          {titulo}
        </Texto>
        <Texto peso="seminegrita" numberOfLines={2}>
          {espacio?.nombre ?? 'Espacio'}
        </Texto>
        <Texto variante="etiqueta" color={c.textoSuave}>
          {rangoHorario(turno.inicio, turno.fin)}
          {espacio ? `, ${espacio.complejo}` : ''}
        </Texto>
        <Texto variante="etiqueta">{formatearPrecio(turno.precio)}, se paga en el lugar</Texto>

        <View style={[estilos.codigo, { backgroundColor: c.superficieElevada, borderColor: c.borde }]}>
          <Icono nombre="qr-code-outline" color={c.texto} tamano={18} />
          <Texto variante="etiqueta" style={{ fontFamily: FUENTES.seminegrita }} selectable>
            {reserva.codigoQr}
          </Texto>
        </View>

        <Texto variante="chico" color={yaNoSeCancela ? c.aviso : c.textoSuave}>
          {yaNoSeCancela
            ? 'Ya no se cancela desde la app: avisale a la Dirección.'
            : `Cancelás sin aviso hasta las ${horaDeIso(reserva.cancelableHasta)} del día del turno.`}
        </Texto>
        <Texto variante="chico" color={c.textoSuave}>
          Reservas activas: {activas} de 3
        </Texto>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  entrada: { flexDirection: 'row', borderRadius: RADIO.tarjeta, borderWidth: 2, overflow: 'hidden' },
  talon: { width: 84, alignItems: 'center', justifyContent: 'center', paddingVertical: ESPACIADO.l, gap: 2 },
  hora: { fontSize: 40, lineHeight: 44 },
  troquel: { width: 0, borderLeftWidth: 2, borderStyle: 'dashed', marginVertical: ESPACIADO.s },
  datos: { flex: 1, padding: ESPACIADO.m, gap: ESPACIADO.xs + 1 },
  codigo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACIADO.s,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: RADIO.tablero,
    paddingHorizontal: ESPACIADO.s,
    paddingVertical: ESPACIADO.xs,
    marginTop: ESPACIADO.xs,
  },
});
