"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { GeofenceMapProps } from "./GeofenceMap";

// Custom modern SVG pin icon
const customIcon = L.divIcon({
  className: "custom-map-marker",
  html: `
    <div style="
      background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
      width: 30px;
      height: 30px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 14px rgba(99,102,241,0.5);
      border: 2px solid #ffffff;
    ">
      <div style="
        width: 10px;
        height: 10px;
        background: #ffffff;
        border-radius: 50%;
        transform: rotate(45deg);
      "></div>
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
});

export function LeafletInnerMap({
  lat,
  lng,
  radius,
  onChange,
  interactive = true,
}: GeofenceMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  const radiusRef = useRef(radius);
  useEffect(() => {
    radiusRef.current = radius;
  }, [radius]);

  // Initialize Map once
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Destroy existing instance if container already had one
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [lat, lng],
      zoom: 16,
      zoomControl: interactive,
      dragging: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
    });

    // Dark/Standard tiles
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
      }
    ).addTo(map);

    // Marker
    const marker = L.marker([lat, lng], {
      icon: customIcon,
      draggable: interactive,
    }).addTo(map);

    // Circle
    const circle = L.circle([lat, lng], {
      radius: radius,
      color: "#6366f1",
      fillColor: "#818cf8",
      fillOpacity: 0.25,
      weight: 2,
      dashArray: "6, 6",
    }).addTo(map);

    if (interactive) {
      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        circle.setLatLng(pos);
        onChange({ lat: pos.lat, lng: pos.lng, radius: radiusRef.current });
      });

      map.on("click", (e: L.LeafletMouseEvent) => {
        const { lat: clickLat, lng: clickLng } = e.latlng;
        marker.setLatLng([clickLat, clickLng]);
        circle.setLatLng([clickLat, clickLng]);
        onChange({ lat: clickLat, lng: clickLng, radius: radiusRef.current });
      });
    }

    mapInstanceRef.current = map;
    markerRef.current = marker;
    circleRef.current = circle;

    // Force map resize check
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // React to prop changes (lat, lng, radius)
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current || !circleRef.current) return;

    const map = mapInstanceRef.current;
    const marker = markerRef.current;
    const circle = circleRef.current;

    const currentPos = marker.getLatLng();
    if (currentPos.lat !== lat || currentPos.lng !== lng) {
      marker.setLatLng([lat, lng]);
      circle.setLatLng([lat, lng]);
      map.panTo([lat, lng], { animate: true });
    }

    if (circle.getRadius() !== radius) {
      circle.setRadius(radius);
    }
  }, [lat, lng, radius]);

  return (
    <div className="w-full h-80 rounded-2xl overflow-hidden border border-white/10 shadow-xl relative z-0">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Floating coordinates badge */}
      <div className="absolute bottom-3 left-3 z-[1000] px-3 py-1.5 rounded-xl bg-slate-950/85 backdrop-blur-md border border-white/10 text-[11px] font-mono text-slate-300 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
        <span>
          Lat: {lat.toFixed(5)}, Lng: {lng.toFixed(5)} · Radio: {radius}m
        </span>
      </div>
    </div>
  );
}
