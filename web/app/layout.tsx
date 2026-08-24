import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const baseMetadata: Metadata = {
  applicationName: "30 Days to Italy",
  title: "30 Days to Italy — private trip rehearsal",
  description:
    "A personalized vacation rehearsal for practical independence in Italy.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "30 Days",
  },
  openGraph: {
    title: "30 Days to Italy",
    description: "Rehearse your trip before you take it.",
    type: "website",
    images: [{ url: "/og.png", width: 1729, height: 910, alt: "Italian coastal trip rehearsal" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "30 Days to Italy",
    description: "Rehearse your trip before you take it.",
    images: ["/og.png"],
  },
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

function requestOrigin(host: string | null, forwardedProtocol: string | null): URL {
  const cleanHost = host?.split(",")[0]?.trim() || "localhost:3000";
  const requestedProtocol = forwardedProtocol?.split(",")[0]?.trim();
  const protocol = requestedProtocol === "http" || requestedProtocol === "https"
    ? requestedProtocol
    : cleanHost.startsWith("localhost") || cleanHost.startsWith("127.")
      ? "http"
      : "https";

  try {
    if (/[\\/@?#\s]/.test(cleanHost)) throw new TypeError("Invalid forwarded host syntax");
    return new URL(`${protocol}://${cleanHost}`);
  } catch (error) {
    console.warn("[30-days-to-italy] metadata origin fallback", {
      code: "INVALID_REQUEST_ORIGIN",
      causeType: error instanceof Error ? error.name : typeof error,
    });
    return new URL("http://localhost:3000");
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  return {
    ...baseMetadata,
    metadataBase: requestOrigin(
      requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"),
      requestHeaders.get("x-forwarded-proto"),
    ),
  };
}

export const viewport: Viewport = {
  themeColor: "#0f4d52",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/icons/icon-192.png" sizes="192x192" type="image/png" />
        <link rel="icon" href="/icons/icon-512.png" sizes="512x512" type="image/png" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
