import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { CartProvider } from "./context/CartContext";
import AuthProvider from "./components/AuthProvider";
import AssistantChatWidget from "./components/AssistantChatWidget";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Happy Shopping | Everything for Your Family",
  description:
    "Happy Shopping is your one-stop shop for baby essentials, men's and women's fashion, and everything in between.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <CartProvider>
            {children}
            <AssistantChatWidget />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
