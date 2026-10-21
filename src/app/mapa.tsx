/**
 * Los complejos en el mapa, cuál queda más cerca y cómo llegar.
 * La ubicación es opcional: sin ella se ve todo igual.
 */
import { useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Boton } from '@/componentes/Boton';
import { Icono } from '@/componentes/Icono';
import { abrirComoLlegar } from '@/componentes/MapaComplejo';
import { Texto } from '@/componentes/Texto';
import { useCatalogo } from '@/hooks/useCatalogo';
import { distanciaKm, formatearDistancia, useUbicacion } from '@/hooks/useUbicacion';
import { ESPACIADO, RADIO, useTema } from '@/tema';
import type { Coordenadas } from '@/tipos';

interface Complejo {
  nombre: string;
  coordenadas: Coordenadas;
  espacios: number;
  distancia: number | null;
}

export default function Mapa() {
  const { c, esNoche } = useTema();
  const insets = useSafeAreaInsets();
  const catalogo = useCatalogo();
  const ubicacion = useUbicacion();
  const mapa = useRef<MapView>(null);

  // La entidad Complejo no existe en el documento (pregunta 8): se arma agrupando los espacios.
  const complejos = useMemo<Complejo[]>(() => {
    const porNombre = new Map<string, Complejo>();
    catalogo.espacios.forEach((e) => {
      const previo = porNombre.get(e.complejo);
      if (previo) previo.espacios += 1;
      else porNombre.set(e.complejo, { nombre: e.complejo, coordenadas: e.coordenadas, espacios: 1, distancia: null });
    });
    const lista = [...porNombre.values()].map((x) => ({
      ...x,
      distancia: ubicacion.posicion ? distanciaKm(ubicacion.posicion, x.coordenadas) : null,
    }));
    return lista.sort((a, b) => (a.distancia ?? 0) - (b.distancia ?? 0) || a.nombre.localeCompare(b.nombre));
  }, [catalogo.espacios, ubicacion.posicion]);

  const centro = complejos[0]?.coordenadas ?? { latitud: -31.8642, longitud: -59.0281 };
  const masCerca = ubicacion.posicion ? complejos[0] : null;

  function enfocar(x: Complejo) {
    mapa.current?.animateToRegion(
      { latitude: x.coordenadas.latitud, longitude: x.coordenadas.longitud, latitudeDelta: 0.008, longitudeDelta: 0.008 },
      400,
    );
  }

  return (
    <View style={[estilos.raiz, { backgroundColor: c.fondo }]}>
      <MapView
        ref={mapa}
        style={estilos.mapa}
        initialRegion={{ latitude: centro.latitud, longitude: centro.longitud, latitudeDelta: 0.03, longitudeDelta: 0.03 }}
        showsUserLocation={ubicacion.estado === 'lista'}
        userInterfaceStyle={esNoche ? 'dark' : 'light'}
        accessibilityLabel="Mapa de los complejos deportivos municipales"
      >
        {complejos.map((x) => (
          <Marker
            key={x.nombre}
            coordinate={{ latitude: x.coordenadas.latitud, longitude: x.coordenadas.longitud }}
            title={x.nombre}
            description={`${x.espacios} ${x.espacios === 1 ? 'espacio' : 'espacios'}`}
            pinColor={c.cesped}
          />
        ))}
      </MapView>

      <ScrollView style={estilos.lista} contentContainerStyle={[estilos.contenidoLista, { paddingBottom: insets.bottom + ESPACIADO.l }]}>
        {masCerca && masCerca.distancia !== null && (
          <View style={[estilos.cerca, { backgroundColor: c.fondoAviso }]}>
            <Icono nombre="locate-outline" color={c.aviso} tamano={20} />
            <Texto variante="etiqueta" color={c.aviso} style={estilos.flex}>
              Te queda más cerca {masCerca.nombre}, a {formatearDistancia(masCerca.distancia)}.
            </Texto>
          </View>
        )}
        {ubicacion.estado === 'sin-pedir' && (
          <Boton titulo="Ver cuál me queda más cerca" variante="secundario" icono="locate-outline" onPress={ubicacion.pedir} />
        )}
        {ubicacion.estado === 'buscando' && <Texto variante="etiqueta" color={c.textoSuave}>Buscando tu ubicación…</Texto>}
        {(ubicacion.estado === 'denegada' || ubicacion.estado === 'error') && (
          <Texto variante="chico" color={c.textoSuave}>
            Sin tu ubicación no podemos calcular distancias, pero podés ver todos los complejos y cómo llegar.
          </Texto>
        )}

        {complejos.map((x) => (
          <View key={x.nombre} style={[estilos.tarjeta, { backgroundColor: c.superficie, borderColor: c.borde }]}>
            <View style={estilos.fila}>
              <Icono nombre="location" color={c.cesped} tamano={22} />
              <View style={estilos.flex}>
                <Texto peso="seminegrita">{x.nombre}</Texto>
                <Texto variante="chico" color={c.textoSuave}>
                  {x.espacios} {x.espacios === 1 ? 'espacio' : 'espacios'}
                  {x.distancia !== null ? ` · a ${formatearDistancia(x.distancia)}` : ''}
                </Texto>
              </View>
            </View>
            <View style={estilos.botones}>
              <View style={estilos.flex}>
                <Boton titulo="Ver" variante="secundario" compacto icono="eye-outline" onPress={() => enfocar(x)} />
              </View>
              <View style={estilos.flex}>
                <Boton titulo="Cómo llegar" compacto icono="navigate-outline" onPress={() => abrirComoLlegar(x.coordenadas, x.nombre)} />
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1 },
  mapa: { height: '48%' },
  lista: { flex: 1 },
  contenidoLista: { padding: ESPACIADO.l, gap: ESPACIADO.m },
  cerca: { flexDirection: 'row', gap: ESPACIADO.s, padding: ESPACIADO.m, borderRadius: RADIO.control, alignItems: 'center' },
  tarjeta: { borderRadius: RADIO.tarjeta, borderWidth: 1, padding: ESPACIADO.m, gap: ESPACIADO.m },
  fila: { flexDirection: 'row', gap: ESPACIADO.s, alignItems: 'center' },
  flex: { flex: 1 },
  botones: { flexDirection: 'row', gap: ESPACIADO.s },
});
