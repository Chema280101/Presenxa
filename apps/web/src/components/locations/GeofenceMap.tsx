"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

export interface GeofenceMapProps {
  lat: number;
  lng: number;
  radius: number;
  onChange: (coords: { lat: number; lng: number; radius: number }) => void;
  interactive?: boolean;
}

// Inner Leaflet component that only mounts on client side
const InnerMap = dynamic(
  () =>
    import("./LeafletInnerMap").then((mod) => mod.LeafletInnerMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-72 rounded-2xl bg-slate-900/60 border border-white/10 flex items-center justify-center text-slate-400 text-xs animate-pulse">
        Cargando mapa interactivo...
      </div>
    ),
  }
);

export function GeofenceMap(props: GeofenceMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-72 rounded-2xl bg-slate-900/60 border border-white/10 flex items-center justify-center text-slate-400 text-xs">
        Inicializando geolocalización...
      </div>
    );
  }

  return <InnerMap {...props} />;
}
