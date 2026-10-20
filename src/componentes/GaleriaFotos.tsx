import { useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { RADIO, useTema } from '@/tema';
import { MiniCancha } from './MiniCancha';
import { Texto } from './Texto';

interface Props {
  fotos: string[];
  deporteId: string;
  color: string;
  ancho: number;
  alto?: number;
}

/** Fotos deslizables. Si no hay fotos o no cargan, se ve el dibujo de la cancha. */
export function GaleriaFotos({ fotos, deporteId, color, ancho, alto = 220 }: Props) {
  const { c } = useTema();
  const [actual, setActual] = useState(0);
  const [rotas, setRotas] = useState<Record<string, true>>({});

  const dibujo = <MiniCancha deporteId={deporteId} color={color} ancho={ancho} alto={alto} />;

  return (
    <View style={[estilos.caja, { width: ancho, height: alto, borderColor: c.borde }]}>
      {fotos.length === 0 ? (
        dibujo
      ) : (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(ev) => setActual(Math.round(ev.nativeEvent.contentOffset.x / ancho))}
        >
          {fotos.map((uri, i) => (
            <View key={uri} style={{ width: ancho, height: alto }}>
              {dibujo}
              {!rotas[uri] && (
                <Image
                  source={{ uri }}
                  style={StyleSheet.absoluteFill}
                  resizeMode="cover"
                  onError={() => setRotas((r) => ({ ...r, [uri]: true }))}
                  accessibilityLabel={`Foto ${i + 1} de ${fotos.length}`}
                />
              )}
            </View>
          ))}
        </ScrollView>
      )}
      {fotos.length > 1 && (
        <View style={[estilos.contador, { backgroundColor: c.tablero }]}>
          <Texto variante="chico" color={c.tableroLed}>
            {actual + 1} / {fotos.length}
          </Texto>
        </View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: { borderRadius: RADIO.tarjeta, overflow: 'hidden', borderWidth: 1 },
  contador: { position: 'absolute', right: 8, bottom: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIO.tablero },
});
