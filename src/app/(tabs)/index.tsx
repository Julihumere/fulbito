/**
 * Inicio. Se puede usar sin cuenta: muestra los once espacios con filtros por
 * deporte y complejo. Con sesión, suma el próximo turno con su código.
 */
import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useNetworkState } from 'expo-network';
import { router, useRootNavigationState } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { CespedFranjas, CirculoCal } from '@/componentes/Cancha';
import { Chip } from '@/componentes/Chip';
import { Icono, nombreIconoSeguro } from '@/componentes/Icono';
import { Marcador } from '@/componentes/Marcador';
import { TarjetaEspacio } from '@/componentes/TarjetaEspacio';
import { TarjetaProximoTurno } from '@/componentes/TarjetaProximoTurno';
import { Texto } from '@/componentes/Texto';
import { useSesion } from '@/contexto/SesionContexto';
import { useCatalogo } from '@/hooks/useCatalogo';
import { useProximaReserva } from '@/hooks/useProximaReserva';
import { ESPACIADO, RADIO, useTema } from '@/tema';
import type { Espacio, Rol } from '@/tipos';
import { primerNombre } from '@/utilidades/formato';

const NOMBRE_ROL: Record<Rol, string> = {
  jugador: 'Jugador',
  encargado: 'Encargado',
  administrador: 'Administrador',
};

export default function Inicio() {
  const { c } = useTema();
  const insets = useSafeAreaInsets();
  const navegacion = useRootNavigationState();
  const { estado, usuario, primeraVez } = useSesion();
  const catalogo = useCatalogo();
  const proximo = useProximaReserva(usuario?.id ?? null);
  const red = useNetworkState();

  const [deporteId, setDeporteId] = useState<string | null>(null);
  const [complejo, setComplejo] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);

  // La primera vez que se abre la app se ofrece el ingreso (con salida a "mirar sin cuenta").
  useEffect(() => {
    if (navegacion?.key && primeraVez && estado === 'invitado') router.push('/login');
  }, [navegacion?.key, primeraVez, estado]);

  const complejos = useMemo(
    () => [...new Set(catalogo.espacios.map((e) => e.complejo))].sort(),
    [catalogo.espacios],
  );
  const deportesPresentes = useMemo(
    () => catalogo.deportes.filter((d) => catalogo.espacios.some((e) => e.deporteId === d.id)),
    [catalogo.deportes, catalogo.espacios],
  );
  const visibles = useMemo(
    () =>
      catalogo.espacios
        .filter((e) => (!deporteId || e.deporteId === deporteId) && (!complejo || e.complejo === complejo))
        .sort((a, b) => Number(b.activo) - Number(a.activo)),
    [catalogo.espacios, deporteId, complejo],
  );

  const sinConexion = red.isConnected === false || red.isInternetReachable === false;
  const deporteDe = (e: Espacio) => catalogo.deportes.find((d) => d.id === e.deporteId);

  async function refrescar() {
    setRefrescando(true);
    await Promise.all([catalogo.recargar(), proximo.recargar()]);
    setRefrescando(false);
  }

  const encabezado = (
    <View>
      <Cabecera topInset={insets.top} />

      <View style={estilos.bloque}>
        {(sinConexion || catalogo.copiaDel) && catalogo.espacios.length > 0 && (
          <Aviso
            tipo="aviso"
            titulo="Sin conexión"
            detalle="Ves los espacios guardados en el teléfono. Los turnos libres pueden haber cambiado."
            accion={{ titulo: 'Reintentar', onPress: refrescar }}
          />
        )}

        {usuario && proximo.proxima && (
          <TarjetaProximoTurno
            reserva={proximo.proxima.reserva}
            turno={proximo.proxima.turno}
            espacio={catalogo.espacios.find((e) => e.id === proximo.proxima?.reserva.espacioId)}
            activas={proximo.activas}
            ahora={proximo.ahora}
          />
        )}
        {usuario && !proximo.proxima && usuario.rol === 'jugador' && (
          <Texto variante="etiqueta" color={c.textoSuave}>
            No tenés turnos reservados. Elegí un espacio para ver qué hay libre.
          </Texto>
        )}

        {usuario && usuario.rol !== 'jugador' && (
          <View style={[estilos.panel, { backgroundColor: c.superficie, borderColor: c.borde }]}>
            <Icono nombre="shield-checkmark-outline" color={c.cesped} tamano={22} />
            <View style={estilos.flex}>
              <Texto peso="seminegrita">Cuenta de {NOMBRE_ROL[usuario.rol].toLowerCase()}</Texto>
              <Texto variante="etiqueta" color={c.textoSuave}>
                La agenda del día y el escaneo de códigos llegan en la próxima entrega.
              </Texto>
            </View>
          </View>
        )}

        {catalogo.espacios.length > 0 && (
          <View style={estilos.filtros}>
            <Texto variante="etiqueta" peso="seminegrita">
              Deporte
            </Texto>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.chips}>
              <Chip texto="Todos" activo={deporteId === null} onPress={() => setDeporteId(null)} />
              {deportesPresentes.map((d) => (
                <Chip
                  key={d.id}
                  texto={d.nombre}
                  icono={nombreIconoSeguro(d.icono)}
                  colorIcono={d.color}
                  activo={deporteId === d.id}
                  onPress={() => setDeporteId(deporteId === d.id ? null : d.id)}
                />
              ))}
            </ScrollView>

            <Texto variante="etiqueta" peso="seminegrita" style={estilos.separado}>
              Complejo
            </Texto>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.chips}>
              <Chip texto="Todos" activo={complejo === null} onPress={() => setComplejo(null)} />
              {complejos.map((nombre) => (
                <Chip
                  key={nombre}
                  texto={nombre}
                  icono="location-outline"
                  activo={complejo === nombre}
                  onPress={() => setComplejo(complejo === nombre ? null : nombre)}
                />
              ))}
            </ScrollView>

            <Texto variante="chico" color={c.textoSuave} style={estilos.separado}>
              {visibles.length === 1 ? '1 espacio' : `${visibles.length} espacios`}
            </Texto>
          </View>
        )}
      </View>
    </View>
  );

  let vacio: ReactElement;
  if (catalogo.cargando) {
    vacio = (
      <View style={estilos.centro}>
        <ActivityIndicator color={c.cesped} size="large" />
        <Texto color={c.textoSuave}>Buscando canchas…</Texto>
      </View>
    );
  } else if (catalogo.error && catalogo.espacios.length === 0) {
    vacio = (
      <Aviso
        tipo="error"
        titulo="No pudimos cargar los espacios"
        detalle={catalogo.error.message}
        accion={{ titulo: 'Reintentar', onPress: refrescar }}
      />
    );
  } else {
    vacio = (
      <View style={estilos.centro}>
        <Texto centrado color={c.textoSuave}>
          No hay espacios con esos filtros.
        </Texto>
        <Boton
          titulo="Ver todos"
          variante="secundario"
          compacto
          onPress={() => {
            setDeporteId(null);
            setComplejo(null);
          }}
        />
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: c.fondo }}
      data={visibles}
      keyExtractor={(e) => e.id}
      ListHeaderComponent={encabezado}
      ListEmptyComponent={<View style={estilos.bloque}>{vacio}</View>}
      renderItem={({ item }) => (
        <View style={estilos.item}>
          <TarjetaEspacio
            espacio={item}
            deporte={deporteDe(item)}
            onPress={() => router.push({ pathname: '/espacio/[id]', params: { id: item.id } })}
          />
        </View>
      )}
      contentContainerStyle={{ paddingBottom: insets.bottom + ESPACIADO.xl }}
      refreshControl={
        <RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={c.cesped} colors={[c.cesped]} />
      }
    />
  );
}

/** Franja de césped con el tablero, el saludo y la cuenta. */
function Cabecera({ topInset }: { topInset: number }) {
  const { c } = useTema();
  const { usuario } = useSesion();

  return (
    <View style={[estilos.cabecera, { paddingTop: topInset + ESPACIADO.m, backgroundColor: c.cesped }]}>
      <CespedFranjas franjas={5} />

      <View style={estilos.filaCabecera}>
        <Marcador />
        {!usuario && (
          <Boton titulo="Entrar" variante="calSobreCesped" compacto icono="person-circle-outline" onPress={() => router.push('/login')} />
        )}
      </View>

      <View style={estilos.saludo}>
        <Texto variante="titulo" peso="negrita" color={c.textoSobreCesped}>
          {usuario ? `Hola, ${primerNombre(usuario.nombre)}` : 'Hola'}
        </Texto>
        <Texto color={c.textoSobreCespedSuave}>
          {usuario
            ? 'Elegí un espacio para ver sus turnos.'
            : 'Mirá qué hay libre. Para reservar, entrá con tu cuenta.'}
        </Texto>
      </View>

      {/* Línea de mitad de cancha con el círculo central asomando. */}
      <View style={[estilos.lineaMitad, { backgroundColor: c.cal }]} />
      <View style={estilos.arcoCentral} pointerEvents="none">
        <CirculoCal diametro={132} />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  cabecera: { paddingHorizontal: ESPACIADO.l, paddingBottom: ESPACIADO.xxl + ESPACIADO.s, overflow: 'hidden' },
  filaCabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  saludo: { marginTop: ESPACIADO.xl, gap: ESPACIADO.xs },
  lineaMitad: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 2 },
  arcoCentral: { position: 'absolute', bottom: 0, alignSelf: 'center', height: 22, overflow: 'hidden' },
  bloque: { paddingHorizontal: ESPACIADO.l, paddingTop: ESPACIADO.l, gap: ESPACIADO.l },
  panel: {
    flexDirection: 'row',
    gap: ESPACIADO.m,
    padding: ESPACIADO.m,
    borderRadius: RADIO.tarjeta,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  filtros: { gap: ESPACIADO.s },
  chips: { gap: ESPACIADO.s, paddingRight: ESPACIADO.l },
  separado: { marginTop: ESPACIADO.xs },
  item: { paddingHorizontal: ESPACIADO.l, paddingTop: ESPACIADO.m },
  centro: { alignItems: 'center', gap: ESPACIADO.m, paddingVertical: ESPACIADO.xxl },
});
