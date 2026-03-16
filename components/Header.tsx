"use client";

import Image from "next/image";

type HeaderProps = {
  hasPalettes: boolean;
  darkMode: boolean;
  onToggleDark: () => void;
  onExport: () => void;
};

function IconMoon() {
  return <Image src="/moon.svg" alt="Dark mode" width={24} height={24} />;
}

function IconSun() {
  return <Image src="/sun.svg" alt="Light mode" width={24} height={24} />;
}

export default function Header({ hasPalettes, darkMode, onToggleDark, onExport }: HeaderProps) {
  const borderColor = darkMode ? "border-[#323232]" : "border-[#E4E4E4]";
  const bgColor     = darkMode ? "bg-black"          : "bg-[#FAFAFA]";

  return (
    <header className={`fixed top-0 left-0 right-0 z-40 h-[96px] ${bgColor} border-b ${borderColor} flex items-center px-10`}>
      {/* Logo */}
      <div className="flex items-center gap-3">
        <Image
          src={darkMode ? "/logo-dark.svg" : "/logo.svg"}
          alt="Simple Palette logo"
          width={336}
          height={140}
          priority
          className="h-14 w-auto"
        />
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-3">
        {/* Dark mode toggle */}
        <button
          onClick={onToggleDark}
          className={`h-[48px] w-[48px] flex items-center justify-center rounded-2xl border transition-colors ${
            darkMode
              ? "border-[#404040] text-white hover:bg-[#1c1c1c]"
              : "border-[#E7E7E7] text-black hover:bg-[#F1F1F1]"
          }`}
          title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {darkMode ? <IconSun /> : <IconMoon />}
        </button>

        {/* Figma Plugin — link will be added after approval */}
        <button
          disabled
          className={`h-[48px] px-4 rounded-2xl text-[16px] font-medium tracking-[-0.32px] opacity-50 cursor-not-allowed ${
            darkMode ? "bg-[#1C1C1C] text-white" : "bg-[#F1F1F1] text-black"
          }`}
        >
          Figma Plugin
        </button>

        {/* Export */}
        <button
          onClick={onExport}
          disabled={!hasPalettes}
          className={`h-[48px] px-4 rounded-2xl text-[16px] font-medium tracking-[-0.32px] transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
            darkMode
              ? "bg-white text-black hover:bg-[#E0E0E0]"
              : "bg-black text-white hover:bg-[#222]"
          }`}
        >
          Export
        </button>
      </div>
    </header>
  );
}
