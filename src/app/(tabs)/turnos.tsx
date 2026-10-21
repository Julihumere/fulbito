/** Mis reservas, separadas entre las que vienen y las que ya pasaron. */
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { Chip } from '@/componentes/Chip';
import { Icono, type NombreIcono } from '@/componentes/Icono';
import { TarjetaProximoTurno } from '@/componentes/TarjetaProximoTurno';
import { Texto } from '@/componentes/Texto';
import { useReservas, type ReservaConTurno } from '@/contexto/ReservasContexto';
import { useSesion } from '@/contexto/SesionContexto';
import { useCatalogo } from '@/hooks/useCatalogo';
import { ESPACIADO, RADIO, useTema } from '@/tema';
import type { EstadoReserva } from '@/tipos';
import { fechaCorta, rangoHorario } from '@/utilidades/fechas';
import { MAXIMO_ACTIVAS } from '@/utilidades/reglas';

type Pestana = 'proximas' | 'pasadas';

const ESTADO_PASADA: Record<EstadoReserva, { texto: string; icono: NombreIcono }> = {
  confirmada: { texto: 'Sin registro de ingreso', icono: 'help-circle-outline' },
  cumplida: { texto: 'Jugada', icono: 'checkmark-done-outline' },
  cancelada: { texto: 'Cancelada', icono: 'close-circle-outline' },
  ausente: { texto: 'No se presentó', icono: 'alert-circle-outline' },
};

export default function MisTurnos() {
  const { c } = useTema();
  const insets = useSafeAreaInsets();
  const { usuario } = useSesion();
  const catalogo = useCatalogo();
  const reservas = useReservas();
  const [pestana, setPestana] = useState<Pestana>('proximas');
  const [refrescando, setRefrescando] = useState(false);

  async function refrescar() {
    setRefrescando(true);
    await reservas.recargar();
    setRefrescando(false);
  }

  const abrir = (x: ReservaConTurno) => router.push({ pathname: '/reserva/[id]', params: { id: x.reserva.id } });
  const nombreEspacio = (id: string) => catalogo.espacios.find((e) => e.id === id)?.nombre ?? 'Espacio';

  let vacio;
  if (!usuario) {
    vacio = (
      <View style={estilos.centro}>
        <Texto centrado color={c.textoSuave}>
          Entrá con tu cuenta para ver tus turnos.
        </Texto>
        <Boton titulo="Entrar" icono="person-circle-outline" onPress={() => router.push('/login')} />
      </View>
    );
  } else if (pestana === 'proximas') {
    vacio = (
      <View style={estilos.centro}>
        <Texto centrado color={c.textoSuave}>
          No tenés turnos reservados. Elegí un espacio en Inicio para ver qué hay libre.
        </Texto>
        <Boton titulo="Ver espacios" variante="secundario" compacto onPress={() => router.navigate('/')} />
      </View>
    );
  } else {
    vacio = (
      <Texto centrado color={c.textoSuave} style={estilos.centro}>
        Todavía no tenés turnos pasados.
      </Texto>
    );
  }

  const datos = !usuario ? [] : pestana === 'proximas' ? reservas.proximas : reservas.pasadas;

  return (
    <FlatList
      style={{ backgroundColor: c.fondo }}
      data={datos}
      keyExtractor={(x) => x.reserva.id}
      ListHeaderComponent={
        <View style={[estilos.cabecera, { paddingTop: insets.top + ESPACIADO.l }]}>
          <Texto variante="titulo" peso="negrita">
            Mis turnos
          </Texto>
          {usuario && (
            <>
              <Texto variante="etiqueta" color={c.textoSuave}>
                Reservas activas: {reservas.activas} de {MAXIMO_ACTIVAS}
              </Texto>
              <View style={estilos.pestanas} accessibilityRole="tablist">
                <Chip texto={`Próximas (${reservas.proximas.length})`} activo={pestana === 'proximas'} onPress={() => setPestana('proximas')} />
                <Chip texto="Pasadas" activo={pestana === 'pasadas'} onPress={() => setPestana('pasadas')} />
              </View>
              {reservas.desdeCopia && (
                <Aviso tipo="aviso" titulo="Sin conexión" detalle="Ves las reservas guardadas en el teléfono. Los códigos sirven igual." />
              )}
            </>
          )}
        </View>
      }
      ListEmptyComponent={<View style={estilos.bloque}>{vacio}</View>}
      renderItem={({ item, index }) =>
        pestana === 'proximas' ? (
          <Pressable style={estilos.item} onPress={() => abrir(item)} accessibilityRole="button" accessibilityHint="Abre la reserva con el código QR">
            <TarjetaProximoTurno
              titulo={index === 0 ? 'Tu próximo turno' : 'Turno reservado'}
              reserva={item.reserva}
              turno={item.turno}
              espacio={catalogo.espacios.find((e) => e.id === item.reserva.espacioId)}
              activas={reservas.activas}
              ahora={reservas.ahora}
            />
          </Pressable>
        ) : (
          <Pressable
            onPress={() => abrir(item)}
            accessibilityRole="button"
            style={({ pressed }) => [
              estilos.item,
              estilos.pasada,
              { backgroundColor: c.superficie, borderColor: c.borde },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Icono nombre={ESTADO_PASADA[item.reserva.estado].icono} color={item.reserva.estado === 'cumplida' ? c.cesped : c.textoSuave} tamano={24} />
            <View style={estilos.flex}>
              <Texto peso="seminegrita" numberOfLines={1}>
                {nombreEspacio(item.reserva.espacioId)}
              </Texto>
              <Texto variante="etiqueta" color={c.textoSuave}>
                {fechaCorta(item.turno.fecha)} {rangoHorario(item.turno.inicio, item.turno.fin)}
              </Texto>
            </View>
            <Texto variante="chico" color={item.reserva.estado === 'ausente' ? c.peligro : c.textoSuave}>
              {ESTADO_PASADA[item.reserva.estado].texto}
            </Texto>
          </Pressable>
        )
      }
      contentContainerStyle={{ paddingBottom: ESPACIADO.xl }}
      refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={c.cesped} colors={[c.cesped]} />}
    />
  );
}

const estilos = StyleSheet.create({
  cabecera: { paddingHorizontal: ESPACIADO.l, gap: ESPACIADO.s },
  pestanas: { flexDirection: 'row', gap: ESPACIADO.s, marginTop: ESPACIADO.xs },
  bloque: { paddingHorizontal: ESPACIADO.l, paddingTop: ESPACIADO.l },
  item: { marginHorizontal: ESPACIADO.l, marginTop: ESPACIADO.m },
  pasada: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACIADO.m,
    padding: ESPACIADO.m,
    borderRadius: RADIO.tarjeta,
    borderWidth: 1,
  },
  flex: { flex: 1 },
  centro: { alignItems: 'center', gap: ESPACIADO.m, paddingVertical: ESPACIADO.xxl },
});
