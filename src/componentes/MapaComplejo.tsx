import { useMemo } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { RADIO, useTema } from '@/tema';
import type { Coordenadas } from '@/tipos';
import { Boton } from './Boton';
import { Texto } from './Texto';

interface Props {
  complejo: string;
  coordenadas: Coordenadas;
}

/** Abre la app de mapas del teléfono con la ruta hasta el complejo. */
function abrirComoLlegar({ latitud, longitud }: Coordenadas, nombre: string) {
  const destino = `${latitud},${longitud}`;
  const url =
    Platform.OS === 'ios'
      ? `http://maps.apple.com/?daddr=${destino}&q=${encodeURIComponent(nombre)}`
      : `https://www.google.com/maps/dir/?api=1&destination=${destino}`;
  Linking.openURL(url).catch(() => {});
}

/** Mapa de OpenStreetMap con Leaflet. Gratis y sin clave; el crédito lo muestra Leaflet. */
function htmlMapa({ latitud, longitud }: Coordenadas, nombre: string) {
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>html,body,#m{height:100%;margin:0}</style></head><body><div id="m"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var map=L.map('m').setView([${latitud},${longitud}],16);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a>OpenStreetMap</a>'}).addTo(map);
L.marker([${latitud},${longitud}]).addTo(map).bindPopup(${JSON.stringify(nombre)}).openPopup();
</script></body></html>`;
}

export function MapaComplejo({ complejo, coordenadas }: Props) {
  const { c } = useTema();
  const html = useMemo(() => htmlMapa(coordenadas, complejo), [coordenadas, complejo]);
  return (
    <View style={estilos.contenedor}>
      <Texto peso="seminegrita">Dónde queda</Texto>
      <View style={[estilos.mapa, { borderColor: c.borde }]}>
        <WebView
          source={{ html, baseUrl: 'https://localhost/' }}
          originWhitelist={['*']}
          style={StyleSheet.absoluteFill}
          // El mapa maneja sus propios gestos: que el scroll de la ficha no los robe.
          nestedScrollEnabled
          // Cualquier enlace (por ejemplo el crédito) sale al navegador, no dentro del mapa.
          onShouldStartLoadWithRequest={(req) => req.url.startsWith('about:') || req.url.startsWith('https://localhost') || /unpkg\.com|tile\.openstreetmap\.org/.test(req.url)}
          accessibilityLabel={`Mapa con la ubicación de ${complejo}`}
        />
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
  mapa: { height: 220, borderRadius: RADIO.tarjeta, overflow: 'hidden', borderWidth: 1 },
});
