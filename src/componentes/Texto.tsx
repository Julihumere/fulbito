import { StyleSheet, Text, type TextProps } from 'react-native';
import { ESCALA, FUENTES, useTema, type PesoTexto, type VarianteTexto } from '@/tema';

interface Props extends TextProps {
  variante?: VarianteTexto;
  peso?: PesoTexto;
  color?: string;
  centrado?: boolean;
}

/** Todo texto de la app pasa por acá, así siempre sale en Cascadia Code. */
export function Texto({ variante = 'cuerpo', peso = 'regular', color, centrado, style, ...resto }: Props) {
  const { c } = useTema();
  return (
    <Text
      {...resto}
      maxFontSizeMultiplier={1.6}
      style={[
        ESCALA[variante],
        { fontFamily: FUENTES[peso], color: color ?? c.texto },
        centrado && estilos.centrado,
        style,
      ]}
    />
  );
}

const estilos = StyleSheet.create({ centrado: { textAlign: 'center' } });
