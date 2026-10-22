/*
 * Shared pieces for the /register pages: page shell, the solid-gold form panel,
 * accessible text fields and dark buttons that keep strong contrast on gold.
 * Gold is reserved for registration surfaces; text on gold is near-black.
 */
import { Link } from "@tanstack/react-router";
import type { ComponentProps, ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { RegisterAtmosphere } from "@/components/home/register-atmosphere";
import { cn } from "@/lib/utils";

export const GOLD = "#F5B921";

export function RegisterShell({ children, narrow = false }: { children: ReactNode; narrow?: boolean }) {
  return (
    <div className="relative min-h-screen bg-[#07080A] text-[#F5F5F5] overflow-x-hidden">
      <RegisterAtmosphere />
      <SiteHeader />
      <main
        className={cn(
          "relative z-10 mx-auto w-full px-5 py-8 sm:px-8 md:py-12",
          narrow ? "max-w-6xl" : "max-w-none lg:px-14 xl:px-20",
        )}
      >
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

export function BackLink({ to, children }: { to: "/" | "/register"; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="group mb-4 inline-flex items-center gap-2 rounded-lg py-1 text-sm font-medium text-[#A5A9B2] transition-colors hover:text-[#F5F5F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E7B54A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07080A]"
    >
      <ArrowLeft className="h-4 w-4 text-[#E7B54A] transition-transform group-hover:-translate-x-1" aria-hidden />
      <span>{children}</span>
    </Link>
  );
}

/** Solid gold surface with near-black text. */
export function GoldPanel({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={cn(
        "rounded-[2rem] bg-[#F5B921] p-6 text-[#0A0A0A] shadow-[0_0_80px_-20px_rgba(245,185,33,0.45)] sm:p-10",
        className,
      )}
    />
  );
}

type FieldProps = Omit<ComponentProps<"input">, "id"> & {
  id: string;
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
};

export function TextField({ id, label, error, hint, required, className, ...input }: FieldProps) {
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
        {required ? (
          <span className="ml-1" aria-hidden>
            *
          </span>
        ) : (
          <span className="ml-1 font-normal opacity-70">(optional)</span>
        )}
      </label>
      <input
        id={id}
        required={required}
        aria-required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        {...input}
        className="rounded-xl border-2 border-[#0A0A0A] bg-[#0A0A0A] px-3.5 py-3 text-base text-white placeholder:text-white/45 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A] aria-[invalid=true]:border-red-500"
      />
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-sm opacity-80">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm font-semibold text-[#7A0C0C]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function DarkButton({ className, ...props }: ComponentProps<"button">) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/30 bg-[#0A0A0A] px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-[#1a1a1a] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#0A0A0A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5B921] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    />
  );
}

export function GoldAlert({ tone, children }: { tone: "error" | "info"; children: ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-xl border-2 px-4 py-3 text-sm font-semibold",
        tone === "error" ? "border-[#7A0C0C] bg-[#FFE9E9] text-[#4A0707]" : "border-[#0A0A0A] bg-[#0A0A0A] text-white",
      )}
    >
      {children}
    </div>
  );
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_RE = /^[0-9+()\s-]{7,20}$/;
