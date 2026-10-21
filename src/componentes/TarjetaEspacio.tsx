import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { ESPACIADO, RADIO, useTema } from '@/tema';
import type { Deporte, Espacio } from '@/tipos';
import { formatearPrecio } from '@/utilidades/formato';
import { Icono, nombreIconoSeguro } from './Icono';
import { MiniCancha } from './MiniCancha';
import { Texto } from './Texto';

const ANCHO_FOTO = 104;
const ALTO_FOTO = 112;

// En el listado el gimnasio muestra el dibujo del deporte; sus fotos se ven en la ficha.
const DEPORTES_SIN_FOTO_EN_LISTA = ['dep-multiuso'];

interface Props {
  espacio: Espacio;
  deporte: Deporte | undefined;
  onPress: () => void;
  /** Atajo directo a la grilla: reservar tiene que ser más rápido que un WhatsApp. */
  onTurnos?: () => void;
}

export function TarjetaEspacio({ espacio, deporte, onPress, onTurnos }: Props) {
  const { c } = useTema();
  const [fotoOk, setFotoOk] = useState(true);
  const foto = DEPORTES_SIN_FOTO_EN_LISTA.includes(espacio.deporteId) ? undefined : espacio.imagenes[0];
  const colorDeporte = deporte?.color ?? c.cesped;

  const descripcion = [
    espacio.nombre,
    deporte?.nombre,
    espacio.complejo,
    espacio.iluminacion ? 'con luz' : 'sólo de día',
    espacio.activo ? `${formatearPrecio(espacio.precioPorHora)} la hora` : 'fuera de servicio',
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={descripcion}
      accessibilityHint="Abre la ficha del espacio"
      style={({ pressed }) => [
        estilos.tarjeta,
        { backgroundColor: c.superficie, borderColor: c.borde },
        !espacio.activo && estilos.inactiva,
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={estilos.foto}>
        {/* El dibujo queda siempre abajo: si la foto no carga, se ve la cancha. */}
        <MiniCancha deporteId={espacio.deporteId} color={colorDeporte} ancho={ANCHO_FOTO} alto={ALTO_FOTO} />
        {foto && fotoOk ? (
          <Image source={{ uri: foto }} style={StyleSheet.absoluteFill} onError={() => setFotoOk(false)} resizeMode="cover" />
        ) : null}
      </View>

      <View style={estilos.cuerpo}>
        <Texto peso="seminegrita" numberOfLines={2}>
          {espacio.nombre}
        </Texto>

        <View style={estilos.fila}>
          <Icono nombre={nombreIconoSeguro(deporte?.icono ?? '')} color={colorDeporte} tamano={16} />
          <Texto variante="chico" color={c.textoSuave} numberOfLines={1} style={estilos.flex}>
            {espacio.complejo}
          </Texto>
        </View>

        <View style={estilos.rasgos}>
          <Rasgo icono={espacio.iluminacion ? 'bulb-outline' : 'sunny-outline'} texto={espacio.iluminacion ? 'Con luz' : 'Sólo de día'} />
          {espacio.techado && <Rasgo icono="home-outline" texto="Techado" />}
          <Texto variante="chico" color={c.textoSuave}>
            {espacio.superficie}
          </Texto>
        </View>

        <View style={estilos.pie}>
          {espacio.activo ? (
            <Texto variante="etiqueta" peso="negrita">
              {formatearPrecio(espacio.precioPorHora)}
              <Texto variante="chico" color={c.textoSuave}>
                {' '}/ hora
              </Texto>
            </Texto>
          ) : (
            <Texto variante="etiqueta" peso="seminegrita" color={c.peligro}>
              Fuera de servicio
            </Texto>
          )}
          {onTurnos ? (
            <Pressable
              onPress={onTurnos}
              accessibilityRole="button"
              accessibilityLabel={`Ver turnos de ${espacio.nombre}`}
              hitSlop={8}
              style={({ pressed }) => [estilos.turnos, { backgroundColor: c.acento }, pressed && { opacity: 0.8 }]}
            >
              <Icono nombre="calendar-outline" color={c.textoSobreAcento} tamano={16} />
              <Texto variante="chico" peso="negrita" color={c.textoSobreAcento}>
                Turnos
              </Texto>
            </Pressable>
          ) : (
            <Icono nombre="chevron-forward" color={c.textoSuave} tamano={18} />
          )}
        </View>
      </View>
    </Pressable>
  );
}

function Rasgo({ icono, texto }: { icono: 'bulb-outline' | 'sunny-outline' | 'home-outline'; texto: string }) {
  const { c } = useTema();
  return (
    <View style={estilos.fila}>
      <Icono nombre={icono} color={c.texto} tamano={15} />
      <Texto variante="chico">{texto}</Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    flexDirection: 'row',
    borderRadius: RADIO.tarjeta,
    borderWidth: 1,
    overflow: 'hidden',
  },
  inactiva: { opacity: 0.6 },
  foto: { width: ANCHO_FOTO, minHeight: ALTO_FOTO, overflow: 'hidden' },
  cuerpo: { flex: 1, padding: ESPACIADO.m, gap: ESPACIADO.xs + 2 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: ESPACIADO.xs + 1 },
  flex: { flex: 1 },
  rasgos: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: ESPACIADO.m, rowGap: 2 },
  pie: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' },
  turnos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACIADO.xs,
    paddingHorizontal: ESPACIADO.m,
    minHeight: 36,
    borderRadius: RADIO.pastilla,
  },
});
