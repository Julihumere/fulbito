/**
 * Registro de jugador. La API crea siempre cuentas `jugador` y pide
 * nombre, email, contraseña y teléfono (el teléfono es obligatorio).
 */
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { CampoTexto } from '@/componentes/CampoTexto';
import { Texto } from '@/componentes/Texto';
import { useSesion } from '@/contexto/SesionContexto';
import { aErrorApi } from '@/servicios';
import { ESPACIADO, RADIO, useTema } from '@/tema';
import { emailValido } from '@/utilidades/formato';

const TELEFONO_VALIDO = /^\+?[0-9][0-9 ()-]{5,28}$/;

export default function Registro() {
  const { c } = useTema();
  const insets = useSafeAreaInsets();
  const { registrar } = useSesion();

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [repetir, setRepetir] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function crear() {
    setError(null);
    if (!nombre.trim()) return setError('Escribí tu nombre.');
    if (!emailValido(email)) return setError('Escribí un email válido, por ejemplo nombre@mail.com.');
    if (!TELEFONO_VALIDO.test(telefono.trim())) {
      return setError('El teléfono no es válido: usá números, espacios o guiones.');
    }
    if (contrasena.length < 8) return setError('La contraseña tiene que tener al menos 8 caracteres.');
    if (contrasena !== repetir) return setError('Las contraseñas no coinciden.');

    setEnviando(true);
    try {
      await registrar({
        nombre: nombre.trim(),
        email: email.trim(),
        telefono: telefono.trim(),
        contrasena,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/');
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(aErrorApi(e).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[estilos.pantalla, { backgroundColor: c.fondo }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ title: 'Crear cuenta' }} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          estilos.contenido,
          { paddingTop: ESPACIADO.l, paddingBottom: insets.bottom + ESPACIADO.xl },
        ]}
      >
        <View style={estilos.encabezado}>
          <Texto variante="titulo" peso="negrita">
            Creá tu cuenta
          </Texto>
          <Texto color={c.textoSuave}>
            La cuenta es para reservar. Para mirar disponibilidad no hace falta.
          </Texto>
        </View>

        <View style={[estilos.tarjeta, { backgroundColor: c.superficie, borderColor: c.borde }]}>
          <CampoTexto
            etiqueta="Nombre"
            icono="person-outline"
            value={nombre}
            onChangeText={setNombre}
            placeholder="Nombre y apellido"
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            editable={!enviando}
          />
          <CampoTexto
            etiqueta="Email"
            icono="mail-outline"
            value={email}
            onChangeText={setEmail}
            placeholder="nombre@mail.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            editable={!enviando}
          />
          <CampoTexto
            etiqueta="Teléfono"
            icono="call-outline"
            value={telefono}
            onChangeText={setTelefono}
            placeholder="3455-401122"
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            editable={!enviando}
          />
          <CampoTexto
            etiqueta="Contraseña"
            icono="lock-closed-outline"
            value={contrasena}
            onChangeText={setContrasena}
            placeholder="Al menos 8 caracteres"
            esContrasena
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            textContentType="newPassword"
            editable={!enviando}
          />
          <CampoTexto
            etiqueta="Repetir contraseña"
            icono="lock-closed-outline"
            value={repetir}
            onChangeText={setRepetir}
            placeholder="Otra vez"
            esContrasena
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            textContentType="newPassword"
            editable={!enviando}
          />

          {error && <Aviso tipo="error" titulo="No se pudo crear la cuenta" detalle={error} />}

          <Boton titulo="Crear cuenta" icono="person-add-outline" onPress={crear} cargando={enviando} />
          <Boton
            titulo="Ya tengo cuenta"
            variante="secundario"
            compacto
            onPress={() => router.back()}
            deshabilitado={enviando}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1 },
  contenido: { paddingHorizontal: ESPACIADO.l, gap: ESPACIADO.l, flexGrow: 1 },
  encabezado: { gap: ESPACIADO.s },
  tarjeta: { borderRadius: RADIO.tarjeta, borderWidth: 1, padding: ESPACIADO.l, gap: ESPACIADO.m },
});
