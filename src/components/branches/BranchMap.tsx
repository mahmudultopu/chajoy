"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import { Circle, MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";

export type MapBranch = { id: number; name: string; latitude: number | null; longitude: number | null; approximate: boolean };

const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL ?? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIB = process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ?? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const DHAKA: [number, number] = [23.785, 90.405];

function pin(active: boolean, approximate: boolean) {
  return L.divIcon({
    className: "",
    iconSize: [34, 42],
    iconAnchor: [17, 40],
    html: `<div style="position:relative;width:34px;height:42px;filter:drop-shadow(0 4px 6px rgba(16,41,26,.35))">
      <svg viewBox="0 0 34 42" width="34" height="42"><path d="M17 41s14-13.2 14-24A14 14 0 0 0 3 17c0 10.8 14 24 14 24Z" fill="${active ? "#10291a" : "#8db33a"}" stroke="#fffdf6" stroke-width="2" ${approximate ? 'stroke-dasharray="3 2"' : ""}/></svg>
      <span style="position:absolute;top:7px;left:0;right:0;text-align:center;font:700 13px/20px system-ui;color:${active ? "#bfd876" : "#10291a"}">C</span></div>`,
  });
}

const youIcon = L.divIcon({
  className: "",
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  html: `<span style="display:block;width:22px;height:22px;border-radius:50%;background:#2f80ed;border:4px solid #fff;box-shadow:0 0 0 6px rgba(47,128,237,.25)"></span>`,
});

function Fit({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) map.setView(points[0], 14);
    else map.fitBounds(L.latLngBounds(points), { padding: [36, 36], maxZoom: 14 });
  }, [map, points]);
  return null;
}

function ClickToPick({ onPick }: { onPick?: (p: { lat: number; lng: number }) => void }) {
  useMapEvents({ click: (e) => onPick?.({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

export default function BranchMap({
  branches,
  selectedId,
  onSelect,
  origin,
  pickPoint,
  onPick,
  radiusKm,
  className,
}: {
  branches: MapBranch[];
  selectedId?: number | null;
  onSelect?: (id: number) => void;
  origin?: { lat: number; lng: number } | null;
  /** delivery pin mode: shows a draggable point */
  pickPoint?: { lat: number; lng: number } | null;
  onPick?: (p: { lat: number; lng: number }) => void;
  radiusKm?: { center: { lat: number; lng: number }; km: number } | null;
  className?: string;
}) {
  const withPins = branches.filter((b) => b.latitude !== null && b.longitude !== null);
  const points = useMemo<[number, number][]>(() => {
    const p: [number, number][] = withPins.map((b) => [b.latitude!, b.longitude!]);
    if (origin) p.push([origin.lat, origin.lng]);
    if (pickPoint) p.push([pickPoint.lat, pickPoint.lng]);
    return p;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(withPins.map((b) => b.id)), origin?.lat, origin?.lng, pickPoint ? 1 : 0]);

  return (
    // isolate: keeps Leaflet's internal z-indexes (400+) from painting over the sticky header
    <MapContainer center={DHAKA} zoom={12} scrollWheelZoom={false} className={`${className ?? "h-full w-full"} isolate`} attributionControl>
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIB} />
      <Fit points={points} />
      {onPick && <ClickToPick onPick={onPick} />}
      {withPins.map((b) => (
        <Marker
          key={b.id}
          position={[b.latitude!, b.longitude!]}
          icon={pin(b.id === selectedId, b.approximate)}
          eventHandlers={{ click: () => onSelect?.(b.id) }}
          keyboard
          title={b.name}
        >
          <Tooltip direction="top" offset={[0, -36]}>
            {b.name}
            {b.approximate ? " · approximate area pin" : ""}
          </Tooltip>
        </Marker>
      ))}
      {withPins
        .filter((b) => b.approximate)
        .map((b) => (
          <Circle key={`c${b.id}`} center={[b.latitude!, b.longitude!]} radius={350} pathOptions={{ color: "#6f9126", weight: 1, dashArray: "4 4", fillOpacity: 0.06 }} />
        ))}
      {radiusKm && (
        <Circle center={[radiusKm.center.lat, radiusKm.center.lng]} radius={radiusKm.km * 1000} pathOptions={{ color: "#10291a", weight: 1.5, dashArray: "6 6", fillOpacity: 0.04 }} />
      )}
      {origin && <Marker position={[origin.lat, origin.lng]} icon={youIcon} title="You" />}
      {pickPoint && (
        <Marker
          position={[pickPoint.lat, pickPoint.lng]}
          icon={youIcon}
          draggable
          eventHandlers={{ dragend: (e) => onPick?.((e.target as L.Marker).getLatLng()) }}
          title="Delivery location"
        />
      )}
    </MapContainer>
  );
}
