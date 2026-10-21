/**
 * Ubicación del teléfono, sólo para el mapa y para saber qué complejo queda
 * más cerca. Si la persona la niega, la app sigue igual (lo pide el documento).
 * Al montar sólo se consulta el permiso; el pedido aparece cuando se toca el botón.
 */
import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import type { Coordenadas } from '@/tipos';

export type EstadoUbicacion = 'sin-pedir' | 'buscando' | 'denegada' | 'lista' | 'error';

async function posicionActual(): Promise<Coordenadas> {
  const ultima = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000, requiredAccuracy: 500 });
  const p = ultima ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
  return { latitud: p.coords.latitude, longitud: p.coords.longitude };
}

export function useUbicacion() {
  const [estado, setEstado] = useState<EstadoUbicacion>('sin-pedir');
  const [posicion, setPosicion] = useState<Coordenadas | null>(null);

  const leer = useCallback(async () => {
    setEstado('buscando');
    try {
      setPosicion(await posicionActual());
      setEstado('lista');
    } catch {
      setEstado('error');
    }
  }, []);

  // Si ya dio permiso antes, se usa sin preguntar de nuevo.
  useEffect(() => {
    Location.getForegroundPermissionsAsync()
      .then((p) => {
        if (p.granted) leer();
        else if (!p.canAskAgain) setEstado('denegada');
      })
      .catch(() => {});
  }, [leer]);

  const pedir = useCallback(async () => {
    try {
      const p = await Location.requestForegroundPermissionsAsync();
      if (p.granted) await leer();
      else setEstado('denegada');
    } catch {
      setEstado('error');
    }
  }, [leer]);

  return { estado, posicion, pedir };
}

/** Distancia en kilómetros entre dos puntos (fórmula del haversine). */
export function distanciaKm(a: Coordenadas, b: Coordenadas): number {
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.latitud - a.latitud);
  const dLon = rad(b.longitud - a.longitud);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitud)) * Math.cos(rad(b.latitud)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** "850 m" o "1,2 km" */
export function formatearDistancia(km: number): string {
  return km < 1 ? `${Math.round(km * 100) * 10} m` : `${km.toFixed(1).replace('.', ',')} km`;
}
