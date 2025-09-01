import type React from "react"
import type { Metadata } from "next"
import localFont from "next/font/local"
import "./globals.css"
import { cn } from "@/lib/utils"
import { Analytics } from "@vercel/analytics/next"

const abcDiatype = localFont({
  src: [
    {
      path: './fonts/ABCDiatype-Thin.otf',
      weight: '100',
      style: 'normal',
    },
    {
      path: './fonts/ABCDiatype-Light.otf',
      weight: '300',
      style: 'normal',
    },
    {
      path: './fonts/ABCDiatype-Regular.otf',
      weight: '400',
      style: 'normal',
    },
    {
      path: './fonts/ABCDiatype-Medium.otf',
      weight: '500',
      style: 'normal',
    },
    {
      path: './fonts/ABCDiatype-Bold.otf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-abc-diatype',
  display: 'swap',
})

export const metadata: Metadata = {
  title: "UCR Course Guide",
}

// Footer 
function Footer() {
  return (
    <footer className="relative z-10 mt-auto border-t border-white/10 bg-black/20 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <p className="text-white/80 text-sm">
              UCR Course Guide
            </p>
          </div>
          
          <div className="text-white/60 text-xs">
            <span>Community-driven insights</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={cn(abcDiatype.variable, abcDiatype.className, "bg-background text-foreground flex flex-col min-h-screen")}>
        <div className="flex-grow">
          {children}
        </div>
        <Footer />
        <Analytics />
      </body>
    </html>
  )
}
