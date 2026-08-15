import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="logo" aria-label="NavoPass Startseite">
      <span className="logo-mark" aria-hidden="true"><span>NP</span></span>
      <span>NavoPass</span>
    </Link>
  );
}
