"use client";

import { Check, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { useStore } from "@/components/store/StoreProvider";

export function OrderHereButton({ branch }: { branch: { id: number; name: string; slug: string; area: string } }) {
  const { branch: current, chooseBranch, busy } = useStore();
  const [pending, setPending] = useState(false);
  const active = current?.id === branch.id;
  return (
    <button
      disabled={active || busy}
      onClick={async () => {
        setPending(true);
        await chooseBranch(branch);
        setPending(false);
      }}
      className={active ? "btn-ghost" : "btn-matcha"}
    >
      {pending ? <LoaderCircle className="size-4 animate-spin" /> : active ? <Check className="size-4" /> : null}
      {active ? "You're ordering from here" : "Order from this branch"}
    </button>
  );
}
