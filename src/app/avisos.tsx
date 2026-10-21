/** Avisos de la Dirección: turnos suspendidos y turnos liberados en favoritos. */
import { useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Icono } from '@/componentes/Icono';
import { Texto } from '@/componentes/Texto';
import { useAvisos } from '@/contexto/AvisosContexto';
import { useSesion } from '@/contexto/SesionContexto';
import { ESPACIADO, RADIO, useTema } from '@/tema';
import { fechaRelativa, horaDeIso, fechaDeIso } from '@/utilidades/fechas';

export default function Avisos() {
  const { c } = useTema();
  const { usuario } = useSesion();
  const { avisos, recargar, marcarLeidos } = useAvisos();
  const [refrescando, setRefrescando] = useState(false);
  // Los que estaban sin leer al entrar se siguen resaltando mientras la pantalla está abierta.
  const [nuevos] = useState(() => new Set(avisos.filter((a) => !a.leida).map((a) => a.id)));

  useEffect(() => {
    marcarLeidos();
  }, [marcarLeidos]);

  async function refrescar() {
    setRefrescando(true);
    await recargar();
    setRefrescando(false);
  }

  return (
    <FlatList
      style={{ backgroundColor: c.fondo }}
      contentContainerStyle={estilos.lista}
      data={usuario ? avisos : []}
      keyExtractor={(a) => a.id}
      ListEmptyComponent={
        <View style={estilos.vacio}>
          <Icono nombre="notifications-off-outline" color={c.textoSuave} tamano={40} />
          <Texto color={c.textoSuave} centrado>
            {usuario
              ? 'No tenés avisos. Si suspendemos un turno tuyo o se libera uno de tus favoritos, te avisamos acá.'
              : 'Entrá con tu cuenta para recibir avisos.'}
          </Texto>
        </View>
      }
      renderItem={({ item }) => {
        const suspension = item.tipo === 'suspension';
        return (
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/disponibilidad/[id]',
                // El turno suspendido ya no se puede jugar: se abre el espacio en hoy para buscar otro.
                params: suspension ? { id: item.espacioId } : { id: item.espacioId, fecha: item.fecha },
              })
            }
            accessibilityRole="button"
            accessibilityHint="Abre los turnos del espacio"
            style={({ pressed }) => [
              estilos.tarjeta,
              { backgroundColor: c.superficie, borderColor: nuevos.has(item.id) ? c.acento : c.borde },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Icono nombre={suspension ? 'rainy-outline' : 'sparkles-outline'} color={suspension ? c.aviso : c.cesped} tamano={26} />
            <View style={estilos.flex}>
              <Texto peso="seminegrita">{item.titulo}</Texto>
              <Texto variante="etiqueta">{item.mensaje}</Texto>
              <Texto variante="chico" color={c.textoSuave}>
                {fechaRelativa(fechaDeIso(item.creadaEn))}, {horaDeIso(item.creadaEn)}
              </Texto>
            </View>
          </Pressable>
        );
      }}
      refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={c.cesped} colors={[c.cesped]} />}
    />
  );
}

const estilos = StyleSheet.create({
  lista: { padding: ESPACIADO.l, gap: ESPACIADO.m, flexGrow: 1 },
  vacio: { alignItems: 'center', gap: ESPACIADO.m, paddingVertical: ESPACIADO.xxl },
  tarjeta: { flexDirection: 'row', gap: ESPACIADO.m, padding: ESPACIADO.m, borderRadius: RADIO.tarjeta, borderWidth: 1.5 },
  flex: { flex: 1, gap: 2 },
});
