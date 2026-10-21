/**
 * Agenda del día de todos los espacios: quién tiene cada turno, si llegó,
 * y los botones de presente y ausente.
 */
import { useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, SectionList, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { Chip } from '@/componentes/Chip';
import { Icono } from '@/componentes/Icono';
import { SelectorDia } from '@/componentes/SelectorDia';
import { Texto } from '@/componentes/Texto';
import { useAgenda } from '@/hooks/useAgenda';
import { useCatalogo } from '@/hooks/useCatalogo';
import { aErrorApi, gestion } from '@/servicios';
import { ESPACIADO, FUENTES, RADIO, useTema } from '@/tema';
import type { EntradaAgenda } from '@/tipos';
import { horaDeIso, hoy } from '@/utilidades/fechas';
import { turnoPasado } from '@/utilidades/grilla';
import { UMBRAL_MARCADO } from '@/utilidades/reglas';

export default function Agenda() {
  const { c } = useTema();
  const catalogo = useCatalogo();
  const [fecha, setFecha] = useState(hoy());
  const [espacioId, setEspacioId] = useState<string | null>(null);
  const [soloOcupados, setSoloOcupados] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const agenda = useAgenda(fecha);

  async function refrescar() {
    setRefrescando(true);
    await agenda.recargar();
    setRefrescando(false);
  }

  async function marcar(reservaId: string, accion: 'presente' | 'ausente') {
    setProcesando(reservaId);
    setMensaje(null);
    try {
      if (accion === 'presente') await gestion.marcarPresente(reservaId);
      else await gestion.marcarAusente(reservaId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await agenda.recargar();
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setMensaje(aErrorApi(e).message);
    } finally {
      setProcesando(null);
    }
  }

  const secciones = useMemo(() => {
    if (!agenda.entradas) return [];
    return catalogo.espacios
      .filter((e) => !espacioId || e.id === espacioId)
      .map((e) => {
        const delEspacio = agenda.entradas?.filter((x) => x.turno.espacioId === e.id) ?? [];
        const libres = delEspacio.filter((x) => x.turno.estado === 'libre').length;
        const data = soloOcupados ? delEspacio.filter((x) => x.turno.estado !== 'libre') : delEspacio;
        return { titulo: e.nombre, libres, data };
      })
      .filter((s) => s.data.length > 0 || !soloOcupados);
  }, [agenda.entradas, catalogo.espacios, espacioId, soloOcupados]);

  const encabezado = (
    <View style={estilos.encabezado}>
      <SelectorDia fecha={fecha} onCambiar={setFecha} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.chips}>
        <Chip texto="Todos" activo={espacioId === null} onPress={() => setEspacioId(null)} />
        {catalogo.espacios.map((e) => (
          <Chip key={e.id} texto={e.nombre.replace(' — ', ' ')} activo={espacioId === e.id} onPress={() => setEspacioId(espacioId === e.id ? null : e.id)} />
        ))}
      </ScrollView>
      <View style={estilos.chips}>
        <Chip texto="Sólo ocupados" icono="funnel-outline" activo={soloOcupados} onPress={() => setSoloOcupados((v) => !v)} />
      </View>
      {agenda.desdeCopia && <Aviso tipo="aviso" titulo="Sin conexión" detalle="Ves la agenda guardada en el teléfono." />}
      {agenda.error && !agenda.entradas && (
        <Aviso tipo="error" titulo="No se pudo cargar la agenda" detalle={agenda.error.message} accion={{ titulo: 'Reintentar', onPress: refrescar }} />
      )}
      {mensaje && <Aviso tipo="error" titulo="No se pudo registrar" detalle={mensaje} />}
    </View>
  );

  return (
    <SectionList
      style={{ backgroundColor: c.fondo }}
      contentContainerStyle={estilos.lista}
      sections={secciones}
      keyExtractor={(x) => x.turno.id}
      ListHeaderComponent={encabezado}
      stickySectionHeadersEnabled={false}
      ListEmptyComponent={
        agenda.entradas ? (
          <Texto color={c.textoSuave} centrado style={estilos.vacio}>
            No hay turnos ocupados este día.
          </Texto>
        ) : agenda.error ? null : (
          <ActivityIndicator color={c.cesped} size="large" style={estilos.vacio} />
        )
      }
      renderSectionHeader={({ section }) => (
        <View style={estilos.seccion}>
          <Texto peso="negrita">{section.titulo}</Texto>
          <Texto variante="chico" color={c.textoSuave}>
            {section.libres} libres
          </Texto>
        </View>
      )}
      renderItem={({ item }) => (
        <FilaAgenda entrada={item} ahora={agenda.ahora} procesando={procesando === item.reserva?.id} onMarcar={marcar} />
      )}
      refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={c.cesped} colors={[c.cesped]} />}
    />
  );
}

function FilaAgenda({
  entrada, ahora, procesando, onMarcar,
}: {
  entrada: EntradaAgenda;
  ahora: number;
  procesando: boolean;
  onMarcar: (reservaId: string, accion: 'presente' | 'ausente') => void;
}) {
  const { c } = useTema();
  const { turno, reserva, titular, titularFijo } = entrada;
  const marcado = !!titular && titular.cancelacionesTardias >= UMBRAL_MARCADO;
  const pendiente = reserva?.estado === 'confirmada' && turno.fecha === hoy();
  const empezo = turnoPasado(turno, ahora);

  let quien: string;
  let detalle: string | null = null;
  if (turno.estado === 'mantenimiento') {
    quien = 'Bloqueado';
    detalle = turno.motivoBloqueo;
  } else if (turno.estado === 'fijo') {
    quien = titularFijo ?? 'Reserva fija';
    detalle = 'Fija semanal';
  } else if (reserva && titular) {
    quien = titular.nombre;
    detalle = `${reserva.cantidadPersonas} personas · ${titular.telefono}`;
  } else {
    quien = 'Libre';
  }

  const estadoReserva =
    reserva?.estado === 'cumplida'
      ? { texto: `Llegó ${reserva.ingresoEn ? horaDeIso(reserva.ingresoEn) : ''}`, color: c.cesped }
      : reserva?.estado === 'ausente'
        ? { texto: 'Ausente', color: c.peligro }
        : reserva?.estado === 'confirmada'
          ? { texto: 'Esperando', color: c.textoSuave }
          : null;

  return (
    <View style={[estilos.fila, { backgroundColor: c.superficie, borderColor: c.borde }]}>
      <View style={estilos.filaArriba}>
        <Texto peso="negrita" style={{ fontFamily: FUENTES.negrita }}>
          {turno.inicio}
        </Texto>
        <View style={estilos.flex}>
          <Texto peso="seminegrita" color={turno.estado === 'libre' ? c.textoSuave : c.texto}>
            {quien}
          </Texto>
          {detalle && (
            <Texto variante="chico" color={turno.estado === 'mantenimiento' ? c.aviso : c.textoSuave}>
              {detalle}
            </Texto>
          )}
          {marcado && titular && (
            <View style={estilos.marca}>
              <Icono nombre="warning-outline" color={c.aviso} tamano={14} />
              <Texto variante="chico" color={c.aviso}>
                {titular.cancelacionesTardias} cancelaciones tardías · {titular.ausencias} ausencias
              </Texto>
            </View>
          )}
        </View>
        {estadoReserva && (
          <Texto variante="chico" peso="seminegrita" color={estadoReserva.color}>
            {estadoReserva.texto}
          </Texto>
        )}
      </View>
      {pendiente && reserva && (
        <View style={estilos.botones}>
          <View style={estilos.flex}>
            <Boton titulo="Llegó" compacto variante="secundario" icono="checkmark-outline" cargando={procesando} onPress={() => onMarcar(reserva.id, 'presente')} />
          </View>
          {empezo && (
            <View style={estilos.flex}>
              <Boton titulo="No se presentó" compacto variante="secundario" icono="close-outline" deshabilitado={procesando} onPress={() => onMarcar(reserva.id, 'ausente')} />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  lista: { padding: ESPACIADO.l, paddingBottom: ESPACIADO.xxl },
  encabezado: { gap: ESPACIADO.m, paddingBottom: ESPACIADO.s },
  chips: { flexDirection: 'row', gap: ESPACIADO.s },
  vacio: { paddingVertical: ESPACIADO.xxl },
  seccion: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: ESPACIADO.l, paddingBottom: ESPACIADO.xs },
  fila: { borderRadius: RADIO.control, borderWidth: 1, padding: ESPACIADO.m, marginTop: ESPACIADO.s, gap: ESPACIADO.s },
  filaArriba: { flexDirection: 'row', gap: ESPACIADO.m, alignItems: 'flex-start' },
  flex: { flex: 1 },
  marca: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  botones: { flexDirection: 'row', gap: ESPACIADO.s },
});
