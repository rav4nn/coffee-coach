type MyBeansIconProps = {
  className?: string;
};

export function MyBeansIcon({ className }: MyBeansIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="12" cy="12" rx="5" ry="8" transform="rotate(-15 12 12)" />
      <path d="M12 4 Q15.5 12 12 20" transform="rotate(-15 12 12)" />
    </svg>
  );
}
