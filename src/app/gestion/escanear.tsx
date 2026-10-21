/**
 * Escaneo del QR en la puerta (documento, sección 4).
 *
 * - El encargado vuelve a identificarse con la huella antes de escanear.
 * - Se elige qué espacio se está controlando: así la app puede decir
 *   "este código es de otra cancha" (pregunta 13).
 * - Vibración distinta para un ingreso válido y uno inválido.
 * - Sin señal valida contra la agenda guardada y registra el ingreso después.
 * - Sacudir el teléfono (o tocar el botón) prepara el escaneo siguiente.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as LocalAuthentication from 'expo-local-authentication';
import { Accelerometer } from 'expo-sensors';
import { CLAVES, guardarEnCache, leerDeCache } from '@/almacenamiento/cache';
import { agregarPendiente, enviarPendientes } from '@/almacenamiento/ingresosPendientes';
import { Aviso } from '@/componentes/Aviso';
import { Boton } from '@/componentes/Boton';
import { CampoTexto } from '@/componentes/CampoTexto';
import { Chip } from '@/componentes/Chip';
import { Icono } from '@/componentes/Icono';
import { Texto } from '@/componentes/Texto';
import { leerAgendaGuardada, traerAgenda } from '@/hooks/useAgenda';
import { useCatalogo } from '@/hooks/useCatalogo';
import { aErrorApi, gestion } from '@/servicios';
import { ESPACIADO, RADIO, useTema } from '@/tema';
import { ahoraIso, fechaCorta, hoy, rangoHorario } from '@/utilidades/fechas';

type Verificacion = 'verificando' | 'ok' | 'fallo';

interface Resultado {
  tipo: 'valido' | 'invalido' | 'pendiente';
  titulo: string;
  detalle: string;
}

/** Aceleración (en g) a partir de la cual se considera una sacudida. */
const UMBRAL_SACUDIDA = 2.2;

const esSinConexion = (e: unknown) => aErrorApi(e).codigo === 'SIN_CONEXION';

/** El encargado vuelve a identificarse con huella (o el bloqueo del teléfono) antes de escanear. */
async function autenticar(): Promise<{ verificacion: Verificacion; sinBiometria: boolean }> {
  try {
    const [hardware, registrada] = await Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync()]);
    // Sin huella cargada en el teléfono no hay con qué verificar: se sigue y se avisa.
    if (!hardware || !registrada) return { verificacion: 'ok', sinBiometria: true };
    const r = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Confirmá que sos vos para escanear ingresos',
      cancelLabel: 'Cancelar',
    });
    return { verificacion: r.success ? 'ok' : 'fallo', sinBiometria: false };
  } catch {
    return { verificacion: 'fallo', sinBiometria: false };
  }
}

/** Dos golpes cortos para el válido; uno largo y otro fuerte para el inválido. Se distinguen sin mirar. */
function vibrar(tipo: Resultado['tipo']) {
  if (tipo === 'valido') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } else {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 250);
  }
}

export default function Escanear() {
  const { c } = useTema();
  const catalogo = useCatalogo();
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [verificacion, setVerificacion] = useState<Verificacion>('verificando');
  const [sinBiometria, setSinBiometria] = useState(false);
  const [espacioId, setEspacioId] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [manual, setManual] = useState('');
  const [enviados, setEnviados] = useState(0);
  // La cámara dispara varias lecturas por segundo del mismo código: se procesa la primera.
  const ocupado = useRef(false);

  const aplicarVerificacion = useCallback((r: { verificacion: Verificacion; sinBiometria: boolean }) => {
    setVerificacion(r.verificacion);
    setSinBiometria(r.sinBiometria);
  }, []);

  async function verificarDeNuevo() {
    setVerificacion('verificando');
    aplicarVerificacion(await autenticar());
  }

  useEffect(() => {
    autenticar().then(aplicarVerificacion);
    leerDeCache<string>(CLAVES.espacioEscaneo).then((x) => x && setEspacioId(x.valor));
    // Al entrar se baja la agenda de hoy (para validar sin señal) y se mandan los pendientes.
    traerAgenda(hoy()).catch(() => {});
    enviarPendientes(async (p) => {
      await gestion.validarIngreso(p.codigoQr, p.espacioId);
    }, esSinConexion).then(setEnviados);
  }, [aplicarVerificacion]);

  const siguiente = useCallback(() => {
    setResultado(null);
    setManual('');
    ocupado.current = false;
  }, []);

  // Sacudir el teléfono = escanear el siguiente, con las manos ocupadas en la puerta.
  useEffect(() => {
    if (!resultado) return;
    let sub: { remove: () => void } | null = null;
    Accelerometer.isAvailableAsync().then((hay) => {
      if (!hay) return;
      Accelerometer.setUpdateInterval(120);
      sub = Accelerometer.addListener(({ x, y, z }) => {
        if (Math.sqrt(x * x + y * y + z * z) > UMBRAL_SACUDIDA) siguiente();
      });
    });
    return () => sub?.remove();
  }, [resultado, siguiente]);

  function elegirEspacio(id: string) {
    setEspacioId(id);
    siguiente();
    guardarEnCache(CLAVES.espacioEscaneo, id);
  }

  async function validarSinSenal(codigo: string, espacio: string): Promise<Resultado> {
    const agenda = await leerAgendaGuardada();
    const entrada = agenda?.entradas.find((x) => x.reserva?.codigoQr === codigo);
    if (!agenda) {
      return { tipo: 'invalido', titulo: 'Sin señal y sin agenda', detalle: 'No hay agenda de hoy guardada. Anotá el código y validalo cuando vuelva la señal.' };
    }
    if (!entrada?.reserva) return { tipo: 'invalido', titulo: 'Código no válido', detalle: 'No está en la agenda de hoy.' };
    if (entrada.turno.espacioId !== espacio) {
      const otro = catalogo.espacios.find((e) => e.id === entrada.turno.espacioId)?.nombre ?? 'otro espacio';
      return { tipo: 'invalido', titulo: 'Es de otra cancha', detalle: `Este código es de ${otro}.` };
    }
    if (entrada.reserva.estado !== 'confirmada') {
      return { tipo: 'invalido', titulo: 'Ya no está activa', detalle: 'La reserva figura como usada, cancelada o ausente.' };
    }
    await agregarPendiente({ codigoQr: codigo, espacioId: espacio, escaneadoEn: ahoraIso() });
    return {
      tipo: 'pendiente',
      titulo: `Pueden pasar: ${entrada.titular?.nombre ?? 'reserva'}`,
      detalle: `${rangoHorario(entrada.turno.inicio, entrada.turno.fin)}. Sin señal: el ingreso se registra cuando vuelva la conexión.`,
    };
  }

  async function procesar(codigo: string) {
    if (!espacioId || ocupado.current) return;
    ocupado.current = true;
    setProcesando(true);
    let r: Resultado;
    try {
      const ingreso = await gestion.validarIngreso(codigo, espacioId);
      r = {
        tipo: 'valido',
        titulo: `Pueden pasar: ${ingreso.titular.nombre}`,
        detalle: `${fechaCorta(ingreso.turno.fecha)} ${rangoHorario(ingreso.turno.inicio, ingreso.turno.fin)} · ${ingreso.reserva.cantidadPersonas} personas. Llegada registrada.`,
      };
    } catch (e) {
      const err = aErrorApi(e);
      if (err.codigo === 'SIN_CONEXION') {
        r = await validarSinSenal(codigo.trim().toUpperCase(), espacioId);
      } else {
        const titulos: Record<string, string> = {
          QR_OTRO_DIA: 'No es de hoy',
          QR_OTRA_CANCHA: 'Es de otra cancha',
          QR_YA_USADO: 'Código ya usado',
          QR_CANCELADO: 'Reserva no activa',
          QR_INVALIDO: 'Código no válido',
        };
        r = { tipo: 'invalido', titulo: titulos[err.codigo] ?? 'No se pudo validar', detalle: err.message };
      }
    }
    vibrar(r.tipo);
    setResultado(r);
    setProcesando(false);
  }

  const onEscaneo = ({ data }: BarcodeScanningResult) => {
    procesar(data);
  };

  // ---------------------------------------------------------------- Estados previos

  if (verificacion !== 'ok') {
    return (
      <View style={[estilos.centro, { backgroundColor: c.fondo }]}>
        <Icono nombre="finger-print-outline" color={c.cesped} tamano={64} />
        {verificacion === 'verificando' ? (
          <Texto centrado>Confirmá tu identidad para escanear…</Texto>
        ) : (
          <>
            <Texto centrado>No se pudo verificar tu identidad.</Texto>
            <Boton titulo="Probar de nuevo" icono="finger-print-outline" onPress={verificarDeNuevo} />
          </>
        )}
      </View>
    );
  }

  const espacio = catalogo.espacios.find((e) => e.id === espacioId);
  const colores = {
    valido: { fondo: c.cesped, texto: c.textoSobreCesped, icono: 'checkmark-circle' as const },
    pendiente: { fondo: c.fondoAviso, texto: c.aviso, icono: 'cloud-offline' as const },
    invalido: { fondo: c.peligro, texto: c.superficie, icono: 'close-circle' as const },
  };

  return (
    <ScrollView style={{ backgroundColor: c.fondo }} contentContainerStyle={estilos.pantalla}>
      {sinBiometria && (
        <Aviso tipo="aviso" icono="finger-print-outline" titulo="Este teléfono no tiene huella configurada" detalle="Se puede escanear igual. Configurala en el teléfono para mayor seguridad." />
      )}
      {enviados > 0 && <Aviso tipo="aviso" icono="cloud-done-outline" titulo={`Se registraron ${enviados} ingresos que estaban pendientes`} />}

      <Texto peso="seminegrita">¿Qué espacio estás controlando?</Texto>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.chips}>
        {catalogo.espacios
          .filter((e) => e.activo)
          .map((e) => (
            <Chip key={e.id} texto={e.nombre.replace(' — ', ' ')} activo={espacioId === e.id} onPress={() => elegirEspacio(e.id)} />
          ))}
      </ScrollView>

      {!espacio ? (
        <Texto color={c.textoSuave}>Elegí el espacio para empezar a escanear.</Texto>
      ) : !permiso ? (
        <ActivityIndicator color={c.cesped} />
      ) : !permiso.granted ? (
        <View style={estilos.bloque}>
          <Texto>Para leer los códigos hace falta usar la cámara.</Texto>
          {permiso.canAskAgain ? (
            <Boton titulo="Permitir la cámara" icono="camera-outline" onPress={pedirPermiso} />
          ) : (
            <Texto variante="etiqueta" color={c.textoSuave}>
              Habilitá la cámara desde los ajustes del teléfono. Mientras tanto podés escribir el código abajo.
            </Texto>
          )}
        </View>
      ) : resultado ? (
        <View style={[estilos.resultado, { backgroundColor: colores[resultado.tipo].fondo }]} accessibilityLiveRegion="assertive">
          <Icono nombre={colores[resultado.tipo].icono} color={colores[resultado.tipo].texto} tamano={72} />
          <Texto variante="subtitulo" peso="negrita" centrado color={colores[resultado.tipo].texto}>
            {resultado.titulo}
          </Texto>
          <Texto centrado color={colores[resultado.tipo].texto}>
            {resultado.detalle}
          </Texto>
        </View>
      ) : (
        <View style={[estilos.camara, { borderColor: c.cesped }]}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={procesando ? undefined : onEscaneo}
          />
          <View style={[estilos.mira, { borderColor: c.acento }]} pointerEvents="none" />
          {procesando && (
            <View style={estilos.procesando}>
              <ActivityIndicator color={c.acento} size="large" />
            </View>
          )}
        </View>
      )}

      {espacio && (
        <Texto variante="chico" color={c.textoSuave} centrado>
          Controlando {espacio.nombre}, {fechaCorta(hoy())}
        </Texto>
      )}

      {resultado && (
        <>
          <Boton titulo="Escanear otro" icono="scan-outline" onPress={siguiente} />
          <Texto variante="chico" color={c.textoSuave} centrado>
            También podés sacudir el teléfono.
          </Texto>
        </>
      )}

      {espacio && !resultado && (
        <View style={[estilos.bloque, estilos.manual, { borderColor: c.borde }]}>
          <CampoTexto
            etiqueta="¿No se lee? Escribí el código"
            icono="keypad-outline"
            value={manual}
            onChangeText={setManual}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="VGY-1180-0919-19"
            returnKeyType="done"
            onSubmitEditing={() => manual.trim() && procesar(manual)}
          />
          <Boton titulo="Validar código" variante="secundario" compacto deshabilitado={!manual.trim()} cargando={procesando} onPress={() => procesar(manual)} />
        </View>
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  pantalla: { padding: ESPACIADO.l, gap: ESPACIADO.m },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: ESPACIADO.l, padding: ESPACIADO.xl },
  chips: { gap: ESPACIADO.s },
  bloque: { gap: ESPACIADO.m },
  manual: { borderTopWidth: 1, paddingTop: ESPACIADO.m, marginTop: ESPACIADO.s },
  camara: { height: 320, borderRadius: RADIO.tarjeta, overflow: 'hidden', borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  mira: { width: 200, height: 200, borderWidth: 3, borderRadius: RADIO.control },
  procesando: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  resultado: { borderRadius: RADIO.tarjeta, padding: ESPACIADO.xl, alignItems: 'center', gap: ESPACIADO.m, minHeight: 320, justifyContent: 'center' },
});
