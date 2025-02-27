'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { useEffect, useState } from 'react';

type ProvidersProps = {
  children: React.ReactNode;
};

/**
 * Application providers component that wraps the entire app
 * Provides theme support and other global context providers
 */
export function Providers({ children }: ProvidersProps) {
  // Add system preference detection for enhanced theme handling
  const [mounted, setMounted] = useState(false);
  
  // Effect to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {/* Only render children when mounted to prevent hydration mismatch */}
      {mounted && children}
      
      {/* Global toast notifications */}
      <Toaster />
    </ThemeProvider>
  );
}
