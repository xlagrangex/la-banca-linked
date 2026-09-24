import type { Metadata } from "next";
import { Poppins, Inter, Playfair_Display, Space_Grotesk, DM_Serif_Display } from "next/font/google";
import Script from "next/script";
import { Toaster } from "sonner";
import AppShell from "@/components/app/AppShell";
import "./globals.css";

const poppins = Poppins({ variable: "--font-poppins", subsets: ["latin"], weight: ["300", "400", "500", "600", "700", "800"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], weight: ["300", "400", "500", "600", "700", "800"] });
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"], weight: ["400", "600", "700", "800"] });
const grotesk = Space_Grotesk({ variable: "--font-grotesk", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const dmSerif = DM_Serif_Display({ variable: "--font-dmserif", subsets: ["latin"], weight: ["400"] });

export const metadata: Metadata = {
  title: "La banca Linked — banca contenuti LinkedIn",
  description: "Idee, contenuti, piano editoriale, immagini e grafiche per LinkedIn.",
  robots: "noindex, nofollow",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it">
      <body
        className={`${poppins.variable} ${inter.variable} ${playfair.variable} ${grotesk.variable} ${dmSerif.variable} antialiased`}
      >
        {process.env.NODE_ENV === "development" && (
          <Script src="https://unpkg.com/react-scan/dist/auto.global.js" strategy="beforeInteractive" crossOrigin="anonymous" />
        )}
        <AppShell>{children}</AppShell>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
