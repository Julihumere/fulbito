/**
 * Reservas activas del día para que el encargado o el administrador
 * puedan cancelarlas (lluvia, cancha rota, pedido del titular).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { Chip } from '@/componentes/Chip';
import { SelectorDia } from '@/componentes/SelectorDia';
import { Texto } from '@/componentes/Texto';
import { useCatalogo } from '@/hooks/useCatalogo';
import { aErrorApi, gestion, type ErrorApi } from '@/servicios';
import type { ReservaCancelable } from '@/servicios/gestion';
import { ESPACIADO, FUENTES, RADIO, useTema } from '@/tema';
import { hoy, instante } from '@/utilidades/fechas';

export default function ReservasGestion() {
  const { c } = useTema();
  const catalogo = useCatalogo();
  const [fecha, setFecha] = useState(hoy());
  const [espacioId, setEspacioId] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ tipo: 'aviso' | 'error'; titulo: string; detalle: string } | null>(null);
  const [cargada, setCargada] = useState<{ fecha: string; filas: ReservaCancelable[] | null; ahora: number; error: ErrorApi | null } | null>(null);

  const cargar = useCallback(async (dia: string) => {
    try {
      return { fecha: dia, filas: await gestion.reservasCancelables(dia), ahora: Date.now(), error: null };
    } catch (e) {
      return { fecha: dia, filas: null, ahora: Date.now(), error: aErrorApi(e) };
    }
  }, []);

  useEffect(() => {
    let vivo = true;
    cargar(fecha).then((r) => vivo && setCargada(r));
    return () => {
      vivo = false;
    };
  }, [fecha, cargar]);

  const vigente = cargada && cargada.fecha === fecha ? cargada : null;

  async function refrescar() {
    setRefrescando(true);
    setCargada(await cargar(fecha));
    setRefrescando(false);
  }

  function confirmar(entrada: ReservaCancelable) {
    const nombre = entrada.titular?.nombre ?? 'la reserva';
    Alert.alert('Cancelar la reserva', `Se cancela el turno de ${nombre} y queda libre para otra persona.`, [
      { text: 'Volver', style: 'cancel' },
      { text: 'Cancelar reserva', style: 'destructive', onPress: () => cancelar(entrada) },
    ]);
  }

  async function cancelar(entrada: ReservaCancelable) {
    setProcesando(entrada.reserva.id);
    setResultado(null);
    try {
      await gestion.cancelarReserva(entrada.reserva.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setResultado({ tipo: 'aviso', titulo: 'Reserva cancelada', detalle: 'El turno quedó libre.' });
      setCargada(await cargar(fecha));
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setResultado({ tipo: 'error', titulo: 'No se pudo cancelar', detalle: aErrorApi(e).message });
    } finally {
      setProcesando(null);
    }
  }

  const reservas = useMemo(() => {
    if (!vigente?.filas) return [];
    return vigente.filas
      .filter((x) => !espacioId || x.espacioId === espacioId)
      .sort((a, b) => a.inicio.localeCompare(b.inicio) || a.espacioId.localeCompare(b.espacioId));
  }, [vigente, espacioId]);

  const encabezado = (
    <View style={estilos.encabezado}>
      <SelectorDia fecha={fecha} onCambiar={setFecha} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.chips}>
        <Chip texto="Todos" activo={espacioId === null} onPress={() => setEspacioId(null)} />
        {catalogo.espacios.map((e) => (
          <Chip key={e.id} texto={e.nombre.replace(' — ', ' ')} activo={espacioId === e.id} onPress={() => setEspacioId(espacioId === e.id ? null : e.id)} />
        ))}
      </ScrollView>
      {vigente?.error && (
        <Aviso tipo="error" titulo="No se pudieron cargar las reservas" detalle={vigente.error.message} accion={{ titulo: 'Reintentar', onPress: refrescar }} />
      )}
      {resultado && <Aviso tipo={resultado.tipo} titulo={resultado.titulo} detalle={resultado.detalle} icono={resultado.tipo === 'aviso' ? 'checkmark-circle-outline' : undefined} />}
    </View>
  );

  return (
    <FlatList
      style={{ backgroundColor: c.fondo }}
      contentContainerStyle={estilos.lista}
      data={reservas}
      keyExtractor={(x) => x.reserva.id}
      ListHeaderComponent={encabezado}
      ListEmptyComponent={
        vigente?.filas ? (
          <Texto color={c.textoSuave} centrado style={estilos.vacio}>
            No hay reservas para cancelar este día.
          </Texto>
        ) : vigente?.error ? undefined : (
          <ActivityIndicator color={c.cesped} size="large" style={estilos.vacio} />
        )
      }
      renderItem={({ item }) => (
        <FilaReserva
          entrada={item}
          nombreEspacio={catalogo.espacios.find((e) => e.id === item.espacioId)?.nombre ?? 'Espacio'}
          ahora={vigente?.ahora ?? 0}
          procesando={procesando === item.reserva.id}
          bloqueado={procesando !== null}
          onCancelar={confirmar}
        />
      )}
      refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={c.cesped} colors={[c.cesped]} />}
    />
  );
}

function FilaReserva({
  entrada, nombreEspacio, ahora, procesando, bloqueado, onCancelar,
}: {
  entrada: ReservaCancelable;
  nombreEspacio: string;
  ahora: number;
  procesando: boolean;
  bloqueado: boolean;
  onCancelar: (entrada: ReservaCancelable) => void;
}) {
  const { c } = useTema();
  const { reserva, titular } = entrada;
  const cancelable = ahora < instante(entrada.fecha, entrada.inicio);

  return (
    <View style={[estilos.fila, { backgroundColor: c.superficie, borderColor: c.borde }]}>
      <View style={estilos.filaArriba}>
        <Texto peso="negrita" style={{ fontFamily: FUENTES.negrita }}>
          {entrada.inicio}
        </Texto>
        <View style={estilos.flex}>
          <Texto peso="seminegrita">{titular?.nombre ?? 'Reserva'}</Texto>
          <Texto variante="chico" color={c.textoSuave}>
            {nombreEspacio}
          </Texto>
          <Texto variante="chico" color={c.textoSuave}>
            {reserva.cantidadPersonas} {reserva.cantidadPersonas === 1 ? 'persona' : 'personas'}
            {titular?.telefono ? ` · ${titular.telefono}` : ''}
          </Texto>
        </View>
      </View>
      {cancelable ? (
        <Boton
          titulo="Cancelar reserva"
          compacto
          variante="secundario"
          icono="close-circle-outline"
          cargando={procesando}
          deshabilitado={bloqueado}
          onPress={() => onCancelar(entrada)}
        />
      ) : (
        <Texto variante="chico" color={c.textoSuave}>
          El turno ya empezó: no se puede cancelar.
        </Texto>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  lista: { padding: ESPACIADO.l, paddingBottom: ESPACIADO.xxl },
  encabezado: { gap: ESPACIADO.m, paddingBottom: ESPACIADO.s },
  chips: { flexDirection: 'row', gap: ESPACIADO.s },
  vacio: { paddingVertical: ESPACIADO.xxl },
  fila: { borderRadius: RADIO.control, borderWidth: 1, padding: ESPACIADO.m, marginTop: ESPACIADO.s, gap: ESPACIADO.s },
  filaArriba: { flexDirection: 'row', gap: ESPACIADO.m, alignItems: 'flex-start' },
  flex: { flex: 1 },
});
