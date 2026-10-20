/**
 * Ingreso. La pantalla es media cancha vista desde arriba: el nombre de la
 * app en el círculo central y el formulario dentro del área grande.
 *
 * La cuenta sólo hace falta para reservar (lo pide el documento), por eso
 * siempre está a mano "Mirar sin cuenta".
 */
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import {
  Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Boton } from '@/componentes/Boton';
import { CampoTexto } from '@/componentes/CampoTexto';
import { CespedFranjas, CirculoCal, GROSOR_CAL, Medialuna } from '@/componentes/Cancha';
import { Texto } from '@/componentes/Texto';
import { useSesion } from '@/contexto/SesionContexto';
import { aErrorApi, USAR_MOCKS } from '@/servicios';
import { ESPACIADO, FUENTES, RADIO, useTema } from '@/tema';
import { emailValido } from '@/utilidades/formato';

const RADIO_CIRCULO = 124;

/** Atajos para probar con los usuarios inventados. No aparecen con la API real. */
const USUARIOS_DE_PRUEBA = [
  { rol: 'Jugador', email: 'emiliano@mail.com', contrasena: 'fulbito123' },
  { rol: 'Encargado', email: 'marcelo@villaguay.gob.ar', contrasena: 'encargado123' },
  { rol: 'Administrador', email: 'nahuel@villaguay.gob.ar', contrasena: 'admin123' },
];

interface Errores {
  email?: string;
  contrasena?: string;
  general?: string;
}

export default function PantallaIngreso() {
  const { c } = useTema();
  const insets = useSafeAreaInsets();
  const { iniciarSesion, marcarBienvenidaVista } = useSesion();

  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [errores, setErrores] = useState<Errores>({});
  const [enviando, setEnviando] = useState(false);
  const refContrasena = useRef<ComponentRef<typeof TextInput>>(null);

  useEffect(() => {
    marcarBienvenidaVista();
  }, [marcarBienvenidaVista]);

  const volver = () => (router.canGoBack() ? router.back() : router.replace('/'));

  async function entrar() {
    Keyboard.dismiss();
    const nuevos: Errores = {};
    if (!emailValido(email)) nuevos.email = 'Escribí un email válido, por ejemplo nombre@mail.com.';
    if (!contrasena) nuevos.contrasena = 'Escribí tu contraseña.';
    setErrores(nuevos);
    if (nuevos.email || nuevos.contrasena) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setEnviando(true);
    try {
      await iniciarSesion({ email: email.trim(), contrasena });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      volver();
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrores({ general: aErrorApi(e).message });
      setEnviando(false);
    }
  }

  function usarDePrueba(u: (typeof USUARIOS_DE_PRUEBA)[number]) {
    setEmail(u.email);
    setContrasena(u.contrasena);
    setErrores({});
  }

  return (
    <View style={[estilos.pantalla, { backgroundColor: c.cesped }]}>
      <CespedFranjas franjas={14} />
      <KeyboardAvoidingView style={estilos.flex} behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[estilos.scroll, { paddingTop: insets.top + ESPACIADO.s, paddingBottom: insets.bottom + ESPACIADO.l }]}
        >
          <View style={estilos.barra}>
            <Boton titulo="Mirar sin cuenta" variante="calSobreCesped" compacto icono="eye-outline" onPress={volver} />
          </View>

          {/* Media cancha: bandas laterales y línea de fondo; arriba sigue fuera de pantalla. */}
          <View style={[estilos.campo, { borderColor: c.cal }]}>
            <View style={estilos.zonaCentral}>
              <View style={[estilos.lineaMitad, { backgroundColor: c.cal }]} />
              <CirculoCal diametro={RADIO_CIRCULO * 2} style={estilos.circuloCentral} />
              <View style={estilos.titulo}>
                <Texto
                  variante="marcador"
                  peso="negrita"
                  color={c.textoSobreCesped}
                  style={estilos.textoTitulo}
                  accessibilityRole="header"
                >
                  Fulbito!
                </Texto>
              </View>
              <CirculoCal diametro={10} relleno style={estilos.puntoCentral} />
              <View style={estilos.bajada}>
                <Texto variante="chico" color={c.textoSobreCespedSuave} centrado>
                  Canchas municipales{'\n'}de Villaguay
                </Texto>
              </View>
            </View>

            <View style={estilos.respiro} />

            <Medialuna diametro={150} alto={30} />
            <View style={[estilos.area, { borderColor: c.cal }]}>
              <View style={estilos.encabezado}>
                <Texto variante="subtitulo" peso="negrita" color={c.textoSobreCesped}>
                  Entrá a tu cuenta
                </Texto>
                <Texto variante="etiqueta" color={c.textoSobreCespedSuave}>
                  La necesitás para reservar. Para mirar qué hay libre, no.
                </Texto>
              </View>

              <CampoTexto
                etiqueta="Email"
                icono="mail-outline"
                colorEtiqueta={c.textoSobreCesped}
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (errores.email || errores.general) setErrores((e) => ({ ...e, email: undefined, general: undefined }));
                }}
                placeholder="nombre@mail.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => refContrasena.current?.focus()}
                error={errores.email}
                editable={!enviando}
              />

              <CampoTexto
                ref={refContrasena}
                etiqueta="Contraseña"
                icono="lock-closed-outline"
                colorEtiqueta={c.textoSobreCesped}
                esContrasena
                value={contrasena}
                onChangeText={(t) => {
                  setContrasena(t);
                  if (errores.contrasena || errores.general) setErrores((e) => ({ ...e, contrasena: undefined, general: undefined }));
                }}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={entrar}
                error={errores.contrasena}
                editable={!enviando}
              />

              {errores.general ? <TarjetaRoja mensaje={errores.general} /> : null}

              <Boton titulo="Entrar" icono="log-in-outline" onPress={entrar} cargando={enviando} />
            </View>
          </View>

          {/* El arco, del otro lado de la línea de fondo. */}
          <View style={[estilos.arco, { borderColor: c.cal, backgroundColor: c.calTenue }]} />

          {USAR_MOCKS && (
            <View style={[estilos.pizarra, { backgroundColor: c.tablero }]}>
              <Texto variante="chico" color={c.tableroLed} style={{ fontFamily: FUENTES.seminegrita }}>
                Usuarios de prueba (datos inventados)
              </Texto>
              <View style={estilos.filaPrueba}>
                {USUARIOS_DE_PRUEBA.map((u) => (
                  <Pressable
                    key={u.rol}
                    onPress={() => usarDePrueba(u)}
                    accessibilityRole="button"
                    accessibilityLabel={`Completar con el usuario de prueba ${u.rol}`}
                    style={({ pressed }) => [estilos.botonPrueba, { borderColor: c.tableroLed }, pressed && { opacity: 0.7 }]}
                  >
                    <Texto variante="chico" color={c.textoSobreCesped}>
                      {u.rol}
                    </Texto>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/** Los errores de ingreso se muestran con una tarjeta roja, como corresponde. */
function TarjetaRoja({ mensaje }: { mensaje: string }) {
  const { c } = useTema();
  return (
    <View style={[estilos.tarjetaRoja, { backgroundColor: c.fondoPeligro }]} accessibilityRole="alert" accessibilityLiveRegion="assertive">
      <View style={estilos.cartulina} />
      <Texto variante="etiqueta" peso="seminegrita" color={c.peligro} style={estilos.flex}>
        {mensaje}
      </Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: ESPACIADO.m },
  barra: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: ESPACIADO.s },
  campo: {
    flexGrow: 1,
    borderLeftWidth: GROSOR_CAL,
    borderRightWidth: GROSOR_CAL,
    borderBottomWidth: GROSOR_CAL,
  },
  zonaCentral: { height: RADIO_CIRCULO * 2, marginTop: ESPACIADO.m, justifyContent: 'center', alignItems: 'center' },
  lineaMitad: { position: 'absolute', left: 0, right: 0, top: RADIO_CIRCULO - GROSOR_CAL / 2, height: GROSOR_CAL },
  circuloCentral: { position: 'absolute', top: 0 },
  titulo: { position: 'absolute', left: 0, right: 0, bottom: RADIO_CIRCULO + 10, alignItems: 'center' },
  textoTitulo: { textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 2 } },
  puntoCentral: { position: 'absolute', top: RADIO_CIRCULO - 5 },
  bajada: { position: 'absolute', left: 0, right: 0, top: RADIO_CIRCULO + 16, alignItems: 'center' },
  respiro: { flexGrow: 1, minHeight: ESPACIADO.xl },
  area: {
    marginHorizontal: ESPACIADO.l,
    borderLeftWidth: GROSOR_CAL,
    borderRightWidth: GROSOR_CAL,
    borderTopWidth: GROSOR_CAL,
    padding: ESPACIADO.l,
    paddingBottom: ESPACIADO.xl,
    gap: ESPACIADO.l,
  },
  encabezado: { gap: ESPACIADO.xs },
  arco: {
    alignSelf: 'center',
    width: '38%',
    height: 18,
    borderWidth: GROSOR_CAL,
    borderTopWidth: 0,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  pizarra: {
    marginTop: ESPACIADO.l,
    borderRadius: RADIO.tablero,
    padding: ESPACIADO.m,
    gap: ESPACIADO.s,
  },
  filaPrueba: { flexDirection: 'row', flexWrap: 'wrap', gap: ESPACIADO.s },
  botonPrueba: { borderWidth: 1, borderRadius: RADIO.tablero, paddingHorizontal: ESPACIADO.m, paddingVertical: ESPACIADO.s, minHeight: 40, justifyContent: 'center' },
  tarjetaRoja: { flexDirection: 'row', alignItems: 'center', gap: ESPACIADO.m, padding: ESPACIADO.m, borderRadius: RADIO.control },
  cartulina: { width: 14, height: 20, borderRadius: 2, backgroundColor: '#E53935', transform: [{ rotate: '-10deg' }] },
});
