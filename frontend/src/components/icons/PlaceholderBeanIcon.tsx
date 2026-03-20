type PlaceholderBeanIconProps = {
  className?: string;
};

export function PlaceholderBeanIcon({ className }: PlaceholderBeanIconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M39.6 6.9C28.2 4.8 15.8 12.8 11.9 25.5C7.8 38.9 13.4 53.2 25.9 56.9C37.3 60.3 49.8 52.9 54 40.3C58.6 26.3 52.5 9.3 39.6 6.9Z"
        stroke="#f49d25"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M38.2 13.8C30.7 20.1 27 28.8 27.8 38.1C28.3 43.9 30.5 49.3 34.1 54"
        stroke="#f49d25"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
