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
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7.5 4.5c-2.6 0-4.8 2.5-4.8 5.8 0 4.8 3.2 9.2 7 9.2 2.6 0 4.8-2.5 4.8-5.8 0-4.8-3.2-9.2-7-9.2z" />
      <path d="M16.5 5c2.6 0 4.8 2.5 4.8 5.8 0 4.8-3.2 9.2-7 9.2-2.6 0-4.8-2.5-4.8-5.8 0-4.8 3.2-9.2 7-9.2z" />
      <path d="M9 8.5c1.6 3.1 4.1 5.6 6.5 6.8" />
    </svg>
  );
}
