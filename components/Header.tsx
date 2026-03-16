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

      <div className="flex items-center gap-2">
        {/* Figma Plugin — link will be added after approval */}
        <button
          disabled
          className="h-[48px] px-4 rounded-2xl bg-[#F1F1F1] text-black text-[16px] font-medium tracking-[-0.32px] opacity-50 cursor-not-allowed"
        >
          Figma Plugin
        </button>

        {/* Export */}
        <button
          onClick={onExport}
          disabled={!hasPalettes}
          className="h-[48px] px-4 rounded-2xl bg-black text-white text-[16px] font-medium tracking-[-0.32px] hover:bg-[#222] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Export
        </button>
      </div>
    </header>
  );
}
