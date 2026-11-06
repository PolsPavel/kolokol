// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "../components/ToastProvider";
import { AuthProvider } from "../components/AuthProvider";

// Шрифт для интерфейса (чистый, современный)
const inter = Inter({ 
  variable: "--font-inter", 
  subsets: ["latin", "cyrillic"] 
});

// Шрифт для заголовков (строгий, с засечками)
const playfair = Playfair_Display({ 
  variable: "--font-playfair", 
  subsets: ["latin", "cyrillic"] 
});

export const metadata: Metadata = {
  title: "KoloKol — Голосовые роботы для B2B",
  description: "Автоматизируйте холодные звонки с помощью ИИ-роботов.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${inter.variable} ${playfair.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#0a0a0a] text-gray-200 font-sans selection:bg-[#FACC15] selection:text-black">
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}