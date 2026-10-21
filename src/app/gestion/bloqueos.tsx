/**
 * Bloquear turnos o días enteros por mantenimiento o lluvia, con motivo escrito.
 * Las reservas que quedan tapadas se suspenden y a cada titular le llega un aviso
 * ("el sábado de la lluvia, vinieron todos").
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { CampoTexto } from '@/componentes/CampoTexto';
import { Chip } from '@/componentes/Chip';
import { Icono } from '@/componentes/Icono';
import { SelectorDia } from '@/componentes/SelectorDia';
import { Texto } from '@/componentes/Texto';
import { useCatalogo } from '@/hooks/useCatalogo';
import { aErrorApi, gestion, type ErrorApi } from '@/servicios';
import { ESPACIADO, RADIO, useTema } from '@/tema';
import type { Bloqueo } from '@/tipos';
import { fechaCorta, hoy } from '@/utilidades/fechas';
import { finDeTurno, HORAS_DEL_DIA } from '@/utilidades/grilla';

const MOTIVOS_RAPIDOS = ['Cancha anegada por la lluvia', 'Mantenimiento', 'Evento municipal'];

async function traerBloqueos(): Promise<{ bloqueos: Bloqueo[] } | { error: ErrorApi }> {
  try {
    return { bloqueos: await gestion.listarBloqueos(hoy()) };
  } catch (e) {
    return { error: aErrorApi(e) };
  }
}

/** Un espacio puntual o todos los espacios al aire libre de un complejo. */
type Alcance = { tipo: 'espacio'; id: string } | { tipo: 'complejo'; nombre: string };

export default function Bloqueos() {
  const { c } = useTema();
  const catalogo = useCatalogo();
  const [alcance, setAlcance] = useState<Alcance | null>(null);
  const [fecha, setFecha] = useState(hoy());
  const [diaEntero, setDiaEntero] = useState(true);
  const [desde, setDesde] = useState('18:00');
  const [hasta, setHasta] = useState('20:00');
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'aviso' | 'error'; titulo: string; detalle?: string } | null>(null);
  const [bloqueos, setBloqueos] = useState<Bloqueo[] | null>(null);
  const [errorLista, setErrorLista] = useState<ErrorApi | null>(null);

  const aplicar = useCallback((r: { bloqueos: Bloqueo[] } | { error: ErrorApi }) => {
    if ('error' in r) setErrorLista(r.error);
    else {
      setBloqueos(r.bloqueos);
      setErrorLista(null);
    }
  }, []);

  const cargar = useCallback(async () => aplicar(await traerBloqueos()), [aplicar]);

  useEffect(() => {
    traerBloqueos().then(aplicar);
  }, [aplicar]);

  const complejos = useMemo(() => [...new Set(catalogo.espacios.map((e) => e.complejo))].sort(), [catalogo.espacios]);
  const nombreEspacio = (id: string) => catalogo.espacios.find((e) => e.id === id)?.nombre ?? id;

  /** Los ids que se bloquean según el alcance. La lluvia no afecta a los techados. */
  const destino = useMemo(() => {
    if (!alcance) return [];
    if (alcance.tipo === 'espacio') return [alcance.id];
    return catalogo.espacios.filter((e) => e.complejo === alcance.nombre && !e.techado && e.activo).map((e) => e.id);
  }, [alcance, catalogo.espacios]);

  const horasFin = HORAS_DEL_DIA.map(finDeTurno).filter((h) => h > desde);

  function confirmar() {
    if (destino.length === 0 || !motivo.trim()) return;
    const cuando = diaEntero ? `todo el ${fechaCorta(fecha)}` : `el ${fechaCorta(fecha)} de ${desde} a ${hasta}`;
    const que = destino.length === 1 ? nombreEspacio(destino[0]) : `${destino.length} espacios`;
    Alert.alert('Bloquear', `Se bloquea ${que} ${cuando}. Las reservas de esos turnos se suspenden y les avisamos.`, [
      { text: 'Volver', style: 'cancel' },
      { text: 'Bloquear', style: 'destructive', onPress: bloquear },
    ]);
  }

  async function bloquear() {
    setGuardando(true);
    setMensaje(null);
    try {
      let suspendidas = 0;
      for (const espacioId of destino) {
        const r = await gestion.crearBloqueo({
          espacioId,
          fecha,
          inicio: diaEntero ? null : desde,
          fin: diaEntero ? null : hasta,
          motivo,
        });
        suspendidas += r.suspendidas;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setMensaje({
        tipo: 'aviso',
        titulo: 'Bloqueado',
        detalle: suspendidas === 0 ? 'No había reservas en esos turnos.' : `Se suspendieron ${suspendidas} reservas y se avisó a cada titular.`,
      });
      setMotivo('');
      await cargar();
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setMensaje({ tipo: 'error', titulo: 'No se pudo bloquear', detalle: aErrorApi(e).message });
    } finally {
      setGuardando(false);
    }
  }

  function quitar(b: Bloqueo) {
    Alert.alert('Quitar bloqueo', `${nombreEspacio(b.espacioId)}, ${fechaCorta(b.fecha)}. Los turnos vuelven a quedar libres (las reservas suspendidas no se recuperan).`, [
      { text: 'Volver', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: async () => {
          try {
            await gestion.borrarBloqueo(b.id);
            await cargar();
          } catch (e) {
            setMensaje({ tipo: 'error', titulo: 'No se pudo quitar', detalle: aErrorApi(e).message });
          }
        },
      },
    ]);
  }

  return (
    <ScrollView style={{ backgroundColor: c.fondo }} contentContainerStyle={estilos.pantalla} keyboardShouldPersistTaps="handled">
      <View style={[estilos.tarjeta, { backgroundColor: c.superficie, borderColor: c.borde }]}>
        <Texto variante="subtitulo" peso="negrita">
          Nuevo bloqueo
        </Texto>

        <Texto variante="etiqueta" peso="seminegrita">
          Dónde
        </Texto>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.chips}>
          {complejos.map((nombre) => (
            <Chip
              key={nombre}
              texto={`Todo ${nombre} (al aire libre)`}
              icono="rainy-outline"
              activo={alcance?.tipo === 'complejo' && alcance.nombre === nombre}
              onPress={() => setAlcance({ tipo: 'complejo', nombre })}
            />
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.chips}>
          {catalogo.espacios.map((e) => (
            <Chip
              key={e.id}
              texto={e.nombre.replace(' — ', ' ')}
              activo={alcance?.tipo === 'espacio' && alcance.id === e.id}
              onPress={() => setAlcance({ tipo: 'espacio', id: e.id })}
            />
          ))}
        </ScrollView>

        <Texto variante="etiqueta" peso="seminegrita">
          Cuándo
        </Texto>
        <SelectorDia fecha={fecha} onCambiar={setFecha} />
        <View style={estilos.chips}>
          <Chip texto="Día entero" activo={diaEntero} onPress={() => setDiaEntero(true)} />
          <Chip texto="Algunas horas" activo={!diaEntero} onPress={() => setDiaEntero(false)} />
        </View>
        {!diaEntero && (
          <>
            <Texto variante="chico" color={c.textoSuave}>
              Desde
            </Texto>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.chips}>
              {HORAS_DEL_DIA.map((h) => (
                <Chip
                  key={h}
                  texto={h}
                  activo={desde === h}
                  onPress={() => {
                    setDesde(h);
                    if (hasta <= h) setHasta(finDeTurno(h));
                  }}
                />
              ))}
            </ScrollView>
            <Texto variante="chico" color={c.textoSuave}>
              Hasta
            </Texto>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.chips}>
              {horasFin.map((h) => (
                <Chip key={h} texto={h} activo={hasta === h} onPress={() => setHasta(h)} />
              ))}
            </ScrollView>
          </>
        )}

        <CampoTexto etiqueta="Motivo (lo ven quienes tenían turno)" icono="create-outline" value={motivo} onChangeText={setMotivo} placeholder="Cancha anegada por la lluvia" />
        <View style={[estilos.chips, estilos.envolver]}>
          {MOTIVOS_RAPIDOS.map((m) => (
            <Chip key={m} texto={m} activo={motivo === m} onPress={() => setMotivo(m)} />
          ))}
        </View>

        {mensaje && <Aviso tipo={mensaje.tipo} titulo={mensaje.titulo} detalle={mensaje.detalle} icono={mensaje.tipo === 'aviso' ? 'checkmark-circle-outline' : undefined} />}
        <Boton
          titulo={destino.length > 1 ? `Bloquear ${destino.length} espacios` : 'Bloquear'}
          icono="lock-closed-outline"
          onPress={confirmar}
          cargando={guardando}
          deshabilitado={destino.length === 0 || !motivo.trim()}
        />
      </View>

      <Texto variante="subtitulo" peso="negrita">
        Próximos bloqueos
      </Texto>
      {errorLista && <Aviso tipo="error" titulo="No se pudo cargar la lista" detalle={errorLista.message} accion={{ titulo: 'Reintentar', onPress: cargar }} />}
      {bloqueos?.length === 0 && <Texto color={c.textoSuave}>No hay bloqueos cargados.</Texto>}
      {bloqueos?.map((b) => (
        <View key={b.id} style={[estilos.fila, { backgroundColor: c.superficie, borderColor: c.borde }]}>
          <Icono nombre="construct-outline" color={c.aviso} tamano={22} />
          <View style={estilos.flex}>
            <Texto peso="seminegrita">{nombreEspacio(b.espacioId)}</Texto>
            <Texto variante="etiqueta">
              {fechaCorta(b.fecha)}, {b.inicio ? `de ${b.inicio} a ${b.fin}` : 'todo el día'}
            </Texto>
            <Texto variante="chico" color={c.textoSuave}>
              {b.motivo}
            </Texto>
          </View>
          <Pressable onPress={() => quitar(b)} accessibilityRole="button" accessibilityLabel="Quitar bloqueo" hitSlop={10} style={estilos.quitar}>
            <Icono nombre="trash-outline" color={c.peligro} tamano={22} />
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { padding: ESPACIADO.l, gap: ESPACIADO.m, paddingBottom: ESPACIADO.xxl },
  tarjeta: { borderRadius: RADIO.tarjeta, borderWidth: 1, padding: ESPACIADO.m, gap: ESPACIADO.m },
  chips: { flexDirection: 'row', gap: ESPACIADO.s },
  envolver: { flexWrap: 'wrap' },
  fila: { flexDirection: 'row', gap: ESPACIADO.m, padding: ESPACIADO.m, borderRadius: RADIO.control, borderWidth: 1, alignItems: 'center' },
  flex: { flex: 1 },
  quitar: { padding: ESPACIADO.s },
});
