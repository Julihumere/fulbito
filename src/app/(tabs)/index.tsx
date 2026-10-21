/**
 * Inicio. Se puede usar sin cuenta: muestra los once espacios con filtros por
 * deporte y complejo. Con sesión, suma el próximo turno con su código.
 */
import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useNetworkState } from 'expo-network';
import { router, useFocusEffect, useRootNavigationState } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { guardarFavoritos, leerFavoritos } from '@/almacenamiento/favoritos';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { CespedFranjas, CirculoCal } from '@/componentes/Cancha';
import { Chip } from '@/componentes/Chip';
import { Icono, nombreIconoSeguro } from '@/componentes/Icono';
import { Marcador } from '@/componentes/Marcador';
import { TarjetaEspacio } from '@/componentes/TarjetaEspacio';
import { TarjetaProximoTurno } from '@/componentes/TarjetaProximoTurno';
import { Texto } from '@/componentes/Texto';
import { useAvisos } from '@/contexto/AvisosContexto';
import { useReservas } from '@/contexto/ReservasContexto';
import { useSesion } from '@/contexto/SesionContexto';
import { useCatalogo } from '@/hooks/useCatalogo';
import { aErrorApi, usuarios as servicioUsuarios } from '@/servicios';
import { ESPACIADO, RADIO, TOQUE_MINIMO, useTema } from '@/tema';
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
  const { estado, usuario, primeraVez, actualizarUsuario } = useSesion();
  const catalogo = useCatalogo();
  const proximo = useReservas();
  const red = useNetworkState();

  const [deporteId, setDeporteId] = useState<string | null>(null);
  const [complejo, setComplejo] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);
  const [favoritosInvitado, setFavoritosInvitado] = useState<string[]>([]);
  const [favoritosCargados, setFavoritosCargados] = useState(false);
  const [soloFavoritos, setSoloFavoritos] = useState(false);
  const [errorFavorito, setErrorFavorito] = useState<string | null>(null);
  const favoritos = usuario?.espaciosFavoritos ?? favoritosInvitado;

  useFocusEffect(useCallback(() => {
    let vigente = true;
    if (usuario) {
      setFavoritosCargados(true);
      return () => { vigente = false; };
    }
    setFavoritosCargados(false);
    leerFavoritos().then((ids) => {
      if (vigente) {
        setFavoritosInvitado(ids);
        setFavoritosCargados(true);
      }
    });
    return () => { vigente = false; };
  }, [usuario]));

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
      .filter((e) =>
        (!deporteId || e.deporteId === deporteId) &&
        (!complejo || e.complejo === complejo) &&
        (!soloFavoritos || favoritos.includes(e.id)))
        .sort((a, b) => Number(b.activo) - Number(a.activo)),
    [catalogo.espacios, deporteId, complejo, soloFavoritos, favoritos],
  );

  const sinConexion = red.isConnected === false || red.isInternetReachable === false;
  const deporteDe = (e: Espacio) => catalogo.deportes.find((d) => d.id === e.deporteId);

  async function refrescar() {
    setRefrescando(true);
    await Promise.all([catalogo.recargar(), proximo.recargar()]);
    setRefrescando(false);
  }

  async function alternarFavorito(id: string) {
    if (!favoritosCargados) return;
    setErrorFavorito(null);
    try {
      if (usuario) {
        await actualizarUsuario(await servicioUsuarios.alternarFavorito(id));
      } else {
        const actuales = await leerFavoritos();
        const siguientes = actuales.includes(id)
          ? actuales.filter((favoritoId) => favoritoId !== id)
          : [...actuales, id];
        await guardarFavoritos(siguientes);
        setFavoritosInvitado(siguientes);
      }
    } catch (e) {
      setErrorFavorito(aErrorApi(e).message);
    }
  }

  const encabezado = (
    <View>
      <Cabecera topInset={insets.top} />

      <View style={estilos.bloque}>
        {errorFavorito && <Aviso tipo="error" titulo="No se pudo guardar el favorito" detalle={errorFavorito} />}
        {(sinConexion || catalogo.copiaDel) && catalogo.espacios.length > 0 && (
          <Aviso
            tipo="aviso"
            titulo="Sin conexión"
            detalle="Ves los espacios guardados en el teléfono. Los turnos libres pueden haber cambiado."
            accion={{ titulo: 'Reintentar', onPress: refrescar }}
          />
        )}

        {usuario && proximo.proxima && (
          <Pressable
            onPress={() => router.push({ pathname: '/reserva/[id]', params: { id: proximo.proxima?.reserva.id ?? '' } })}
            accessibilityRole="button"
            accessibilityHint="Abre la reserva con el código QR"
          >
            <TarjetaProximoTurno
              reserva={proximo.proxima.reserva}
              turno={proximo.proxima.turno}
              espacio={catalogo.espacios.find((e) => e.id === proximo.proxima?.reserva.espacioId)}
              activas={proximo.activas}
              ahora={proximo.ahora}
            />
          </Pressable>
        )}
        {usuario && !proximo.proxima && usuario.rol === 'jugador' && (
          <Texto variante="etiqueta" color={c.textoSuave}>
            No tenés reservas próximas. Elegí un espacio para consultar los horarios disponibles.
          </Texto>
        )}

        {usuario && usuario.rol !== 'jugador' && (
          <Pressable
            onPress={() => router.navigate('/gestion')}
            accessibilityRole="button"
            style={({ pressed }) => [estilos.panel, { backgroundColor: c.superficie, borderColor: c.borde }, pressed && { opacity: 0.85 }]}
          >
            <Icono nombre="shield-checkmark-outline" color={c.cesped} tamano={22} />
            <View style={estilos.flex}>
              <Texto peso="seminegrita">Cuenta de {NOMBRE_ROL[usuario.rol].toLowerCase()}</Texto>
              <Texto variante="etiqueta" color={c.textoSuave}>
                Agenda del día, escaneo de ingresos, bloqueos, fijas y precios.
              </Texto>
            </View>
            <Icono nombre="chevron-forward" color={c.textoSuave} tamano={18} />
          </Pressable>
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

            <View style={estilos.filaResultados}>
              <Texto variante="chico" color={c.textoSuave}>
                {visibles.length === 1 ? '1 espacio' : `${visibles.length} espacios`}
              </Texto>
              <Chip
                texto={`Favoritos (${favoritos.length})`}
                icono={soloFavoritos ? 'heart' : 'heart-outline'}
                activo={soloFavoritos}
                onPress={() => setSoloFavoritos((actual) => !actual)}
              />
            </View>
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
          {soloFavoritos ? 'Todavía no marcaste espacios favoritos.' : 'No hay espacios con esos filtros.'}
        </Texto>
        <Boton
          titulo="Ver todos"
          variante="secundario"
          compacto
          onPress={() => {
            setDeporteId(null);
            setComplejo(null);
            setSoloFavoritos(false);
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
            onTurnos={item.activo ? () => router.push({ pathname: '/disponibilidad/[id]', params: { id: item.id } }) : undefined}
          />
          <Pressable
            onPress={() => { void alternarFavorito(item.id); }}
            disabled={!favoritosCargados}
            accessibilityRole="button"
            accessibilityLabel={favoritos.includes(item.id) ? `Quitar ${item.nombre} de favoritos` : `Agregar ${item.nombre} a favoritos`}
            accessibilityHint="Guarda este espacio en tu lista de favoritos"
            style={({ pressed }) => [
              estilos.botonFavorito,
              { backgroundColor: c.superficie },
              pressed && estilos.botonFavoritoPresionado,
              !favoritosCargados && estilos.favoritoDeshabilitado,
            ]}
          >
            <Icono nombre={favoritos.includes(item.id) ? 'heart' : 'heart-outline'} color={favoritos.includes(item.id) ? c.peligro : c.texto} tamano={20} />
          </Pressable>
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
  const { noLeidos } = useAvisos();

  return (
    <View style={[estilos.cabecera, { paddingTop: topInset + ESPACIADO.m, backgroundColor: c.cesped }]}>
      <CespedFranjas franjas={5} />

      <View style={estilos.filaCabecera}>
        <Marcador />
        <View style={estilos.accionesCabecera}>
          <BotonCabecera icono="map-outline" etiqueta="Complejos en el mapa" onPress={() => router.push('/mapa')} />
          {usuario ? (
            <BotonCabecera
              icono={noLeidos > 0 ? 'notifications' : 'notifications-outline'}
              etiqueta={noLeidos > 0 ? `Avisos, ${noLeidos} sin leer` : 'Avisos'}
              insignia={noLeidos}
              onPress={() => router.push('/avisos')}
            />
          ) : (
            <Boton titulo="Entrar" variante="calSobreCesped" compacto icono="person-circle-outline" onPress={() => router.push('/login')} />
          )}
        </View>
      </View>

      <View style={estilos.saludo}>
        <Texto variante="titulo" peso="negrita" color={c.textoSobreCesped}>
          {usuario ? `Hola, ${primerNombre(usuario.nombre)}` : 'Hola'}
        </Texto>
        <Texto color={c.textoSobreCespedSuave}>
          {usuario
            ? 'Tu próximo partido empieza acá.'
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

function BotonCabecera({
  icono, etiqueta, insignia = 0, onPress,
}: { icono: 'map-outline' | 'notifications' | 'notifications-outline'; etiqueta: string; insignia?: number; onPress: () => void }) {
  const { c } = useTema();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      style={({ pressed }) => [estilos.botonCabecera, { borderColor: c.cal }, pressed && { opacity: 0.8 }]}
    >
      <Icono nombre={icono} color={c.textoSobreCesped} tamano={22} />
      {insignia > 0 && (
        <View style={[estilos.insignia, { backgroundColor: c.acento }]}>
          <Texto variante="chico" peso="negrita" color={c.textoSobreAcento}>
            {insignia > 9 ? '9+' : insignia}
          </Texto>
        </View>
      )}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  accionesCabecera: { flexDirection: 'row', alignItems: 'center', gap: ESPACIADO.s },
  botonCabecera: {
    width: TOQUE_MINIMO,
    height: TOQUE_MINIMO,
    borderRadius: RADIO.control,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insignia: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  item: { position: 'relative', paddingHorizontal: ESPACIADO.l, paddingTop: ESPACIADO.m },
  filaResultados: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  botonFavorito: { position: 'absolute', top: ESPACIADO.m + ESPACIADO.xs, left: ESPACIADO.l + ESPACIADO.xs, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', zIndex: 1, elevation: 2 },
  botonFavoritoPresionado: { opacity: 0.75, transform: [{ scale: 0.95 }] },
  favoritoDeshabilitado: { opacity: 0.5 },
  centro: { alignItems: 'center', gap: ESPACIADO.m, paddingVertical: ESPACIADO.xxl },
});
