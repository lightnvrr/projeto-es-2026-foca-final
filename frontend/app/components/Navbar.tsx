"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { clearToken, getToken } from "@/lib/api";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(getToken() !== null);
  }, [pathname]);

  if (pathname === "/login") return null;

  function handleLogout() {
    clearToken();
    setIsLoggedIn(false);
    router.push("/login");
  }

  return (
    <nav className="bg-primary px-6 py-2 shadow-md text-surfaceVariant">
      <div className="flex justify-between items-center">
        <Link href="/login" className="hover:opacity-80 transition">
          <img src="/logo_foca.svg" alt="Foca" className="h-14 w-auto" />
        </Link>

        {isLoggedIn && (
          <button
            onClick={handleLogout}
            className="text-sm font-semibold text-surfaceVariant hover:text-primaryLight transition"
          >
            Sair
          </button>
        )}
      </div>
    </nav>
  );
}
