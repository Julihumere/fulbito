import { useState, type ComponentRef, type Ref } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { ESCALA, ESPACIADO, FUENTES, RADIO, TOQUE_MINIMO, useTema } from '@/tema';
import { Icono, type NombreIcono } from './Icono';
import { Texto } from './Texto';

interface Props extends Omit<TextInputProps, 'style'> {
  etiqueta: string;
  icono: NombreIcono;
  error?: string | null;
  /** Agrega el botón de mostrar/ocultar y oculta el texto por defecto. */
  esContrasena?: boolean;
  /** Color de la etiqueta: sobre el césped va blanca. */
  colorEtiqueta?: string;
  ref?: Ref<ComponentRef<typeof TextInput>>;
}

export function CampoTexto({ etiqueta, icono, error, esContrasena, colorEtiqueta, ref, ...resto }: Props) {
  const { c } = useTema();
  const [enfocado, setEnfocado] = useState(false);
  const [visible, setVisible] = useState(false);

  const colorBorde = error ? c.peligro : enfocado ? c.acento : c.borde;

  return (
    <View style={estilos.contenedor}>
      <Texto variante="etiqueta" peso="seminegrita" color={colorEtiqueta ?? c.texto}>
        {etiqueta}
      </Texto>
      <View style={[estilos.caja, { backgroundColor: c.campoFondo, borderColor: colorBorde }]}>
        <Icono nombre={icono} color={c.campoPlaceholder} />
        <TextInput
          {...resto}
          ref={ref}
          accessibilityLabel={etiqueta}
          placeholderTextColor={c.campoPlaceholder}
          selectionColor={c.cesped}
          secureTextEntry={esContrasena && !visible}
          onFocus={(e) => {
            setEnfocado(true);
            resto.onFocus?.(e);
          }}
          onBlur={(e) => {
            setEnfocado(false);
            resto.onBlur?.(e);
          }}
          style={[estilos.input, ESCALA.cuerpo, { color: c.campoTexto, fontFamily: FUENTES.regular }]}
        />
        {esContrasena && (
          <Pressable
            onPress={() => setVisible((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            hitSlop={10}
            style={estilos.ojo}
          >
            <Icono nombre={visible ? 'eye-off-outline' : 'eye-outline'} color={c.campoPlaceholder} tamano={22} />
          </Pressable>
        )}
      </View>
      {error ? (
        <View style={[estilos.error, { backgroundColor: c.fondoPeligro }]} accessibilityLiveRegion="polite">
          <Texto variante="chico" color={c.peligro} peso="seminegrita">
            {error}
          </Texto>
        </View>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { gap: ESPACIADO.xs + 2 },
  caja: {
    minHeight: TOQUE_MINIMO + 4,
    borderRadius: RADIO.control,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: ESPACIADO.m,
    gap: ESPACIADO.s,
  },
  input: { flex: 1, paddingVertical: ESPACIADO.m, paddingRight: ESPACIADO.m },
  ojo: { paddingHorizontal: ESPACIADO.m, alignSelf: 'stretch', justifyContent: 'center' },
  error: { borderRadius: RADIO.tablero, paddingHorizontal: ESPACIADO.s, paddingVertical: ESPACIADO.xs, alignSelf: 'flex-start' },
});
