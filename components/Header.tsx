"use client";

import Image from "next/image";

type HeaderProps = {
  hasPalettes: boolean;
  onExport: () => void;
};

export default function Header({ hasPalettes, onExport }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-[96px] bg-[#FAFAFA] border-b border-[#E7E7E7] flex items-center px-10">
      {/* Logo */}
      <div className="flex items-center gap-3">
        {/* SVG viewBox is 120×50 — render at 2.8× for a crisp 56px-tall logo */}
        <Image
          src="/logo.svg"
          alt="Simple Palette logo"
          width={336}
          height={140}
          priority
          className="h-14 w-auto"
        />
      </div>

      <div className="flex-1" />

      {/* Export */}
      <button
        onClick={onExport}
        disabled={!hasPalettes}
        className="h-[56px] px-6 rounded-2xl bg-black text-white text-[16px] font-medium tracking-[-0.32px] hover:bg-[#222] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Export
      </button>
    </header>
  );
}
