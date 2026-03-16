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
      {/* Left bean */}
      <ellipse cx="8.5" cy="12" rx="3.5" ry="6" transform="rotate(-25 8.5 12)" />
      <path d="M8.5 6 Q11 12 8.5 18" transform="rotate(-25 8.5 12)" />
      {/* Right bean */}
      <ellipse cx="15.5" cy="12" rx="3.5" ry="6" transform="rotate(25 15.5 12)" />
      <path d="M15.5 6 Q13 12 15.5 18" transform="rotate(25 15.5 12)" />
    </svg>
  );
}
