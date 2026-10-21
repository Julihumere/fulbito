/**
 * Mi reserva: datos, código QR de ingreso, cómo llegar y cancelar.
 * Se arma con lo guardado en el teléfono: el QR se muestra en la puerta de la
 * cancha, donde la señal es mala.
 */
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { Icono } from '@/componentes/Icono';
import { abrirComoLlegar } from '@/componentes/MapaComplejo';
import { Texto } from '@/componentes/Texto';
import { useReservas } from '@/contexto/ReservasContexto';
import { useSesion } from '@/contexto/SesionContexto';
import { useCatalogo } from '@/hooks/useCatalogo';
import { aErrorApi, reservas as servicioReservas } from '@/servicios';
import { ESPACIADO, FUENTES, RADIO, useTema } from '@/tema';
import type { EstadoReserva } from '@/tipos';
import { fechaCorta, fechaDeIso, fechaRelativa, horaDeIso, rangoHorario } from '@/utilidades/fechas';
import { formatearPrecio } from '@/utilidades/formato';
import { turnoPasado } from '@/utilidades/grilla';
import { HORAS_CANCELACION, HORAS_RECORDATORIO } from '@/utilidades/reglas';

const NOMBRE_ESTADO: Record<EstadoReserva, string> = {
  confirmada: 'Confirmada',
  cancelada: 'Cancelada',
  cumplida: 'Jugada',
  ausente: 'No se presentó',
};

export default function MiReserva() {
  const { c } = useTema();
  const { width } = useWindowDimensions();
  const { id, recien } = useLocalSearchParams<{ id: string; recien?: string }>();
  const { refrescarPerfil } = useSesion();
  const misReservas = useReservas();
  const catalogo = useCatalogo();
  const [cancelando, setCancelando] = useState(false);
  const [resultado, setResultado] = useState<{ tipo: 'aviso' | 'error'; titulo: string; detalle: string } | null>(null);

  const item = misReservas.buscar(id);

  if (!item) {
    return (
      <View style={[estilos.pantalla, { backgroundColor: c.fondo }]}>
        {misReservas.cargando ? (
          <ActivityIndicator color={c.cesped} size="large" />
        ) : (
          <Aviso tipo="error" titulo="No encontramos esa reserva" detalle="Puede que sea de otra cuenta o que todavía no se haya sincronizado." accion={{ titulo: 'Reintentar', onPress: misReservas.recargar }} />
        )}
      </View>
    );
  }

  const { reserva, turno } = item;
  const espacio = catalogo.espacios.find((e) => e.id === reserva.espacioId);
  const ahora = misReservas.ahora;
  const empezo = turnoPasado(turno, ahora);
  const vigente = reserva.estado === 'confirmada' && !empezo;
  const sinAviso = Date.parse(reserva.cancelableHasta) > ahora;
  const diaLimite = fechaRelativa(fechaDeIso(reserva.cancelableHasta)).toLowerCase();
  const ladoQr = Math.min(width - ESPACIADO.l * 2 - ESPACIADO.xl * 2, 260);

  function confirmarCancelacion() {
    const titulo = sinAviso ? 'Cancelar la reserva' : 'Avisar que no van';
    const mensaje = sinAviso
      ? 'El turno queda libre para otra persona.'
      : `Faltan menos de ${HORAS_CANCELACION} horas: el turno se libera, pero queda anotado como cancelación tardía.`;
    Alert.alert(titulo, mensaje, [
      { text: 'Volver', style: 'cancel' },
      { text: sinAviso ? 'Cancelar reserva' : 'Avisar y cancelar', style: 'destructive', onPress: cancelar },
    ]);
  }

  async function cancelar() {
    setCancelando(true);
    setResultado(null);
    try {
      const r = await servicioReservas.cancelar(reserva.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setResultado(
        r.tardia
          ? { tipo: 'aviso', titulo: 'Aviso enviado', detalle: 'Gracias por avisar: el turno ya está libre. Quedó anotado como cancelación tardía.' }
          : { tipo: 'aviso', titulo: 'Reserva cancelada', detalle: 'El turno quedó libre para otra persona.' },
      );
      await Promise.all([misReservas.recargar(), refrescarPerfil()]);
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setResultado({ tipo: 'error', titulo: 'No se pudo cancelar', detalle: aErrorApi(e).message });
    } finally {
      setCancelando(false);
    }
  }

  return (
    <ScrollView style={{ backgroundColor: c.fondo }} contentContainerStyle={estilos.pantalla}>
      <Stack.Screen options={{ title: 'Mi reserva' }} />

      {recien === '1' && reserva.estado === 'confirmada' && !resultado && (
        <Aviso
          tipo="aviso"
          icono="checkmark-circle-outline"
          titulo="¡Reservado!"
          detalle={`Te mandamos un recordatorio ${HORAS_RECORDATORIO} horas antes. El código queda guardado en el teléfono, también sin señal.`}
        />
      )}
      {misReservas.desdeCopia && (
        <Aviso tipo="aviso" titulo="Sin conexión" detalle="Ves la reserva guardada en el teléfono. El código sirve igual." />
      )}
      {resultado && <Aviso tipo={resultado.tipo} titulo={resultado.titulo} detalle={resultado.detalle} icono={resultado.tipo === 'aviso' ? 'checkmark-circle-outline' : undefined} />}

      <View style={[estilos.tarjeta, { backgroundColor: c.superficie, borderColor: c.borde }]}>
        <View style={estilos.filaTitulo}>
          <Texto variante="subtitulo" peso="negrita" style={estilos.flex}>
            {espacio?.nombre ?? 'Espacio'}
          </Texto>
          <View style={[estilos.estado, { backgroundColor: reserva.estado === 'confirmada' ? c.cesped : c.superficieElevada, borderColor: c.borde }]}>
            <Texto variante="chico" peso="seminegrita" color={reserva.estado === 'confirmada' ? c.textoSobreCesped : c.textoSuave}>
              {NOMBRE_ESTADO[reserva.estado]}
            </Texto>
          </View>
        </View>
        <Texto>
          {fechaCorta(turno.fecha)} {rangoHorario(turno.inicio, turno.fin)}
        </Texto>
        {espacio && <Texto color={c.textoSuave}>{espacio.complejo}</Texto>}
        <Texto>{formatearPrecio(turno.precio)} — se paga en el lugar</Texto>
        <Texto variante="etiqueta" color={c.textoSuave}>
          {reserva.cantidadPersonas} {reserva.cantidadPersonas === 1 ? 'persona' : 'personas'}
        </Texto>
      </View>

      {reserva.estado === 'confirmada' && (
        <View style={[estilos.tarjeta, estilos.centrado, { backgroundColor: c.superficie, borderColor: c.borde }]}>
          {/* El QR va siempre negro sobre blanco, también en modo oscuro: así lo lee cualquier cámara. */}
          <View style={estilos.fondoQr} accessible accessibilityLabel={`Código QR de ingreso ${reserva.codigoQr}`}>
            <QRCode value={reserva.codigoQr} size={ladoQr} color="#000000" backgroundColor="#FFFFFF" ecl="M" />
          </View>
          <Texto peso="negrita" style={{ fontFamily: FUENTES.negrita }} selectable>
            {reserva.codigoQr}
          </Texto>
          <Texto color={c.textoSuave} centrado>
            Mostráselo al encargado
          </Texto>
        </View>
      )}
      {reserva.estado === 'cumplida' && reserva.ingresoEn && (
        <Aviso tipo="aviso" icono="checkmark-done-outline" titulo="Ingreso registrado" detalle={`Llegaron a las ${horaDeIso(reserva.ingresoEn)}.`} />
      )}

      {espacio && (
        <Boton titulo="Cómo llegar" variante="secundario" icono="navigate-outline" onPress={() => abrirComoLlegar(espacio.coordenadas, espacio.complejo)} />
      )}

      {vigente && (
        <View style={estilos.cancelar}>
          <Boton
            titulo={sinAviso ? 'Cancelar reserva' : 'Avisar que no vamos'}
            variante="secundario"
            icono="close-circle-outline"
            onPress={confirmarCancelacion}
            cargando={cancelando}
          />
          <View style={estilos.filaNota}>
            <Icono nombre="information-circle-outline" color={sinAviso ? c.textoSuave : c.aviso} tamano={18} />
            <Texto variante="chico" color={sinAviso ? c.textoSuave : c.aviso} style={estilos.flex}>
              {sinAviso
                ? `Se puede cancelar sin aviso hasta las ${horaDeIso(reserva.cancelableHasta)} de ${diaLimite}.`
                : `Pasó el límite de ${HORAS_CANCELACION} horas: si cancelás, queda anotado como cancelación tardía.`}
            </Texto>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { padding: ESPACIADO.l, gap: ESPACIADO.l, flexGrow: 1 },
  tarjeta: { borderRadius: RADIO.tarjeta, borderWidth: 1, padding: ESPACIADO.l, gap: ESPACIADO.xs + 2 },
  centrado: { alignItems: 'center', gap: ESPACIADO.m },
  filaTitulo: { flexDirection: 'row', alignItems: 'flex-start', gap: ESPACIADO.s },
  flex: { flex: 1 },
  estado: { borderRadius: RADIO.pastilla, borderWidth: 1, paddingHorizontal: ESPACIADO.s + 2, paddingVertical: 2 },
  fondoQr: { backgroundColor: '#FFFFFF', padding: ESPACIADO.m, borderRadius: RADIO.control },
  cancelar: { gap: ESPACIADO.s },
  filaNota: { flexDirection: 'row', gap: ESPACIADO.xs + 2, alignItems: 'flex-start' },
});
