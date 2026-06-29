import type { Metadata } from "next";
import { Poppins, Inter } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Dra. Evely Sarmento — Fisioterapeuta",
  description: "Fisioterapeuta especialista · Espaço Passinho",
  openGraph: {
    title: "Dra. Evely Sarmento",
    description: "Fisioterapeuta",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630 }],
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dra. Evely Sarmento",
    description: "Fisioterapeuta",
    images: ["/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${poppins.variable} ${inter.variable} h-full`}>
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/tabler-icons/2.44.0/iconfont/tabler-icons.min.css" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
