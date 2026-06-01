import type { Metadata } from 'next';
import './globals.css';
import NavBar from '@/components/NavBar';

const FONT_URL =
  'https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;1,9..144,300&family=DM+Sans:wght@300;400;500&display=swap';
const TABLER_URL =
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.10.0/dist/tabler-icons.min.css';

export const metadata: Metadata = {
  title: 'Card Trading Engine',
  description: 'Discover underpriced trading cards and generate optimised eBay listings',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href={FONT_URL} rel="stylesheet" />
        <link href={TABLER_URL} rel="stylesheet" />
      </head>
      <body>
        <NavBar />
        {children}
      </body>
    </html>
  );
}
