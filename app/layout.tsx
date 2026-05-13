import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerInit from "@/components/ServiceWorkerInit";
import ThemeProvider from "@/components/ThemeProvider";
import PushBanner from "@/components/PushBanner";

export const metadata: Metadata = {
  title: "מונדיאל חברים 2026",
  description: "משחק ניחושים פרטי - מונדיאל 2026",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "מונדיאל 2026",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        {/* Prevent flash of wrong theme */}
        <script dangerouslySetInnerHTML={{ __html: `try{var t=JSON.parse(localStorage.getItem('mundial-theme')||'{}');if(t.state&&t.state.theme==='light')document.documentElement.classList.add('light');}catch(e){}` }} />
      </head>
      <body className="bg-c-bg text-c-text antialiased">
        <ThemeProvider>
          <ServiceWorkerInit />
          <PushBanner />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
