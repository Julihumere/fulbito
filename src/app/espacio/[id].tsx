/**
 * Ficha del espacio: fotos, características, precio, reglas, video y mapa,
 * con el acceso a la grilla de turnos bien a mano.
 * Sin señal se arma con el catálogo guardado y las fotos descargadas.
 */
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { CLAVES, leerDeCache } from '@/almacenamiento/cache';
import { guardarFavoritos, leerFavoritos } from '@/almacenamiento/favoritos';
import { copiarFotoElegida, guardarMedios, uriLocal } from '@/almacenamiento/medios';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { GaleriaFotos } from '@/componentes/GaleriaFotos';
import { Icono } from '@/componentes/Icono';
import { MapaComplejo } from '@/componentes/MapaComplejo';
import { Texto } from '@/componentes/Texto';
import { VideoEspacio } from '@/componentes/VideoEspacio';
import { useSesion } from '@/contexto/SesionContexto';
import { aErrorApi, espacios as servicioEspacios, usuarios as servicioUsuarios, type ErrorApi } from '@/servicios';
import { ESPACIADO, RADIO, TOQUE_MINIMO, useTema } from '@/tema';
import type { Deporte, Espacio } from '@/tipos';
import { formatearPrecio } from '@/utilidades/formato';

export default function FichaEspacio() {
  const { c } = useTema();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { usuario, actualizarUsuario } = useSesion();
  const [espacio, setEspacio] = useState<Espacio | null>(null);
  const [deporte, setDeporte] = useState<Deporte | null>(null);
  const [error, setError] = useState<ErrorApi | null>(null);
  const [desdeCopia, setDesdeCopia] = useState(false);
  const [intento, setIntento] = useState(0);
  const [subiendo, setSubiendo] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'aviso' | 'error'; titulo: string; detalle?: string } | null>(null);
  // Sube cuando termina de bajar archivos al teléfono, para que la ficha pase a usar las copias.
  const [, setCopias] = useState(0);
  const [favoritosInvitado, setFavoritosInvitado] = useState<string[]>([]);

  useEffect(() => {
    let vigente = true;
    if (!usuario) {
      leerFavoritos().then((ids) => { if (vigente) setFavoritosInvitado(ids); });
    }
    return () => { vigente = false; };
  }, [id, usuario]);

  useEffect(() => {
    let cancelado = false;
    Promise.all([servicioEspacios.obtenerEspacio(id), servicioEspacios.listarDeportes()])
      .then(([e, ds]) => {
        if (cancelado) return;
        setEspacio(e);
        setDeporte(ds.find((d) => d.id === e.deporteId) ?? null);
        setDesdeCopia(false);
      })
      .catch(async (e) => {
        // Sin conexión: la ficha sale del catálogo guardado.
        const [es, ds] = await Promise.all([leerDeCache<Espacio[]>(CLAVES.espacios), leerDeCache<Deporte[]>(CLAVES.deportes)]);
        const copia = es?.valor.find((x) => x.id === id);
        if (cancelado) return;
        if (copia) {
          setEspacio(copia);
          setDeporte(ds?.valor.find((d) => d.id === copia.deporteId) ?? null);
          setDesdeCopia(true);
        } else {
          setError(aErrorApi(e));
        }
      });
    return () => {
      cancelado = true;
    };
  }, [id, intento]);

  // Fotos y video se guardan solos al abrir la ficha con señal, para verlos después sin datos.
  useEffect(() => {
    // expo-file-system no existe en web.
    if (!espacio || desdeCopia || Platform.OS === 'web') return;
    let vigente = true;
    guardarMedios(espacio)
      .then((r) => {
        if (vigente && r.guardados > 0) setCopias((n) => n + 1);
      })
      .catch(() => {});
    return () => {
      vigente = false;
    };
  }, [espacio, desdeCopia]);

  if (error) {
    return (
      <View style={estilos.pantalla}>
        <Stack.Screen options={{ title: 'Espacio' }} />
        <Aviso
          tipo="error"
          titulo="No pudimos abrir este espacio"
          detalle={error.message}
          accion={{
            titulo: 'Reintentar',
            onPress: () => {
              setError(null);
              setIntento((n) => n + 1);
            },
          }}
        />
      </View>
    );
  }

  if (!espacio) {
    return (
      <View style={[estilos.pantalla, estilos.centro]}>
        <ActivityIndicator color={c.cesped} size="large" />
      </View>
    );
  }

  const esPersonal = usuario?.rol === 'encargado' || usuario?.rol === 'administrador';
  const esFavorito = usuario
    ? usuario.espaciosFavoritos.includes(espacio.id)
    : favoritosInvitado.includes(espacio.id);
  const ancho = width - ESPACIADO.l * 2;
  const fotos = espacio.imagenes.map((u) => uriLocal(espacio.id, u) ?? u);
  const video = espacio.videoUrl ? (uriLocal(espacio.id, espacio.videoUrl) ?? espacio.videoUrl) : null;

  async function alternarFavorito() {
    if (!espacio) return;
    if (!usuario) {
      const actuales = await leerFavoritos();
      const siguientes = actuales.includes(espacio.id)
        ? actuales.filter((favoritoId) => favoritoId !== espacio.id)
        : [...actuales, espacio.id];
      await guardarFavoritos(siguientes);
      setFavoritosInvitado(siguientes);
      return;
    }
    try {
      await actualizarUsuario(await servicioUsuarios.alternarFavorito(id));
      Haptics.selectionAsync();
    } catch (e) {
      setMensaje({ tipo: 'error', titulo: 'No se pudo guardar el favorito', detalle: aErrorApi(e).message });
    }
  }

  
async function subirFotoEstado() {
  setMensaje(null);

  try {
    const elegida = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: 10,
    });

    if (elegida.canceled || elegida.assets.length === 0) {
      return;
    }

    setSubiendo(true);

    let actualizado = espacio;
    let exitosas = 0;
    let fallidas = 0;

    for (const foto of elegida.assets) {
      try {
        const local =
          Platform.OS === 'web'
            ? foto.uri
            : copiarFotoElegida(foto.uri);

        actualizado = await servicioEspacios.agregarFoto(
          id,
          local,
          actualizado ?? undefined
        );

        setEspacio(actualizado);
        exitosas += 1;
      } catch {
        fallidas += 1;
      }
    }

    if (exitosas > 0) {
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );
    }

    setMensaje({
      tipo: fallidas > 0 ? 'error' : 'aviso',
      titulo:
        fallidas === 0
          ? 'Fotografías agregadas'
          : 'Carga parcialmente completada',
      detalle: `${exitosas} foto(s) agregada(s). ${fallidas} fallida(s).`,
    });
  } catch (e) {
    setMensaje({
      tipo: 'error',
      titulo: 'No se pudieron seleccionar las fotografías',
      detalle: aErrorApi(e).message,
    });
  } finally {
    setSubiendo(false);
  }
}


  const datos: [string, string][] = [
    ['Deporte', deporte?.nombre ?? '—'],
    ['Complejo', espacio.complejo],
    ['Superficie', espacio.superficie],
    ['Luz', espacio.iluminacion ? 'Sí, se juega de noche' : 'No, sólo de día'],
    ['Techado', espacio.techado ? 'Sí' : 'No'],
    ['Capacidad', `${espacio.capacidad} personas`],
    ['Precio', `${formatearPrecio(espacio.precioPorHora)} por hora, se paga en el lugar`],
  ];

  return (
    <ScrollView style={{ backgroundColor: c.fondo }} contentContainerStyle={estilos.pantalla}>
      <Stack.Screen
        options={{
          title: espacio.nombre,
          headerRight: () => (
            <Pressable
              onPress={alternarFavorito}
              accessibilityRole="button"
              accessibilityLabel={esFavorito ? 'Quitar de favoritos' : 'Marcar como favorito'}
              accessibilityHint="Guarda o quita este espacio de tus favoritos"
              hitSlop={10}
              style={estilos.estrella}
            >
              <Icono nombre={esFavorito ? 'heart' : 'heart-outline'} color={c.textoSobreCesped} tamano={26} />
            </Pressable>
          ),
        }}
      />
      {desdeCopia && <Aviso tipo="aviso" titulo="Sin conexión" detalle="Ves la ficha guardada en el teléfono." />}

      <GaleriaFotos fotos={fotos} deporteId={espacio.deporteId} color={deporte?.color ?? c.cesped} ancho={ancho} />

      {espacio.activo ? (
        <Boton
          titulo="Ver turnos libres"
          icono="calendar-outline"
          onPress={() => router.push({ pathname: '/disponibilidad/[id]', params: { id: espacio.id } })}
        />
      ) : (
        <Aviso tipo="error" icono="construct-outline" titulo="Fuera de servicio" detalle="Este espacio no se puede reservar por ahora." />
      )}

      {mensaje && <Aviso tipo={mensaje.tipo} titulo={mensaje.titulo} detalle={mensaje.detalle} icono={mensaje.tipo === 'aviso' ? 'checkmark-circle-outline' : undefined} />}

      <View style={[estilos.tabla, { backgroundColor: c.superficie, borderColor: c.borde }]}>
        {datos.map(([k, v], i) => (
          <View key={k} style={[estilos.fila, i > 0 && { borderTopWidth: 1, borderTopColor: c.borde }]}>
            <Texto variante="etiqueta" color={c.textoSuave} style={estilos.clave}>
              {k}
            </Texto>
            <Texto variante="etiqueta" style={estilos.flex}>
              {v}
            </Texto>
          </View>
        ))}
      </View>

      <View style={estilos.seccion}>
        <Texto peso="seminegrita">Reglas del lugar</Texto>
        <Texto color={c.textoSuave}>{espacio.reglas}</Texto>
      </View>

      <View style={estilos.seccion}>
        <Texto peso="seminegrita">Video de la cancha</Texto>
        {video ? (
          <VideoEspacio url={video} ancho={ancho} />
        ) : (
          <Texto color={c.textoSuave}>Este espacio todavía no tiene video.</Texto>
        )}
      </View>

      {esPersonal && (
        <View style={[estilos.tarjeta, { backgroundColor: c.superficie, borderColor: c.borde }]}>
          <Texto peso="seminegrita">Estado de la cancha</Texto>
          <Texto variante="etiqueta" color={c.textoSuave}>
            Subí una foto de cómo está hoy (el piso, la red, si está anegada). Se muestra primera en la galería.
          </Texto>
          <Boton titulo="Subir foto de la galería" variante="secundario" compacto icono="image-outline" onPress={subirFotoEstado} cargando={subiendo} />
        </View>
      )}

      <MapaComplejo complejo={espacio.complejo} coordenadas={espacio.coordenadas} />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { padding: ESPACIADO.l, gap: ESPACIADO.l },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabla: { borderRadius: RADIO.tarjeta, borderWidth: 1 },
  tarjeta: { borderRadius: RADIO.tarjeta, borderWidth: 1, padding: ESPACIADO.m, gap: ESPACIADO.s },
  fila: { flexDirection: 'row', gap: ESPACIADO.m, paddingHorizontal: ESPACIADO.m, paddingVertical: ESPACIADO.s + 2 },
  clave: { width: 92 },
  flex: { flex: 1 },
  seccion: { gap: ESPACIADO.xs },
  estrella: { minWidth: TOQUE_MINIMO, minHeight: TOQUE_MINIMO, alignItems: 'center', justifyContent: 'center' },
});
