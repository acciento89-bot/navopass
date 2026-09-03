import Link from "next/link";

export function Logo({ href = "/", label = "NavoPass" }: { href?: string; label?: string }) {
  return (
    <Link href={href} className="logo" aria-label={label}>
      <span className="logo-mark" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3 5 6v5.5c0 4.2 2.8 6.9 7 8.8 4.2-1.9 7-4.6 7-8.8V6z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      </span>
      <span>NavoPass</span>
    </Link>
  );
}
