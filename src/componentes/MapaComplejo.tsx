import { Linking, Platform, StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { RADIO, useTema } from '@/tema';
import type { Coordenadas } from '@/tipos';
import { Boton } from './Boton';
import { Texto } from './Texto';

interface Props {
  complejo: string;
  coordenadas: Coordenadas;
}

/** Abre la app de mapas del teléfono con la ruta hasta el complejo. */
export function abrirComoLlegar({ latitud, longitud }: Coordenadas, nombre: string) {
  const destino = `${latitud},${longitud}`;
  const url =
    Platform.OS === 'ios'
      ? `http://maps.apple.com/?daddr=${destino}&q=${encodeURIComponent(nombre)}`
      : `https://www.google.com/maps/dir/?api=1&destination=${destino}`;
  Linking.openURL(url).catch(() => {});
}

/** Mapa chico de la ficha (react-native-maps) y el botón "Cómo llegar". */
export function MapaComplejo({ complejo, coordenadas }: Props) {
  const { c, esNoche } = useTema();
  const region = { latitude: coordenadas.latitud, longitude: coordenadas.longitud, latitudeDelta: 0.006, longitudeDelta: 0.006 };
  return (
    <View style={estilos.contenedor}>
      <Texto peso="seminegrita">Dónde queda</Texto>
      <View style={[estilos.mapa, { borderColor: c.borde }]}>
        <MapView
          style={StyleSheet.absoluteFill}
          initialRegion={region}
          userInterfaceStyle={esNoche ? 'dark' : 'light'}
          // El mapa de la ficha es de referencia: el scroll de la pantalla no se traba con él.
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          accessibilityLabel={`Mapa con la ubicación de ${complejo}`}
        >
          <Marker coordinate={{ latitude: coordenadas.latitud, longitude: coordenadas.longitud }} title={complejo} />
        </MapView>
      </View>
      <Boton
        titulo="Cómo llegar"
        icono="navigate-outline"
        onPress={() => abrirComoLlegar(coordenadas, complejo)}
        accessibilityHint="Abre la app de mapas con la ruta hasta el complejo"
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { gap: 8 },
  mapa: { height: 200, borderRadius: RADIO.tarjeta, overflow: 'hidden', borderWidth: 1 },
});
