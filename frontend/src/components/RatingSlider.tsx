export function RatingSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="rounded-[1.75rem] border border-mocha/10 bg-steam p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-espresso">Brew Rating</p>
        <p className="text-sm font-semibold text-mocha">{value}/10</p>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-3 w-full accent-[#6f4e37]"
      />
    </div>
  );
}
