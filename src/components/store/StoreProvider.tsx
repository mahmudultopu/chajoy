/** Client-side store context: cart, chosen branch, dialogs, toasts and lite mode. */

"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CartView } from "@/lib/services/cart";
import type { CartLineOptions } from "@/lib/db/schema";

export type BranchLite = { id: number; name: string; slug: string; area: string } | null;
type Toast = { id: number; title: string; body?: string; tone: "ok" | "error" | "info"; action?: { label: string; href: string } };
type BranchChange = { name: string; message: string };

type Store = {
  cart: CartView | null;
  itemCount: number;
  branch: BranchLite;
  busy: boolean;
  cartOpen: boolean;
  branchPickerOpen: boolean;
  searchOpen: boolean;
  setCartOpen: (v: boolean) => void;
  setBranchPickerOpen: (v: boolean) => void;
  setSearchOpen: (v: boolean) => void;
  refreshCart: () => Promise<void>;
  addItem: (i: { productId: number; variantId: number; quantity: number; options: CartLineOptions; label: string }) => Promise<boolean>;
  updateQty: (lineId: number, quantity: number) => Promise<void>;
  removeLine: (lineId: number) => Promise<void>;
  chooseBranch: (b: NonNullable<BranchLite> | null) => Promise<BranchChange[]>;
  toast: (t: Omit<Toast, "id">) => void;
  toasts: Toast[];
  dismissToast: (id: number) => void;
  liteMode: boolean;
  setLiteMode: (v: boolean) => void;
};

const Ctx = createContext<Store | null>(null);

/** Access to the store context; must be used inside StoreProvider. */
export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside StoreProvider");
  return s;
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Something went wrong.");
  return data as T;
}

/** Provides cart and branch state to the storefront and talks to the cart API. */
export function StoreProvider({
  initialBranch,
  initialCount,
  children,
}: {
  initialBranch: BranchLite;
  initialCount: number;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [cart, setCart] = useState<CartView | null>(null);
  const [itemCount, setItemCount] = useState(initialCount);
  const [branch, setBranch] = useState<BranchLite>(initialBranch);
  const [busy, setBusy] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [branchPickerOpen, setBranchPickerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [liteMode, setLiteModeState] = useState(false);
  const toastId = useRef(0);

  useEffect(() => {
    try {
      setLiteModeState(localStorage.getItem("cj-lite") === "1");
    } catch {
      /* storage unavailable */
    }
  }, []);
  const setLiteMode = useCallback((v: boolean) => {
    setLiteModeState(v);
    try {
      localStorage.setItem("cj-lite", v ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const toast = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = ++toastId.current;
      setToasts((all) => [...all.slice(-2), { ...t, id }]);
      setTimeout(() => dismissToast(id), t.tone === "error" ? 7000 : 4500);
    },
    [dismissToast],
  );

  const apply = useCallback((v: CartView) => {
    setCart(v);
    setItemCount(v.itemCount);
  }, []);

  const refreshCart = useCallback(async () => {
    try {
      apply(await api<CartView>("/api/cart"));
    } catch {
      /* keep last known state */
    }
  }, [apply]);

  useEffect(() => {
    if (cartOpen) refreshCart();
  }, [cartOpen, refreshCart]);

  const addItem: Store["addItem"] = useCallback(
    async ({ label, ...item }) => {
      setBusy(true);
      try {
        apply(await api<CartView>("/api/cart/items", { method: "POST", body: JSON.stringify(item) }));
        toast({ tone: "ok", title: "Added to your cart", body: label, action: { label: "View cart", href: "/cart" } });
        return true;
      } catch (e) {
        toast({ tone: "error", title: "Couldn't add that", body: (e as Error).message });
        return false;
      } finally {
        setBusy(false);
      }
    },
    [apply, toast],
  );

  const updateQty = useCallback(
    async (lineId: number, quantity: number) => {
      setBusy(true);
      try {
        apply(await api<CartView>(`/api/cart/items/${lineId}`, { method: "PATCH", body: JSON.stringify({ quantity }) }));
      } catch (e) {
        toast({ tone: "error", title: "Couldn't update", body: (e as Error).message });
      } finally {
        setBusy(false);
      }
    },
    [apply, toast],
  );

  const removeLine = useCallback(
    async (lineId: number) => {
      setBusy(true);
      try {
        apply(await api<CartView>(`/api/cart/items/${lineId}`, { method: "DELETE" }));
      } catch (e) {
        toast({ tone: "error", title: "Couldn't remove", body: (e as Error).message });
      } finally {
        setBusy(false);
      }
    },
    [apply, toast],
  );

  const chooseBranch = useCallback(
    async (b: NonNullable<BranchLite> | null) => {
      setBusy(true);
      try {
        const r = await api<{ view: CartView; changes: BranchChange[] }>("/api/cart/branch", {
          method: "PUT",
          body: JSON.stringify({ branchId: b?.id ?? null }),
        });
        apply(r.view);
        setBranch(b);
        router.refresh(); // re-render server components with this branch's prices
        if (r.changes.length)
          toast({
            tone: "info",
            title: `Your cart was updated for ${b?.name ?? "no branch"}`,
            body: r.changes.map((c) => `${c.name}: ${c.message}`).join(" "),
            action: { label: "Review cart", href: "/cart" },
          });
        else if (b) toast({ tone: "ok", title: `Ordering from ${b.name}`, body: "Prices and availability now match this branch." });
        return r.changes;
      } catch (e) {
        toast({ tone: "error", title: "Couldn't switch branch", body: (e as Error).message });
        return [];
      } finally {
        setBusy(false);
      }
    },
    [apply, router, toast],
  );

  const value = useMemo<Store>(
    () => ({
      cart,
      itemCount,
      branch,
      busy,
      cartOpen,
      branchPickerOpen,
      searchOpen,
      setCartOpen,
      setBranchPickerOpen,
      setSearchOpen,
      refreshCart,
      addItem,
      updateQty,
      removeLine,
      chooseBranch,
      toast,
      toasts,
      dismissToast,
      liteMode,
      setLiteMode,
    }),
    [cart, itemCount, branch, busy, cartOpen, branchPickerOpen, searchOpen, refreshCart, addItem, updateQty, removeLine, chooseBranch, toast, toasts, dismissToast, liteMode, setLiteMode],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
