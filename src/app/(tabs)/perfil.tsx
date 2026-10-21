import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { Icono } from '@/componentes/Icono';
import { Texto } from '@/componentes/Texto';
import { useSesion } from '@/contexto/SesionContexto';
import { useCatalogo } from '@/hooks/useCatalogo';
import { ESPACIADO, RADIO, useTema } from '@/tema';
import type { Rol } from '@/tipos';
import { iniciales } from '@/utilidades/formato';
import { UMBRAL_MARCADO } from '@/utilidades/reglas';

const NOMBRE_ROL: Record<Rol, string> = { jugador: 'Jugador', encargado: 'Encargado', administrador: 'Administrador' };

export default function Perfil() {
  const { c } = useTema();
  const insets = useSafeAreaInsets();
  const { usuario, cerrarSesion } = useSesion();
  const catalogo = useCatalogo();
  const favoritos = usuario ? catalogo.espacios.filter((e) => usuario.espaciosFavoritos.includes(e.id)) : [];

  async function salir() {
    await cerrarSesion();
    router.push('/login');
  }

  const datos: [string, string][] = usuario
    ? [
        ['Email', usuario.email],
        ['Teléfono', usuario.telefono],
        ['Rol', NOMBRE_ROL[usuario.rol]],
        ['Cancelaciones tardías', String(usuario.cancelacionesTardias)],
        ['Ausencias', String(usuario.ausencias)],
      ]
    : [];

  return (
    <ScrollView
      style={{ backgroundColor: c.fondo }}
      contentContainerStyle={[estilos.pantalla, { paddingTop: insets.top + ESPACIADO.l }]}
    >
      {usuario ? (
        <>
          <View style={estilos.encabezado}>
            <View style={[estilos.avatar, { backgroundColor: c.tablero, borderColor: c.cal }]}>
              <Texto variante="titulo" peso="negrita" color={c.tableroLed}>
                {iniciales(usuario.nombre)}
              </Texto>
            </View>
            <Texto variante="titulo" peso="negrita" centrado>
              {usuario.nombre}
            </Texto>
          </View>

          <View style={[estilos.tabla, { backgroundColor: c.superficie, borderColor: c.borde }]}>
            {datos.map(([k, v], i) => (
              <View key={k} style={[estilos.fila, i > 0 && { borderTopWidth: 1, borderTopColor: c.borde }]}>
                <Texto variante="etiqueta" color={c.textoSuave} style={estilos.clave}>
                  {k}
                </Texto>
                <Texto variante="etiqueta" style={estilos.valor}>
                  {v}
                </Texto>
              </View>
            ))}
          </View>

          {usuario.cancelacionesTardias >= UMBRAL_MARCADO && (
            <Aviso
              tipo="aviso"
              icono="warning-outline"
              titulo="Muchas cancelaciones tardías"
              detalle="Cuando no puedas ir, cancelá con más de 4 horas de anticipación: así otra persona puede usar la cancha."
            />
          )}

          <View style={estilos.favoritos}>
            <Texto peso="seminegrita">Espacios favoritos</Texto>
            {favoritos.length === 0 ? (
              <Texto variante="etiqueta" color={c.textoSuave}>
                Tocá la estrella en un espacio y te avisamos cuando se libere un turno.
              </Texto>
            ) : (
              favoritos.map((e) => (
                <Pressable
                  key={e.id}
                  onPress={() => router.push({ pathname: '/disponibilidad/[id]', params: { id: e.id } })}
                  accessibilityRole="button"
                  style={({ pressed }) => [estilos.favorito, { backgroundColor: c.superficie, borderColor: c.borde }, pressed && { opacity: 0.85 }]}
                >
                  <Icono nombre="star" color={c.acento} tamano={20} />
                  <Texto variante="etiqueta" style={estilos.valor}>
                    {e.nombre}
                  </Texto>
                  <Icono nombre="chevron-forward" color={c.textoSuave} tamano={18} />
                </Pressable>
              ))
            )}
          </View>

          <Boton titulo="Ajustes" variante="secundario" icono="settings-outline" onPress={() => router.push('/ajustes')} />
          <Boton titulo="Cerrar sesión" variante="secundario" icono="log-out-outline" onPress={salir} />
        </>
      ) : (
        <View style={estilos.invitado}>
          <Texto variante="titulo" peso="negrita">
            Perfil
          </Texto>
          <Texto color={c.textoSuave} centrado>
            Entrá con tu cuenta para ver tu perfil.
          </Texto>
          <Boton titulo="Entrar" icono="person-circle-outline" onPress={() => router.push('/login')} />
        </View>
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { padding: ESPACIADO.l, gap: ESPACIADO.l },
  encabezado: { alignItems: 'center', gap: ESPACIADO.m },
  avatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  tabla: { borderRadius: RADIO.tarjeta, borderWidth: 1 },
  fila: { flexDirection: 'row', gap: ESPACIADO.m, paddingHorizontal: ESPACIADO.m, paddingVertical: ESPACIADO.s + 2 },
  clave: { width: 120 },
  valor: { flex: 1 },
  invitado: { alignItems: 'center', gap: ESPACIADO.m, paddingTop: ESPACIADO.xl },
  favoritos: { gap: ESPACIADO.s },
  favorito: { flexDirection: 'row', alignItems: 'center', gap: ESPACIADO.m, padding: ESPACIADO.m, borderRadius: RADIO.control, borderWidth: 1 },
});
