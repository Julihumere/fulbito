import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { ESPACIADO, RADIO, TOQUE_MINIMO, useTema } from '@/tema';
import { Icono, type NombreIcono } from './Icono';
import { Texto } from './Texto';

type Variante = 'primario' | 'calSobreCesped' | 'secundario' | 'texto';

interface Props {
  titulo: string;
  onPress: () => void;
  variante?: Variante;
  icono?: NombreIcono;
  cargando?: boolean;
  deshabilitado?: boolean;
  compacto?: boolean;
  accessibilityHint?: string;
}

export function Boton({
  titulo, onPress, variante = 'primario', icono, cargando, deshabilitado, compacto, accessibilityHint,
}: Props) {
  const { c } = useTema();
  const inactivo = deshabilitado || cargando;

  const colores: Record<Variante, { fondo: string; texto: string; borde: string }> = {
    primario: { fondo: c.acento, texto: c.textoSobreAcento, borde: c.acento },
    calSobreCesped: { fondo: 'transparent', texto: c.textoSobreCesped, borde: c.cal },
    secundario: { fondo: 'transparent', texto: c.texto, borde: c.borde },
    texto: { fondo: 'transparent', texto: c.texto, borde: 'transparent' },
  };
  const col = colores[variante];

  return (
    <Pressable
      onPress={onPress}
      disabled={inactivo}
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactivo, busy: !!cargando }}
      hitSlop={compacto ? 6 : 0}
      style={({ pressed }) => [
        estilos.base,
        compacto && estilos.compacto,
        { backgroundColor: col.fondo, borderColor: col.borde },
        pressed && estilos.presionado,
        inactivo && !cargando && estilos.inactivo,
      ]}
    >
      <View style={estilos.contenido}>
        {cargando ? (
          <ActivityIndicator color={col.texto} />
        ) : (
          <>
            {icono && <Icono nombre={icono} color={col.texto} tamano={compacto ? 18 : 20} />}
            <Texto peso="negrita" variante={compacto ? 'etiqueta' : 'cuerpo'} color={col.texto}>
              {titulo}
            </Texto>
          </>
        )}
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: {
    minHeight: TOQUE_MINIMO + 4,
    borderRadius: RADIO.control,
    borderWidth: 2,
    paddingHorizontal: ESPACIADO.xl,
    paddingVertical: ESPACIADO.s,
    justifyContent: 'center',
  },
  compacto: { minHeight: 44, paddingHorizontal: ESPACIADO.l, paddingVertical: ESPACIADO.xs },
  contenido: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: ESPACIADO.s },
  presionado: { transform: [{ scale: 0.98 }], opacity: 0.85 },
  inactivo: { opacity: 0.45 },
});
