"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { clearToken, getToken } from "@/lib/api";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [confirmarLogout, setConfirmarLogout] = useState(false);

  useEffect(() => {
    setIsLoggedIn(getToken() !== null);
  }, [pathname]);

  if (pathname === "/login") return null;

  function handleLogout() {
    clearToken();
    setIsLoggedIn(false);
    setConfirmarLogout(false);
    router.push("/login");
  }

  return (
    <>
      <nav className="bg-primary px-6 py-2 shadow-md text-surfaceVariant">
        <div className="flex justify-between items-center">
          <Link href="/login" className="hover:opacity-80 transition">
            <img src="/logo_foca.svg" alt="Foca" className="h-14 w-auto" />
          </Link>

          {isLoggedIn && (
            <button
              onClick={() => setConfirmarLogout(true)}
              className="text-sm font-semibold text-surfaceVariant hover:text-primaryLight transition"
            >
              Sair
            </button>
          )}
        </div>
      </nav>

      {confirmarLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-surface rounded-lg shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-lg font-bold text-primary mb-2">Sair da plataforma</h2>
            <p className="text-sm text-onSurfaceLight mb-6">
              Tem certeza que deseja encerrar a sessão?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmarLogout(false)}
                className="px-4 py-2 rounded-md text-sm font-semibold text-primary border border-primaryLight hover:bg-surfaceVariant transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-md text-sm font-semibold text-surface bg-primary hover:bg-secondary transition"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
