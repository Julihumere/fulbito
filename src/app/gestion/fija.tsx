/** Alta y edición de una reserva fija. Sin `id` en la ruta es una nueva. */
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { CampoTexto } from '@/componentes/CampoTexto';
import { Chip } from '@/componentes/Chip';
import { Texto } from '@/componentes/Texto';
import { useCatalogo } from '@/hooks/useCatalogo';
import { aErrorApi, gestion, reservas as servicioReservas } from '@/servicios';
import { ESPACIADO, RADIO, useTema } from '@/tema';
import type { DatosReservaFija, DiaSemana } from '@/tipos';
import { hoy, NOMBRES_DIAS } from '@/utilidades/fechas';
import { finDeTurno, HORAS_DEL_DIA } from '@/utilidades/grilla';

const ORDEN_DIAS: DiaSemana[] = [1, 2, 3, 4, 5, 6, 0];
const FECHA_VALIDA = /^\d{4}-\d{2}-\d{2}$/;

const VACIA: DatosReservaFija = {
  espacioId: '',
  titular: '',
  dia: 2,
  inicio: '21:00',
  fin: '22:00',
  desde: hoy(),
  hasta: null,
  activa: true,
};

export default function FormularioFija() {
  const { c } = useTema();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const catalogo = useCatalogo();
  const [datos, setDatos] = useState<DatosReservaFija | null>(id ? null : VACIA);
  const [hastaTexto, setHastaTexto] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    servicioReservas
      .listarFijas()
      .then((lista) => {
        const f = lista.find((x) => x.id === id);
        if (!f) {
          setError('Esa reserva fija ya no existe.');
          return;
        }
        const { id: _id, ...resto } = f;
        setDatos(resto);
        setHastaTexto(f.hasta ?? '');
      })
      .catch((e) => setError(aErrorApi(e).message));
  }, [id]);

  if (!datos) {
    return (
      <View style={[estilos.pantalla, { backgroundColor: c.fondo }]}>
        {error ? <Aviso tipo="error" titulo="No se pudo abrir" detalle={error} /> : <ActivityIndicator color={c.cesped} size="large" />}
      </View>
    );
  }

  const cambiar = (parcial: Partial<DatosReservaFija>) => setDatos({ ...datos, ...parcial });
  const horasFin = HORAS_DEL_DIA.map(finDeTurno).filter((h) => h > datos.inicio);

  async function guardar() {
    if (!datos) return;
    const hasta = hastaTexto.trim() || null;
    if (!FECHA_VALIDA.test(datos.desde) || (hasta !== null && !FECHA_VALIDA.test(hasta))) {
      setError('Las fechas van con la forma AAAA-MM-DD, por ejemplo 2026-03-01.');
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const final = { ...datos, hasta };
      if (id) await gestion.editarFija(id, final);
      else await gestion.crearFija(final);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(aErrorApi(e).message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <ScrollView style={{ backgroundColor: c.fondo }} contentContainerStyle={estilos.pantalla} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: id ? 'Editar fija' : 'Nueva fija' }} />

      <CampoTexto
        etiqueta="A nombre de"
        icono="people-outline"
        value={datos.titular}
        onChangeText={(t) => cambiar({ titular: t })}
        placeholder="Grupo de los martes"
      />

      <Texto variante="etiqueta" peso="seminegrita">
        Espacio
      </Texto>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.chips}>
        {catalogo.espacios.map((e) => (
          <Chip key={e.id} texto={e.nombre.replace(' — ', ' ')} activo={datos.espacioId === e.id} onPress={() => cambiar({ espacioId: e.id })} />
        ))}
      </ScrollView>

      <Texto variante="etiqueta" peso="seminegrita">
        Día de la semana
      </Texto>
      <View style={[estilos.chips, estilos.envolver]}>
        {ORDEN_DIAS.map((d) => (
          <Chip key={d} texto={NOMBRES_DIAS[d]} activo={datos.dia === d} onPress={() => cambiar({ dia: d })} />
        ))}
      </View>

      <Texto variante="etiqueta" peso="seminegrita">
        Desde las
      </Texto>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.chips}>
        {HORAS_DEL_DIA.map((h) => (
          <Chip
            key={h}
            texto={h}
            activo={datos.inicio === h}
            onPress={() => cambiar({ inicio: h, fin: datos.fin > h ? datos.fin : finDeTurno(h) })}
          />
        ))}
      </ScrollView>
      <Texto variante="etiqueta" peso="seminegrita">
        Hasta las
      </Texto>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.chips}>
        {horasFin.map((h) => (
          <Chip key={h} texto={h} activo={datos.fin === h} onPress={() => cambiar({ fin: h })} />
        ))}
      </ScrollView>

      <CampoTexto
        etiqueta="Vigente desde (AAAA-MM-DD)"
        icono="calendar-outline"
        value={datos.desde}
        onChangeText={(t) => cambiar({ desde: t })}
        keyboardType="numbers-and-punctuation"
        autoCorrect={false}
      />
      <CampoTexto
        etiqueta="Vigente hasta (vacío = sin fin)"
        icono="calendar-outline"
        value={hastaTexto}
        onChangeText={setHastaTexto}
        placeholder="Sin fecha de fin"
        keyboardType="numbers-and-punctuation"
        autoCorrect={false}
      />

      <View style={[estilos.interruptor, { backgroundColor: c.superficie, borderColor: c.borde }]}>
        <View style={estilos.flex}>
          <Texto peso="seminegrita">Activa</Texto>
          <Texto variante="chico" color={c.textoSuave}>
            Si la desactivás, deja de ocupar la grilla.
          </Texto>
        </View>
        <Switch
          value={datos.activa}
          onValueChange={(v) => cambiar({ activa: v })}
          trackColor={{ true: c.cesped, false: c.borde }}
          thumbColor={datos.activa ? c.acento : c.superficieElevada}
          accessibilityLabel="Fija activa"
        />
      </View>

      {error && <Aviso tipo="error" titulo="No se pudo guardar" detalle={error} />}
      <Boton
        titulo="Guardar"
        icono="save-outline"
        onPress={guardar}
        cargando={guardando}
        deshabilitado={!datos.espacioId || !datos.titular.trim()}
      />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { padding: ESPACIADO.l, gap: ESPACIADO.m, paddingBottom: ESPACIADO.xxl, flexGrow: 1 },
  chips: { flexDirection: 'row', gap: ESPACIADO.s },
  envolver: { flexWrap: 'wrap' },
  interruptor: { flexDirection: 'row', alignItems: 'center', gap: ESPACIADO.m, padding: ESPACIADO.m, borderRadius: RADIO.tarjeta, borderWidth: 1 },
  flex: { flex: 1 },
});
