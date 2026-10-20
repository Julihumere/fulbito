/**
 * Ficha del espacio: fotos, características, precio, reglas, video y mapa.
 * La grilla de turnos es la próxima entrega.
 */
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Aviso } from '@/componentes/Aviso';
import { GaleriaFotos } from '@/componentes/GaleriaFotos';
import { MapaComplejo } from '@/componentes/MapaComplejo';
import { Texto } from '@/componentes/Texto';
import { VideoEspacio } from '@/componentes/VideoEspacio';
import { aErrorApi, espacios as servicioEspacios, type ErrorApi } from '@/servicios';
import { ESPACIADO, RADIO, useTema } from '@/tema';
import type { Deporte, Espacio } from '@/tipos';
import { formatearPrecio } from '@/utilidades/formato';

export default function FichaEspacio() {
  const { c } = useTema();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [espacio, setEspacio] = useState<Espacio | null>(null);
  const [deporte, setDeporte] = useState<Deporte | null>(null);
  const [error, setError] = useState<ErrorApi | null>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let cancelado = false;
    Promise.all([servicioEspacios.obtenerEspacio(id), servicioEspacios.listarDeportes()])
      .then(([e, ds]) => {
        if (cancelado) return;
        setEspacio(e);
        setDeporte(ds.find((d) => d.id === e.deporteId) ?? null);
      })
      .catch((e) => !cancelado && setError(aErrorApi(e)));
    return () => {
      cancelado = true;
    };
  }, [id, intento]);

  if (error) {
    return (
      <View style={estilos.pantalla}>
        <Stack.Screen options={{ title: 'Espacio' }} />
        <Aviso tipo="error" titulo="No pudimos abrir este espacio" detalle={error.message} accion={{
            titulo: 'Reintentar',
            onPress: () => {
              setError(null);
              setIntento((n) => n + 1);
            },
          }} />
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
      <Stack.Screen options={{ title: espacio.nombre }} />
      <GaleriaFotos
        fotos={espacio.imagenes}
        deporteId={espacio.deporteId}
        color={deporte?.color ?? c.cesped}
        ancho={width - ESPACIADO.l * 2}
      />

      <Aviso
        tipo="aviso"
        icono="construct-outline"
        titulo="Grilla de turnos en construcción"
        detalle="Es lo próximo que se arma: los turnos de 8 a 24, las fijas y los bloqueos de este espacio."
      />

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

      <View style={estilos.reglas}>
        <Texto peso="seminegrita">Reglas del lugar</Texto>
        <Texto color={c.textoSuave}>{espacio.reglas}</Texto>
      </View>

      <View style={estilos.reglas}>
        <Texto peso="seminegrita">Video de la cancha</Texto>
        {espacio.videoUrl ? (
          <VideoEspacio url={espacio.videoUrl} ancho={width - ESPACIADO.l * 2} />
        ) : (
          <Texto color={c.textoSuave}>Este espacio todavía no tiene video.</Texto>
        )}
      </View>

      <MapaComplejo complejo={espacio.complejo} coordenadas={espacio.coordenadas} />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { padding: ESPACIADO.l, gap: ESPACIADO.l },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabla: { borderRadius: RADIO.tarjeta, borderWidth: 1 },
  fila: { flexDirection: 'row', gap: ESPACIADO.m, paddingHorizontal: ESPACIADO.m, paddingVertical: ESPACIADO.s + 2 },
  clave: { width: 92 },
  flex: { flex: 1 },
  reglas: { gap: ESPACIADO.xs },
});
