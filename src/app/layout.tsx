import type { Metadata } from "next";
import Script from "next/script";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "CampusFix — A Smarter Campus Starts With You",
    template: "%s | CampusFix",
  },
  description:
    "Report campus problems, track resolutions, participate in community verification, and help make your university a better place for everyone.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      data-theme="light"
      suppressHydrationWarning
    >
      <body>
        <Script
          id="campusfix-theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{var saved=localStorage.getItem("campusfix-theme");var theme=saved==="dark"||saved==="light"?saved:(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.setAttribute("data-theme",theme)}catch(error){console.warn("CampusFix could not restore the saved theme preference:",error)}})()',
          }}
        />
        {children}
      </body>
    </html>
  );
}
