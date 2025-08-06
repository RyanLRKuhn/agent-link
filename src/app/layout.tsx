import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AgentLink - Workflow Builder',
  description: 'Build and manage AI agent workflows',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[var(--surface-0)] text-[var(--text-primary)] min-h-screen antialiased`}>
        {children}
      </body>
    </html>
  );
}
