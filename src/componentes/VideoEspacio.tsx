import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { RADIO, useTema } from '@/tema';
import { resolverVideo, type FuenteVideo } from '@/utilidades/videosLocales';
import { Aviso } from './Aviso';

interface Props {
  url: string;
  ancho: number;
}

/** Recorrido corto de la cancha. No se reproduce solo: se gasta datos recién al tocar play. */
export function VideoEspacio({ url, ancho }: Props) {
  const { c } = useTema();
  const fuente = resolverVideo(url);
  return (
    <View style={[estilos.caja, { borderColor: c.borde, backgroundColor: c.tablero }]}>
      {fuente !== null ? (
        <Reproductor fuente={fuente} ancho={ancho - 2} alto={((ancho - 2) * 9) / 16} />
      ) : (
        <Aviso tipo="error" icono="videocam-off-outline" titulo="Video no disponible" />
      )}
    </View>
  );
}

function Reproductor({ fuente, ancho, alto }: { fuente: FuenteVideo; ancho: number; alto: number }) {
  const [falla, setFalla] = useState(false);
  const player = useVideoPlayer(fuente, (p) => {
    p.loop = true;
    p.muted = true;
  });

  useEffect(() => {
    const sub = player.addListener('statusChange', ({ status }) => setFalla(status === 'error'));
    return () => sub.remove();
  }, [player]);

  if (falla) {
    return (
      <Aviso
        tipo="error"
        icono="videocam-off-outline"
        titulo="No se pudo cargar el video"
        detalle="Revisá tu conexión e intentá de nuevo más tarde."
      />
    );
  }
  return (
    <VideoView
      player={player}
      style={{ width: ancho, height: alto }}
      nativeControls
      contentFit="contain"
      fullscreenOptions={{ enable: true }}
      accessibilityLabel="Video recorriendo la cancha"
    />
  );
}

const estilos = StyleSheet.create({
  caja: { borderRadius: RADIO.tarjeta, overflow: 'hidden', borderWidth: 1 },
});
