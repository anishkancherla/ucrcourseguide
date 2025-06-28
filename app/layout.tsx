import type React from "react"
import type { Metadata } from "next"
import localFont from "next/font/local"
import "./globals.css"
import { cn } from "@/lib/utils"

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={cn(abcDiatype.variable, abcDiatype.className, "bg-background text-foreground")}>{children}</body>
    </html>
  )
}
