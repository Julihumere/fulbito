import { StyleSheet, View } from 'react-native';
import { ESPACIADO, RADIO, useTema } from '@/tema';
import { Boton } from './Boton';
import { Icono, type NombreIcono } from './Icono';
import { Texto } from './Texto';

interface Props {
  tipo: 'aviso' | 'error';
  titulo: string;
  detalle?: string;
  icono?: NombreIcono;
  accion?: { titulo: string; onPress: () => void };
}

/** Banda para estados que el usuario tiene que ver: sin conexión, datos viejos, errores. */
export function Aviso({ tipo, titulo, detalle, icono, accion }: Props) {
  const { c } = useTema();
  const fondo = tipo === 'error' ? c.fondoPeligro : c.fondoAviso;
  const color = tipo === 'error' ? c.peligro : c.aviso;
  return (
    <View style={[estilos.caja, { backgroundColor: fondo, borderLeftColor: color }]} accessibilityLiveRegion="polite">
      <View style={estilos.fila}>
        <Icono nombre={icono ?? (tipo === 'error' ? 'alert-circle-outline' : 'cloud-offline-outline')} color={color} tamano={22} />
        <View style={estilos.textos}>
          <Texto peso="negrita" color={color}>
            {titulo}
          </Texto>
          {detalle ? (
            <Texto variante="etiqueta" color={color}>
              {detalle}
            </Texto>
          ) : null}
        </View>
      </View>
      {accion && <Boton titulo={accion.titulo} onPress={accion.onPress} variante="secundario" compacto icono="refresh-outline" />}
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: { borderRadius: RADIO.control, borderLeftWidth: 5, padding: ESPACIADO.m, gap: ESPACIADO.m },
  fila: { flexDirection: 'row', gap: ESPACIADO.s, alignItems: 'flex-start' },
  textos: { flex: 1, gap: 2 },
});
