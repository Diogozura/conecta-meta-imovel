import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteName = "Scale Estratégia Digital";
const siteDescription =
  "Plataforma de comunicação via WhatsApp Business API para envio de mensagens, gestão de clientes e atendimento em tempo real.";

export const metadata: Metadata = {
  title: {
    default: "Scale | Estratégia Digital",
    template: "%s | Scale Estratégia Digital",
  },
  description: siteDescription,
  keywords: [
    "WhatsApp Business API",
    "atendimento via WhatsApp",
    "mensagens em massa",
    "gestão de clientes",
    "automatização de atendimento",
    "Scale Estratégia Digital",
  ],
  openGraph: {
    title: "Scale | Estratégia Digital",
    description: siteDescription,
    type: "website",
    locale: "pt_BR",
    siteName,
    images: [
      {
        url: "/Logos PNG/Logo.png",
        width: 1200,
        height: 630,
        alt: siteName,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Scale | Estratégia Digital",
    description: siteDescription,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
