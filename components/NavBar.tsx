'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav>
      <Link href="/" className="nav-brand">Card Trading Engine</Link>
      <div className="nav-links">
        <Link href="/deal-finder" className={pathname === '/deal-finder' ? 'active' : ''}>
          Deal finder
        </Link>
        <Link href="/dashboard" className={pathname === '/dashboard' ? 'active' : ''}>
          Dashboard
        </Link>
      </div>
    </nav>
  );
}
