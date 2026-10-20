import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Boton } from '@/componentes/Boton';
import { TarjetaProximoTurno } from '@/componentes/TarjetaProximoTurno';
import { Texto } from '@/componentes/Texto';
import { useSesion } from '@/contexto/SesionContexto';
import { useCatalogo } from '@/hooks/useCatalogo';
import { useProximaReserva } from '@/hooks/useProximaReserva';
import { ESPACIADO, useTema } from '@/tema';

export default function MisTurnos() {
  const { c } = useTema();
  const insets = useSafeAreaInsets();
  const { usuario } = useSesion();
  const catalogo = useCatalogo();
  const reservas = useProximaReserva(usuario?.id ?? null);
  const [refrescando, setRefrescando] = useState(false);

  async function refrescar() {
    setRefrescando(true);
    await reservas.recargar();
    setRefrescando(false);
  }

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
  } else {
    vacio = (
      <View style={estilos.centro}>
        <Texto centrado color={c.textoSuave}>
          No tenés turnos reservados. Elegí un espacio en Inicio para ver qué hay libre.
        </Texto>
        <Boton titulo="Ver espacios" variante="secundario" compacto onPress={() => router.navigate('/')} />
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: c.fondo }}
      data={usuario ? reservas.proximas : []}
      keyExtractor={(x) => x.reserva.id}
      ListHeaderComponent={
        <View style={{ paddingTop: insets.top + ESPACIADO.l, paddingHorizontal: ESPACIADO.l }}>
          <Texto variante="titulo" peso="negrita">
            Mis turnos
          </Texto>
          {usuario && reservas.proximas.length > 0 && (
            <Texto variante="etiqueta" color={c.textoSuave}>
              Reservas activas: {reservas.activas} de 3
            </Texto>
          )}
        </View>
      }
      ListEmptyComponent={<View style={estilos.bloque}>{vacio}</View>}
      renderItem={({ item, index }) => (
        <View style={estilos.item}>
          <TarjetaProximoTurno
            titulo={index === 0 ? 'Tu próximo turno' : 'Turno reservado'}
            reserva={item.reserva}
            turno={item.turno}
            espacio={catalogo.espacios.find((e) => e.id === item.reserva.espacioId)}
            activas={reservas.activas}
            ahora={reservas.ahora}
          />
        </View>
      )}
      contentContainerStyle={{ paddingBottom: ESPACIADO.xl }}
      refreshControl={
        <RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={c.cesped} colors={[c.cesped]} />
      }
    />
  );
}

const estilos = StyleSheet.create({
  bloque: { paddingHorizontal: ESPACIADO.l, paddingTop: ESPACIADO.l },
  item: { paddingHorizontal: ESPACIADO.l, paddingTop: ESPACIADO.m },
  centro: { alignItems: 'center', gap: ESPACIADO.m, paddingVertical: ESPACIADO.xxl },
});
