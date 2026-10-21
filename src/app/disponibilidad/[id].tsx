/**
 * La grilla de turnos de un espacio. "Esta es la pantalla más importante de todas."
 * Se mira sin cuenta; la cuenta se pide recién al tocar Reservar.
 * Reservar son dos toques: el turno libre y el botón (personas y deporte vienen cargados).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { Chip } from '@/componentes/Chip';
import { Contador } from '@/componentes/Contador';
import { FilaTurno, vistaDeTurno } from '@/componentes/FilaTurno';
import { Icono, nombreIconoSeguro } from '@/componentes/Icono';
import { SelectorDia } from '@/componentes/SelectorDia';
import { Texto } from '@/componentes/Texto';
import { useReservas } from '@/contexto/ReservasContexto';
import { useSesion } from '@/contexto/SesionContexto';
import { pedirPermisoNotificaciones } from '@/notificaciones';
import {
  aErrorApi,
  espacios as servicioEspacios,
  reservas as servicioReservas,
  usuarios as servicioUsuarios,
  type ErrorApi,
} from '@/servicios';
import { ESPACIADO, RADIO, TOQUE_MINIMO, useTema } from '@/tema';
import type { Deporte, Espacio, ReservaFija, Turno } from '@/tipos';
import { fechaCorta, hoy, rangoHorario, sumarDias } from '@/utilidades/fechas';
import { formatearPrecio } from '@/utilidades/formato';
import { titularFijo, turnoPasado } from '@/utilidades/grilla';
import { DIAS_RESERVABLES, MAXIMO_ACTIVAS } from '@/utilidades/reglas';

// El gimnasio es multiuso: al reservar se indica qué se va a jugar (pregunta 9).
const DEPORTES_EN_GIMNASIO = ['dep-basquet', 'dep-voley', 'dep-futbol5', 'dep-multiuso'];

interface Grilla {
  fecha: string;
  turnos: Turno[];
  /** Momento de la carga: el render no lee el reloj. */
  ahora: number;
}

function fechaInicial(param: string | undefined): string {
  const h = hoy();
  return param && param >= h && param <= sumarDias(h, DIAS_RESERVABLES - 1) ? param : h;
}

export default function Disponibilidad() {
  const { c } = useTema();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string; fecha?: string }>();
  const id = params.id;
  const { usuario, actualizarUsuario } = useSesion();
  const misReservas = useReservas();

  const [espacio, setEspacio] = useState<Espacio | null>(null);
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [fijas, setFijas] = useState<ReservaFija[]>([]);
  const [fecha, setFecha] = useState(() => fechaInicial(params.fecha));
  const [grilla, setGrilla] = useState<Grilla | null>(null);
  const [error, setError] = useState<ErrorApi | null>(null);
  const [refrescando, setRefrescando] = useState(false);

  const [elegido, setElegido] = useState<string | null>(null);
  const [personas, setPersonas] = useState<number | null>(null);
  const [deporteId, setDeporteId] = useState<string | null>(null);
  const [reservando, setReservando] = useState(false);
  const [errorReserva, setErrorReserva] = useState<string | null>(null);

  // Datos del espacio: una sola vez.
  useEffect(() => {
    let vivo = true;
    Promise.all([servicioEspacios.obtenerEspacio(id), servicioEspacios.listarDeportes(), servicioReservas.listarFijas(id)])
      .then(([e, ds, fs]) => {
        if (!vivo) return;
        setEspacio(e);
        setDeportes(ds);
        setFijas(fs);
      })
      .catch((e) => vivo && setError(aErrorApi(e)));
    return () => {
      vivo = false;
    };
  }, [id]);

  const cargarGrilla = useCallback(async (dia: string) => {
    try {
      const turnos = await servicioReservas.obtenerGrilla(id, dia);
      setGrilla({ fecha: dia, turnos, ahora: Date.now() });
      setError(null);
    } catch (e) {
      setError(aErrorApi(e));
    }
  }, [id]);

  // La grilla se vuelve a pedir al cambiar de día y al volver a la pantalla (p. ej. después de entrar).
  useFocusEffect(
    useCallback(() => {
      cargarGrilla(fecha);
    }, [cargarGrilla, fecha]),
  );

  function cambiarDia(dia: string) {
    setFecha(dia);
    setElegido(null);
    setErrorReserva(null);
  }

  async function refrescar() {
    setRefrescando(true);
    await cargarGrilla(fecha);
    setRefrescando(false);
  }

  const propias = useMemo(() => new Set(misReservas.proximas.map((x) => x.reserva.id)), [misReservas.proximas]);
  const turnos = grilla && grilla.fecha === fecha ? grilla.turnos : null;
  const turnoElegido = turnos?.find((t) => t.id === elegido) ?? null;
  const esFavorito = !!usuario && usuario.espaciosFavoritos.includes(id);

  async function alternarFavorito() {
    if (!usuario) {
      router.push('/login');
      return;
    }
    try {
      await actualizarUsuario(await servicioUsuarios.alternarFavorito(id));
      Haptics.selectionAsync();
    } catch (e) {
      setErrorReserva(aErrorApi(e).message);
    }
  }

  async function reservar() {
    if (!turnoElegido || !espacio) return;
    if (!usuario) {
      router.push('/login');
      return;
    }
    setReservando(true);
    setErrorReserva(null);
    try {
      const reserva = await servicioReservas.reservar({
        turnoId: turnoElegido.id,
        cantidadPersonas: personas ?? espacio.capacidad,
        deporteId: deporteId ?? espacio.deporteId,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // El permiso se pide acá, cuando se entiende para qué: el recordatorio de 2 horas antes.
      await pedirPermisoNotificaciones();
      await misReservas.recargar();
      setElegido(null);
      router.push({ pathname: '/reserva/[id]', params: { id: reserva.id, recien: '1' } });
      cargarGrilla(fecha);
    } catch (e) {
      const err = aErrorApi(e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorReserva(err.message);
      if (err.codigo === 'TURNO_OCUPADO' || err.codigo === 'TURNO_PASADO') {
        setElegido(null);
        cargarGrilla(fecha);
      }
    } finally {
      setReservando(false);
    }
  }

  const titulo = espacio?.nombre ?? 'Turnos';
  const cabecera = (
    <Stack.Screen
      options={{
        title: titulo,
        headerRight: () => (
          <Pressable
            onPress={alternarFavorito}
            accessibilityRole="button"
            accessibilityLabel={esFavorito ? 'Quitar de favoritos' : 'Marcar como favorito'}
            accessibilityHint="Te avisamos cuando se libere un turno de este espacio"
            hitSlop={10}
            style={estilos.estrella}
          >
            <Icono nombre={esFavorito ? 'star' : 'star-outline'} color={c.textoSobreCesped} tamano={26} />
          </Pressable>
        ),
      }}
    />
  );

  if (error && !espacio) {
    return (
      <View style={estilos.pantalla}>
        {cabecera}
        <Aviso tipo="error" titulo="No pudimos cargar los turnos" detalle={error.message} accion={{ titulo: 'Reintentar', onPress: refrescar }} />
      </View>
    );
  }

  const libres = turnos?.filter((t) => t.estado === 'libre' && !turnoPasado(t, grilla?.ahora ?? 0)) ?? [];
  const todoBloqueado = !!turnos && turnos.every((t) => t.estado === 'mantenimiento');
  const sinLibres = !!turnos && !todoBloqueado && libres.length === 0;
  const enLimite = !!usuario && misReservas.activas >= MAXIMO_ACTIVAS;

  const encabezado = (
    <View style={estilos.encabezado}>
      <SelectorDia fecha={fecha} onCambiar={cambiarDia} />
      <Leyenda />
      {error && (
        <Aviso tipo="error" titulo="No se pudo actualizar" detalle={error.message} accion={{ titulo: 'Reintentar', onPress: refrescar }} />
      )}
      {todoBloqueado && turnos && (
        <Aviso
          tipo="aviso"
          icono="rainy-outline"
          titulo="Día bloqueado"
          detalle={`${turnos[0].motivoBloqueo ?? 'Mantenimiento'}. Probá otro día u otro espacio.`}
        />
      )}
      {sinLibres && (
        <Aviso
          tipo="aviso"
          icono="calendar-outline"
          titulo="No quedan turnos libres"
          detalle={fecha < sumarDias(hoy(), DIAS_RESERVABLES - 1) ? 'Mirá el día siguiente o activá la estrella: te avisamos si se libera uno.' : 'Activá la estrella y te avisamos si se libera uno.'}
          accion={fecha < sumarDias(hoy(), DIAS_RESERVABLES - 1) ? { titulo: 'Ver el día siguiente', onPress: () => cambiarDia(sumarDias(fecha, 1)) } : undefined}
        />
      )}
      {espacio && !espacio.activo && (
        <Aviso tipo="error" icono="construct-outline" titulo="Fuera de servicio" detalle="Este espacio no se puede reservar por ahora." />
      )}
    </View>
  );

  return (
    <View style={[estilos.raiz, { backgroundColor: c.fondo }]}>
      {cabecera}
      <FlatList
        data={turnos ?? []}
        keyExtractor={(t) => t.id}
        ListHeaderComponent={encabezado}
        ListEmptyComponent={
          <View style={estilos.centro}>
            <ActivityIndicator color={c.cesped} size="large" />
          </View>
        }
        renderItem={({ item }) => {
          const pasado = turnoPasado(item, grilla?.ahora ?? 0);
          const vista = vistaDeTurno(item, pasado, item.reservaId !== null && propias.has(item.reservaId));
          const detalle =
            vista === 'fijo' ? titularFijo(fijas, item) : vista === 'mantenimiento' ? item.motivoBloqueo : null;
          return (
            <View style={estilos.item}>
              <FilaTurno
                turno={item}
                vista={vista}
                detalle={detalle}
                seleccionado={item.id === elegido}
                onPress={
                  vista === 'libre'
                    ? () => {
                        Haptics.selectionAsync();
                        setErrorReserva(null);
                        setElegido(item.id === elegido ? null : item.id);
                      }
                    : vista === 'propia' && item.reservaId
                      ? () => router.push({ pathname: '/reserva/[id]', params: { id: item.reservaId as string } })
                      : undefined
                }
              />
            </View>
          );
        }}
        contentContainerStyle={estilos.lista}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={c.cesped} colors={[c.cesped]} />}
      />

      {/* Panel fijo abajo: el turno elegido, cuántos van a ser y el botón. */}
      <View style={[estilos.panel, { backgroundColor: c.superficie, borderTopColor: c.borde, paddingBottom: insets.bottom + ESPACIADO.m }]}>
        {turnoElegido && espacio ? (
          <>
            <Texto peso="seminegrita">
              {fechaCorta(turnoElegido.fecha)} {rangoHorario(turnoElegido.inicio, turnoElegido.fin)} · {formatearPrecio(turnoElegido.precio)}
            </Texto>
            <Contador
              etiqueta="Personas"
              valor={personas ?? espacio.capacidad}
              minimo={1}
              maximo={espacio.capacidad}
              onCambiar={setPersonas}
            />
            {espacio.deporteId === 'dep-multiuso' && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.chips}>
                {deportes
                  .filter((d) => DEPORTES_EN_GIMNASIO.includes(d.id))
                  .map((d) => (
                    <Chip
                      key={d.id}
                      texto={d.id === 'dep-multiuso' ? 'Otro' : d.nombre}
                      icono={nombreIconoSeguro(d.icono)}
                      colorIcono={d.color}
                      activo={(deporteId ?? espacio.deporteId) === d.id}
                      onPress={() => setDeporteId(d.id)}
                    />
                  ))}
              </ScrollView>
            )}
          </>
        ) : (
          <Texto variante="etiqueta" color={c.textoSuave} centrado>
            {turnos && libres.length > 0 ? 'Tocá un turno libre para reservarlo.' : ' '}
          </Texto>
        )}
        {errorReserva && <Aviso tipo="error" titulo="No se pudo reservar" detalle={errorReserva} />}
        {enLimite && !errorReserva && (
          <Texto variante="chico" color={c.aviso} centrado>
            Ya tenés {MAXIMO_ACTIVAS} reservas activas: cancelá una para reservar otra.
          </Texto>
        )}
        <Boton
          titulo={usuario ? 'Reservar' : 'Entrar para reservar'}
          icono={usuario ? 'checkmark-done-outline' : 'person-circle-outline'}
          onPress={reservar}
          cargando={reservando}
          deshabilitado={!turnoElegido || enLimite}
          accessibilityHint="Se paga en el lugar"
        />
      </View>
    </View>
  );
}

function Leyenda() {
  const { c } = useTema();
  const items: [string, string][] = [
    ['Libre', c.cesped],
    ['Tuya', c.acento],
    ['Ocupado / fijo', c.textoSuave],
    ['Mantenimiento', c.aviso],
  ];
  return (
    <View style={estilos.leyenda} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {items.map(([t, col]) => (
        <View key={t} style={estilos.itemLeyenda}>
          <View style={[estilos.punto, { backgroundColor: col }]} />
          <Texto variante="chico" color={c.textoSuave}>
            {t}
          </Texto>
        </View>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1 },
  pantalla: { padding: ESPACIADO.l, gap: ESPACIADO.l },
  centro: { paddingVertical: ESPACIADO.xxl, alignItems: 'center' },
  encabezado: { gap: ESPACIADO.m, paddingBottom: ESPACIADO.s },
  lista: { padding: ESPACIADO.l, paddingBottom: ESPACIADO.xl },
  item: { paddingTop: ESPACIADO.s },
  estrella: { minWidth: TOQUE_MINIMO, minHeight: TOQUE_MINIMO, alignItems: 'center', justifyContent: 'center' },
  leyenda: { flexDirection: 'row', flexWrap: 'wrap', columnGap: ESPACIADO.m, rowGap: ESPACIADO.xs },
  itemLeyenda: { flexDirection: 'row', alignItems: 'center', gap: ESPACIADO.xs },
  punto: { width: 10, height: 10, borderRadius: RADIO.pastilla },
  panel: { borderTopWidth: 1, paddingHorizontal: ESPACIADO.l, paddingTop: ESPACIADO.m, gap: ESPACIADO.s },
  chips: { gap: ESPACIADO.s },
});
