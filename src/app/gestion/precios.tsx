/** Cambiar el precio por hora de cada espacio. La app sólo lo muestra: se cobra en el lugar. */
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { Texto } from '@/componentes/Texto';
import { useCatalogo } from '@/hooks/useCatalogo';
import { aErrorApi, espacios as servicioEspacios } from '@/servicios';
import { ESCALA, ESPACIADO, FUENTES, RADIO, TOQUE_MINIMO, useTema } from '@/tema';
import type { Espacio } from '@/tipos';
import { formatearPrecio } from '@/utilidades/formato';

export default function Precios() {
  const { c } = useTema();
  const catalogo = useCatalogo();
  const [mensaje, setMensaje] = useState<{ tipo: 'aviso' | 'error'; titulo: string; detalle?: string } | null>(null);

  return (
    <ScrollView style={{ backgroundColor: c.fondo }} contentContainerStyle={estilos.pantalla} keyboardShouldPersistTaps="handled">
      <Texto variante="etiqueta" color={c.textoSuave}>
        El precio nuevo se muestra en la grilla desde que se guarda. Las reservas ya hechas mantienen el suyo hasta que se defina otra cosa (pregunta 16).
      </Texto>
      {mensaje && <Aviso tipo={mensaje.tipo} titulo={mensaje.titulo} detalle={mensaje.detalle} icono={mensaje.tipo === 'aviso' ? 'checkmark-circle-outline' : undefined} />}
      {catalogo.espacios.map((e) => (
        <FilaPrecio
          key={e.id}
          espacio={e}
          onGuardado={async (nuevo) => {
            setMensaje({ tipo: 'aviso', titulo: `${nuevo.nombre}: ${formatearPrecio(nuevo.precioPorHora)} por hora` });
            await catalogo.recargar();
          }}
          onError={(detalle) => setMensaje({ tipo: 'error', titulo: 'No se pudo guardar', detalle })}
        />
      ))}
    </ScrollView>
  );
}

function FilaPrecio({
  espacio, onGuardado, onError,
}: { espacio: Espacio; onGuardado: (e: Espacio) => void; onError: (m: string) => void }) {
  const { c } = useTema();
  const [texto, setTexto] = useState(String(espacio.precioPorHora));
  const [guardando, setGuardando] = useState(false);
  const valor = Number(texto.replace(/\D/g, ''));
  const cambio = valor > 0 && valor !== espacio.precioPorHora;

  async function guardar() {
    setGuardando(true);
    try {
      const nuevo = await servicioEspacios.cambiarPrecio(espacio.id, valor);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onGuardado(nuevo);
    } catch (e) {
      onError(aErrorApi(e).message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <View style={[estilos.fila, { backgroundColor: c.superficie, borderColor: c.borde }]}>
      <View style={estilos.flex}>
        <Texto peso="seminegrita" numberOfLines={1}>
          {espacio.nombre}
        </Texto>
        <Texto variante="chico" color={c.textoSuave}>
          Ahora: {formatearPrecio(espacio.precioPorHora)}
        </Texto>
      </View>
      <View style={[estilos.campo, { borderColor: cambio ? c.acento : c.borde, backgroundColor: c.campoFondo }]}>
        <Texto color={c.campoPlaceholder}>$</Texto>
        <TextInput
          value={texto}
          onChangeText={(t) => setTexto(t.replace(/\D/g, ''))}
          keyboardType="number-pad"
          accessibilityLabel={`Precio por hora de ${espacio.nombre}`}
          style={[estilos.input, ESCALA.cuerpo, { color: c.campoTexto, fontFamily: FUENTES.seminegrita }]}
          selectionColor={c.cesped}
        />
      </View>
      <Boton titulo="Guardar" compacto variante={cambio ? 'primario' : 'secundario'} deshabilitado={!cambio} cargando={guardando} onPress={guardar} />
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { padding: ESPACIADO.l, gap: ESPACIADO.m, paddingBottom: ESPACIADO.xxl },
  fila: { flexDirection: 'row', alignItems: 'center', gap: ESPACIADO.s, padding: ESPACIADO.m, borderRadius: RADIO.tarjeta, borderWidth: 1 },
  flex: { flex: 1 },
  campo: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderRadius: RADIO.control, paddingLeft: ESPACIADO.s, minHeight: TOQUE_MINIMO, width: 108 },
  input: { flex: 1, paddingHorizontal: ESPACIADO.xs },
});
