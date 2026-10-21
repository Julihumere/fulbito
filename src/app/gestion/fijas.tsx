/**
 * Reservas fijas: grupos y clubes que tienen el turno todas las semanas.
 * Una fija no es un turno, es una regla: ocupa la grilla mientras esté vigente.
 */
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { Icono } from '@/componentes/Icono';
import { Texto } from '@/componentes/Texto';
import { useCatalogo } from '@/hooks/useCatalogo';
import { aErrorApi, reservas as servicioReservas, type ErrorApi } from '@/servicios';
import { ESPACIADO, RADIO, useTema } from '@/tema';
import type { ReservaFija } from '@/tipos';
import { hoy, NOMBRES_DIAS } from '@/utilidades/fechas';

/** Vigente hoy o a futuro. */
const vigente = (f: ReservaFija) => f.activa && (f.hasta === null || f.hasta >= hoy());

export default function Fijas() {
  const { c } = useTema();
  const catalogo = useCatalogo();
  const [fijas, setFijas] = useState<ReservaFija[] | null>(null);
  const [error, setError] = useState<ErrorApi | null>(null);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const lista = await servicioReservas.listarFijas();
      // Primero las vigentes, después por espacio, día y hora.
      lista.sort(
        (a, b) =>
          Number(vigente(b)) - Number(vigente(a)) ||
          a.espacioId.localeCompare(b.espacioId) ||
          a.dia - b.dia ||
          a.inicio.localeCompare(b.inicio),
      );
      setFijas(lista);
      setError(null);
    } catch (e) {
      setError(aErrorApi(e));
    }
  }, []);

  // Se recarga al volver del formulario.
  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  async function refrescar() {
    setRefrescando(true);
    await cargar();
    setRefrescando(false);
  }

  const nombreEspacio = (id: string) => catalogo.espacios.find((e) => e.id === id)?.nombre ?? id;

  return (
    <FlatList
      style={{ backgroundColor: c.fondo }}
      contentContainerStyle={estilos.lista}
      data={fijas ?? []}
      keyExtractor={(f) => f.id}
      ListHeaderComponent={
        <View style={estilos.encabezado}>
          <Boton titulo="Nueva reserva fija" icono="add-circle-outline" onPress={() => router.push('/gestion/fija')} />
          {error && <Aviso tipo="error" titulo="No se pudieron cargar" detalle={error.message} accion={{ titulo: 'Reintentar', onPress: cargar }} />}
        </View>
      }
      ListEmptyComponent={fijas ? <Texto color={c.textoSuave}>No hay reservas fijas cargadas.</Texto> : null}
      renderItem={({ item }) => {
        const activa = vigente(item);
        return (
          <Pressable
            onPress={() => router.push({ pathname: '/gestion/fija', params: { id: item.id } })}
            accessibilityRole="button"
            accessibilityHint="Editar la reserva fija"
            style={({ pressed }) => [
              estilos.fila,
              { backgroundColor: c.superficie, borderColor: c.borde },
              !activa && estilos.inactiva,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Icono nombre="repeat-outline" color={activa ? c.cesped : c.textoSuave} tamano={24} />
            <View style={estilos.flex}>
              <Texto peso="seminegrita">{item.titular}</Texto>
              <Texto variante="etiqueta">
                {NOMBRES_DIAS[item.dia]}s de {item.inicio} a {item.fin}
              </Texto>
              <Texto variante="chico" color={c.textoSuave}>
                {nombreEspacio(item.espacioId)} · desde {item.desde}
                {item.hasta ? ` hasta ${item.hasta}` : ', sin fecha de fin'}
              </Texto>
              {!activa && (
                <Texto variante="chico" peso="seminegrita" color={c.aviso}>
                  {item.activa ? 'Vencida' : 'Dada de baja'}
                </Texto>
              )}
            </View>
            <Icono nombre="chevron-forward" color={c.textoSuave} tamano={18} />
          </Pressable>
        );
      }}
      refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={c.cesped} colors={[c.cesped]} />}
    />
  );
}

const estilos = StyleSheet.create({
  lista: { padding: ESPACIADO.l, gap: ESPACIADO.m, paddingBottom: ESPACIADO.xxl },
  encabezado: { gap: ESPACIADO.m },
  fila: { flexDirection: 'row', alignItems: 'center', gap: ESPACIADO.m, padding: ESPACIADO.m, borderRadius: RADIO.tarjeta, borderWidth: 1 },
  inactiva: { opacity: 0.6 },
  flex: { flex: 1, gap: 2 },
});
