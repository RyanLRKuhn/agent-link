import './globals.css';
import { Inter } from 'next/font/google';
import SettingsSidebar from './components/SettingsSidebar';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'AgentLink',
  description: 'Build and manage LLM workflows',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-surface-0 text-text-primary antialiased min-h-screen`}>
        {/* Main App Container */}
        <div className="relative min-h-screen flex flex-col">
          {/* Main Content Layer (Header + Workflow) */}
          <div className="relative z-0 flex flex-col min-h-screen">
            {/* Header */}
            <header className="flex-none h-14 px-4 border-b border-border bg-surface-1">
              <div className="h-full flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold
                    shadow-glow-sm hover:shadow-glow-md transition-all duration-300">
                    A
                  </div>
                  <h1 className="text-xl font-semibold">AgentLink</h1>
                </div>
                <SettingsSidebar />
              </div>
            </header>

            {/* Main Content */}
            <main className="flex-1">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
