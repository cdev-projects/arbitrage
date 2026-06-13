'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav>
      <Link href="/" className="nav-brand">Card Trading Engine</Link>
      <div className="nav-links">
        <Link href="/watchlist" className={pathname === '/watchlist' ? 'active' : ''}>
          Watch list
        </Link>
        <Link href="/scan" className={pathname === '/scan' ? 'active' : ''}>
          Scan
        </Link>
        <Link href="/dashboard" className={pathname === '/dashboard' ? 'active' : ''}>
          Dashboard
        </Link>
      </div>
    </nav>
  );
}
