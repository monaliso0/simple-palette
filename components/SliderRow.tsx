type SliderRowProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  sliderClass: string;
  sliderStyle?: React.CSSProperties;
  onChange: (v: number) => void;
};

export default function SliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  sliderClass,
  sliderStyle,
  onChange,
}: SliderRowProps) {
  return (
    <div className="bg-[#F3F3F3] rounded-xl p-3 flex flex-col gap-0">
      <div className="flex items-center justify-between">
        <span className="text-[14px] text-black/50 font-normal">{label}</span>
        <span className="text-[14px] font-medium text-black bg-white/90 rounded px-2 h-6 flex items-center tabular-nums">
          {Math.round(value)}
        </span>
      </div>
      <div className="py-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={Math.round(value)}
          onChange={(e) => onChange(Number(e.target.value))}
          className={sliderClass}
          style={sliderStyle}
        />
      </div>
    </div>
  );
}
