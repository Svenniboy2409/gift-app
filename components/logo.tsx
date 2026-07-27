export function Logo({ className = "size-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
      role="presentation"
    >
      <rect x="3" y="12" width="26" height="17" rx="3" fill="var(--accent)" />
      <rect x="3" y="12" width="26" height="5" rx="1.5" fill="var(--accent-hover)" />
      <rect x="13.5" y="12" width="5" height="17" fill="var(--accent-text)" opacity="0.85" />
      <path
        d="M16 12c-2.5 0-6-1-6-4.2C10 5.7 11.3 4 13.2 4 15.4 4 16 7.4 16 12Zm0 0c2.5 0 6-1 6-4.2C22 5.7 20.7 4 18.8 4 16.6 4 16 7.4 16 12Z"
        fill="var(--accent)"
        stroke="var(--accent-hover)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
