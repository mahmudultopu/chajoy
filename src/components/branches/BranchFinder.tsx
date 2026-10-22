/**
 * Branch finder: uses the visitor's location or a searched address to rank
 * branches by distance and by whether they can take the order, with a map.
 */

"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { Check, Clock, LoaderCircle, LocateFixed, MapPin, Search, Store, Truck, TriangleAlert } from "lucide-react";
import type { RankedBranch } from "@/lib/services/branches";
import { formatDistance } from "@/lib/geo";
import { formatBDT } from "@/lib/money";
import { useStore } from "@/components/store/StoreProvider";

const BranchMap = dynamic(() => import("./BranchMap"), {
  ssr: false,
  loading: () => <div className="skeleton h-full w-full rounded-none" />,
});

type Origin = { lat: number; lng: number; label: string; source: "device" | "search" };
type GeoState = "idle" | "locating" | "denied" | "unavailable" | "error";
type Ranked = { branches: RankedBranch[]; recommendedId: number | null };

const ORIGIN_KEY = "cj-origin";

/** Branch search, ranked list and map. Choosing a branch sets it for ordering. */
export function BranchFinder({
  initial,
  layout = "split",
  onChosen,
  showMap = true,
}: {
  initial: Ranked;
  layout?: "split" | "stack";
  onChosen?: () => void;
  showMap?: boolean;
}) {
  const { branch, chooseBranch, busy } = useStore();
  const [data, setData] = useState<Ranked>(initial);
  // the origin the current list was ranked for; recommendations only show when it matches
  const [rankedFor, setRankedFor] = useState<string | null>(null);
  const [ranking, setRanking] = useState(false);
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [geo, setGeo] = useState<GeoState>("idle");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ label: string; lat: number; lng: number }[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<number | null>(branch?.id ?? null);
  const listRef = useRef<HTMLUListElement>(null);

  const rank = useCallback(async (o: Origin | null) => {
    const qs = o ? `?lat=${o.lat}&lng=${o.lng}` : "";
    setRanking(true);
    try {
      const r = await fetch(`/api/branches${qs}`);
      if (r.ok) {
        setData(await r.json());
        setRankedFor(o ? `${o.lat},${o.lng}` : null);
      }
    } finally {
      setRanking(false);
    }
  }, []);

  // Restore this tab's last search point (kept in the browser only).
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(ORIGIN_KEY);
      if (saved) {
        const o = JSON.parse(saved) as Origin;
        setOrigin(o);
        rank(o);
      }
    } catch {
      /* ignore */
    }
    navigator.permissions
      ?.query({ name: "geolocation" as PermissionName })
      .then((p) => {
        if (p.state === "denied") setGeo("denied");
      })
      .catch(() => {});
  }, [rank]);

  const applyOrigin = (o: Origin) => {
    setOrigin(o);
    try {
      sessionStorage.setItem(ORIGIN_KEY, JSON.stringify(o));
    } catch {
      /* ignore */
    }
    rank(o);
  };

  const locate = () => {
    if (!("geolocation" in navigator) || !window.isSecureContext) {
      setGeo("unavailable");
      return;
    }
    setGeo("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo("idle");
        applyOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: "your current location", source: "device" });
      },
      (err) => setGeo(err.code === err.PERMISSION_DENIED ? "denied" : "error"),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 },
    );
  };

  const search = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (query.trim().length < 2) return;
    setSearching(true);
    setSearchError(null);
    try {
      const r = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      const d = await r.json();
      setResults(d.results ?? []);
      if (d.error) setSearchError(d.error);
      else if (!d.results?.length) setSearchError("No places found. Try an area name like “Dhanmondi” or a landmark.");
    } catch {
      setSearchError("Search failed. Check your connection and try again.");
    } finally {
      setSearching(false);
    }
  };

  const fresh = !!origin && rankedFor === `${origin.lat},${origin.lng}` && !ranking;
  const recommended = fresh ? (data.branches.find((b) => b.id === data.recommendedId) ?? null) : null;

  const pick = async (b: RankedBranch) => {
    await chooseBranch({ id: b.id, name: b.name, slug: b.slug, area: b.area });
    onChosen?.();
  };

  return (
    <div className={clsx("grid gap-5", layout === "split" && showMap ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]" : "")}>
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-col gap-3 rounded-4xl bg-white p-4 ring-1 ring-forest-900/5 sm:p-5">
          <button
            type="button"
            onClick={locate}
            disabled={geo === "locating" || geo === "denied"}
            className="btn-primary w-full"
          >
            {geo === "locating" ? <LoaderCircle className="size-4 animate-spin" /> : <LocateFixed className="size-4" />}
            {geo === "locating" ? "Finding you…" : "Use my location"}
          </button>
          {geo === "denied" && (
            <p className="text-sm text-forest-900/70">Location access is off for this site. Search for your area or a landmark instead.</p>
          )}
          {geo === "unavailable" && <p className="text-sm text-forest-900/70">Your browser can't share location here. Search for your area instead.</p>}
          {geo === "error" && <p className="text-sm text-forest-900/70">We couldn't get your location. Try again or search below.</p>}

          <form onSubmit={search} className="relative" role="search">
            <label htmlFor="branch-q" className="sr-only">
              Search by area, address or landmark
            </label>
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-forest-900/45" />
            <input
              id="branch-q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Area, address or landmark — e.g. Dhanmondi 27"
              className="input pl-11 pr-24"
              autoComplete="off"
            />
            <button type="submit" disabled={searching} className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-xl bg-matcha-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-matcha-700">
              {searching ? <LoaderCircle className="size-4 animate-spin" /> : "Search"}
            </button>
          </form>
          {searchError && <p className="text-sm text-berry-600">{searchError}</p>}
          {results.length > 0 && (
            <ul className="divide-y divide-forest-900/5 overflow-hidden rounded-2xl ring-1 ring-forest-900/10">
              {results.map((r, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => {
                      applyOrigin({ lat: r.lat, lng: r.lng, label: r.label.split(",").slice(0, 2).join(","), source: "search" });
                      setResults([]);
                    }}
                    className="flex w-full items-start gap-2 bg-white px-4 py-3 text-left text-sm hover:bg-matcha-50"
                  >
                    <MapPin className="mt-0.5 size-4 shrink-0 text-matcha-600" />
                    <span className="line-clamp-2">{r.label}</span>
                  </button>
                </li>
              ))}
              <li className="bg-cream-100 px-4 py-1.5 text-[11px] text-forest-900/50">Search by © OpenStreetMap contributors</li>
            </ul>
          )}
          {origin && (
            <p className="text-sm text-forest-900/70">
              Showing branches nearest to <strong className="text-forest-900">{origin.label}</strong>.{" "}
              <button
                className="underline underline-offset-2"
                onClick={() => {
                  setOrigin(null);
                  try {
                    sessionStorage.removeItem(ORIGIN_KEY);
                  } catch {}
                  rank(null);
                }}
              >
                Clear
              </button>
            </p>
          )}
        </div>

        {origin && !fresh && (
          <p className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm text-forest-900/70 ring-1 ring-forest-900/5" aria-live="polite">
            <LoaderCircle className="size-4 animate-spin" /> Finding the nearest branches…
          </p>
        )}
        {origin && recommended && (
          <p className="rounded-2xl bg-matcha-100 px-4 py-3 text-sm text-forest-900">
            <strong>Recommended: {recommended.name}</strong> — the nearest branch that can take your order right now.
          </p>
        )}
        {fresh && !recommended && (
          <p className="flex gap-2 rounded-2xl bg-lemon-300/40 px-4 py-3 text-sm text-forest-900">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            No branch can take an online order for you right now. You can still visit a branch below.
          </p>
        )}

        <ul ref={listRef} className="flex flex-col gap-3 lg:max-h-[560px] lg:overflow-y-auto lg:pr-1" aria-label="CHAJOY branches">
          {data.branches.map((b) => {
            const active = branch?.id === b.id;
            return (
              <li
                key={b.id}
                id={`branch-${b.id}`}
                className={clsx(
                  "rounded-4xl bg-white p-4 ring-1 transition sm:p-5",
                  focusId === b.id ? "ring-2 ring-matcha-500" : "ring-forest-900/5",
                )}
                onMouseEnter={() => setFocusId(b.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-lg text-forest-900">{b.name}</h3>
                      {b.id === data.recommendedId && fresh && <span className="chip border-none bg-matcha-600 text-white">Recommended</span>}
                      {active && (
                        <span className="chip border-none bg-forest-800 text-cream-50">
                          <Check className="size-3" /> Selected
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-forest-900/70">
                      {b.addressLine ? `${b.addressLine}, ${b.city}` : `${b.area}, ${b.city} · street address not published yet`}
                    </p>
                  </div>
                  {b.distanceKm !== null && (
                    <div className="shrink-0 text-right">
                      <p className="font-display text-xl text-forest-900">≈ {formatDistance(b.distanceKm)}</p>
                      <p className="text-[11px] leading-tight text-forest-900/55">
                        straight line
                        {b.distanceApprox ? <><br />approx. pin</> : null}
                      </p>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className={clsx("chip", b.open.state === "open" && !b.temporarilyClosed ? "bg-matcha-100" : "")}>
                    <Clock className="size-3.5" /> {b.openLabel}
                  </span>
                  {b.pickupEnabled && b.acceptsOnlineOrders && (
                    <span className="chip">
                      <Store className="size-3.5" /> Pickup
                    </span>
                  )}
                  {b.deliveryEnabled && b.acceptsOnlineOrders && (
                    <span className="chip">
                      <Truck className="size-3.5" /> Delivery {b.deliveryFeePaisa !== null ? `· ${formatBDT(b.deliveryFeePaisa)}` : ""}
                      {b.deliveryRadiusKm ? ` · ${b.deliveryRadiusKm} km` : ""}
                    </span>
                  )}
                  {!b.acceptsOnlineOrders && <span className="chip text-forest-900/60">Online ordering not open yet</span>}
                </div>
                {b.reasons.length > 0 && b.acceptsOnlineOrders && (
                  <p className="mt-2 text-xs text-forest-900/60">{b.reasons.join(" · ")}</p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" disabled={busy || active} onClick={() => pick(b)} className={clsx(active ? "btn-ghost" : "btn-matcha", "py-2.5")}>
                    {active ? "Ordering from here" : "Order from this branch"}
                  </button>
                  <Link href={`/branches/${b.slug}`} className="btn-ghost py-2.5" onClick={onChosen}>
                    Details & menu
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="px-2 text-xs leading-relaxed text-forest-900/55">
          Distances are straight-line estimates, not driving distances. Branch pins marked “approximate” show the area only until CHAJOY confirms the exact
          location. Your location stays in this browser and is only used to sort branches.
        </p>
      </div>

      {showMap && (
        <div className={clsx("relative overflow-hidden rounded-4xl ring-1 ring-forest-900/10", layout === "split" ? "h-[360px] lg:sticky lg:top-24 lg:h-[640px]" : "h-[300px]")}>
          <BranchMap
            branches={data.branches.map((b) => ({ id: b.id, name: b.name, latitude: b.latitude, longitude: b.longitude, approximate: b.locationPrecision !== "exact" }))}
            selectedId={focusId}
            origin={origin}
            onSelect={(id) => {
              setFocusId(id);
              document.getElementById(`branch-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }}
          />
        </div>
      )}
    </div>
  );
}
