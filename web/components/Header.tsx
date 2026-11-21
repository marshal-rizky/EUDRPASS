"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import {
  ProviderNotFoundError,
  useConnect,
  useConnection,
  useConnectors,
  useDisconnect,
  useSwitchChain,
} from "wagmi";
import { chain } from "@/lib/chain";
import { shortAddr } from "@/lib/format";
import { useRoles } from "@/lib/useRoles";

const NAV = [
  { href: "/register", label: "Registrasi" },
  { href: "/deliver", label: "Pengiriman" },
  { href: "/ship", label: "Shipment" },
] as const;

export function Header() {
  const pathname = usePathname();
  return (
    <header className="border-b border-coffee-200 bg-white/90 backdrop-blur sticky top-0 z-10 print:hidden">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold text-leaf-800">
          <span aria-hidden className="grid h-7 w-7 place-items-center rounded-full bg-leaf-700 text-sm text-white">
            ✓
          </span>
          EUDRPass
        </Link>
        <nav className="order-3 flex w-full gap-1 overflow-x-auto text-sm sm:order-none sm:w-auto">
          {NAV.map((n) => {
            const active = pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`rounded-md px-3 py-2 whitespace-nowrap ${
                  active ? "bg-leaf-100 font-semibold text-leaf-800" : "text-coffee-700 hover:bg-coffee-50"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto">
          <Wallet />
        </div>
      </div>
    </header>
  );
}

const noop = () => () => {};

/**
 * Phone browsers have no MetaMask extension. There the wallet lives in the MetaMask app,
 * so we hand back a deep link that reopens this page inside the app's own browser.
 */
function useMetaMaskDeepLink(): string | null {
  return useSyncExternalStore(
    noop,
    () => {
      const hasProvider = "ethereum" in window && window.ethereum != null;
      const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (hasProvider || !mobile) return null;
      const { host, pathname, search } = window.location;
      return `https://metamask.app.link/dapp/${host}${pathname}${search}`;
    },
    () => null,
  );
}

function Wallet() {
  const { address, status, chainId } = useConnection();
  const connectors = useConnectors();
  const connect = useConnect();
  const { mutate: disconnect } = useDisconnect();
  const switchChain = useSwitchChain();
  const roles = useRoles(address);
  const deepLink = useMetaMaskDeepLink();

  if ((status !== "connected" || !address) && deepLink) {
    return (
      <a href={deepLink} className="btn-primary text-sm">
        Buka di MetaMask
      </a>
    );
  }

  if (status !== "connected" || !address) {
    const notFound = connect.error instanceof ProviderNotFoundError;
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          className="btn-primary text-sm"
          disabled={connect.isPending || status === "reconnecting"}
          onClick={() => connectors[0] && connect.mutate({ connector: connectors[0] })}
        >
          {connect.isPending ? "Menghubungkan…" : "Hubungkan wallet"}
        </button>
        {connect.error && (
          <span className="text-xs text-red-700">
            {notFound ? "MetaMask tidak ditemukan di browser ini" : "Gagal menghubungkan wallet"}
          </span>
        )}
      </div>
    );
  }

  const wrongChain = chainId !== chain.id;
  const r = roles.data;
  const chips = r
    ? [r.cooperative && "Koperasi", r.collector && "Pengepul", r.exporter && "Eksportir"].filter(
        (x): x is string => typeof x === "string",
      )
    : [];

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
      {wrongChain ? (
        <button
          type="button"
          className="rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900"
          onClick={() => switchChain.mutate({ chainId: chain.id })}
        >
          Ganti ke {chain.name}
        </button>
      ) : roles.isLoading ? (
        <span className="text-xs text-coffee-500">memeriksa peran…</span>
      ) : chips.length > 0 ? (
        chips.map((c) => (
          <span key={c} className="rounded-full bg-leaf-100 px-2 py-0.5 text-xs font-semibold text-leaf-800">
            {c}
          </span>
        ))
      ) : (
        <span className="rounded-full bg-coffee-100 px-2 py-0.5 text-xs text-coffee-700">Tanpa peran</span>
      )}
      <button
        type="button"
        title="Putuskan wallet"
        className="rounded-md border border-coffee-200 px-2 py-1 font-mono text-xs text-coffee-800 hover:bg-coffee-50"
        onClick={() => disconnect()}
      >
        {shortAddr(address)}
      </button>
    </div>
  );
}
