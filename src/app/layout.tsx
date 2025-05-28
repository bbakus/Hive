
import type {Metadata} from 'next';
import {Geist, Geist_Mono} from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/contexts/ThemeContext'; // Added import

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'HIVE - Event Management System',
  description: 'Modular Event Management and Production Workflow System',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning> {/* Removed className="dark", added suppressHydrationWarning */}
      <body className={cn(
        geistSans.variable,
        geistMono.variable,
        "antialiased font-sans"
        )}>
        <ThemeProvider
          defaultTheme="dark"
          storageKey="hive-theme"
        >
          {children}
          <Toaster />
        </ThemeProvider>
        {/*
          In a real application, you would include the Google Maps API script here.
          Replace YOUR_API_KEY with your actual Google Maps API key.
          Ensure the "Places" library is loaded.
          Example:
          <script
            async
            defer
            src={`https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places&callback=initMap`}
          ></script>
          You might also need a global initMap function if not handled by a library.
        */}
      </body>
    </html>
  );
}
