/**
 * Dibujo de la cancha según el deporte. Se usa como miniatura cuando el
 * espacio no tiene foto o la foto no carga (sin señal, URL rota).
 */
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

const CAL = 'rgba(255,255,255,0.85)';
const G = 1.5;

interface Props {
  deporteId: string;
  color: string;
  ancho: number;
  alto: number;
}

export function MiniCancha({ deporteId, color, ancho, alto }: Props) {
  const m = Math.round(Math.min(ancho, alto) * 0.09); // margen hasta la línea de fondo
  const w = ancho - m * 2;
  const h = alto - m * 2;
  const circulo = Math.round(h * 0.38);

  const linea = (s: object) => <View style={[estilos.abs, s]} />;
  const mitad = linea({ left: w / 2 - G / 2, top: 0, width: G, height: h, backgroundColor: CAL });
  const centro = (
    <View
      style={[
        estilos.abs,
        { left: w / 2 - circulo / 2, top: h / 2 - circulo / 2, width: circulo, height: circulo, borderRadius: circulo, borderWidth: G, borderColor: CAL },
      ]}
    />
  );
  const area = (lado: 'izq' | 'der', anchoArea: number, altoArea: number) =>
    linea({
      [lado === 'izq' ? 'left' : 'right']: -G,
      top: h / 2 - altoArea / 2,
      width: anchoArea,
      height: altoArea,
      borderWidth: G,
      borderColor: CAL,
    });

  let dibujo: ReactNode;
  if (deporteId.startsWith('dep-futbol')) {
    dibujo = (
      <>
        {mitad}
        {centro}
        {area('izq', w * 0.16, h * 0.56)}
        {area('der', w * 0.16, h * 0.56)}
      </>
    );
  } else if (deporteId === 'dep-tenis') {
    dibujo = (
      <>
        {linea({ left: w / 2 - 1.5, top: -m / 2, width: 3, height: h + m, backgroundColor: CAL })}
        {linea({ left: 0, right: 0, top: h * 0.12, height: G, backgroundColor: CAL })}
        {linea({ left: 0, right: 0, bottom: h * 0.12, height: G, backgroundColor: CAL })}
        {linea({ left: w * 0.24, top: h * 0.12, width: G, height: h * 0.76, backgroundColor: CAL })}
        {linea({ right: w * 0.24, top: h * 0.12, width: G, height: h * 0.76, backgroundColor: CAL })}
        {linea({ left: w * 0.24, right: w * 0.24, top: h / 2, height: G, backgroundColor: CAL })}
      </>
    );
  } else if (deporteId === 'dep-basquet') {
    dibujo = (
      <>
        {mitad}
        {centro}
        {area('izq', w * 0.2, h * 0.34)}
        {area('der', w * 0.2, h * 0.34)}
      </>
    );
  } else if (deporteId === 'dep-voley') {
    dibujo = (
      <>
        {linea({ left: w / 2 - 1.5, top: -m / 2, width: 3, height: h + m, backgroundColor: CAL })}
        {linea({ left: w * 0.33, top: 0, width: G, height: h, backgroundColor: CAL })}
        {linea({ right: w * 0.33, top: 0, width: G, height: h, backgroundColor: CAL })}
      </>
    );
  } else {
    // Gimnasio: varias canchas superpuestas, como un piso de parquet marcado.
    dibujo = (
      <>
        {mitad}
        {centro}
        {linea({ left: w * 0.1, right: w * 0.1, top: h * 0.14, bottom: h * 0.14, borderWidth: G, borderColor: 'rgba(255,255,255,0.45)' })}
      </>
    );
  }

  return (
    <View style={{ width: ancho, height: alto, backgroundColor: color, padding: m }}>
      <View style={{ flex: 1, borderWidth: G, borderColor: CAL }}>{dibujo}</View>
    </View>
  );
}

const estilos = StyleSheet.create({ abs: { position: 'absolute' } });
