```tsx
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

export const metadata: Metadata = {
  title: {
    default: "نظام إدارة المعاهد الأزهرية",
    template: "%s | نظام إدارة المعاهد الأزهرية",
  },
  description:
    "منصة الإدارة والمتابعة المركزية للمعاهد الأزهرية",
  applicationName: "نظام إدارة المعاهد الأزهرية",
  keywords: [
    "المعاهد الأزهرية",
    "الإدارة التعليمية الأزهرية",
    "إدارة الطلاب",
    "إدارة المدرسين",
    "الحضور والغياب",
    "التقارير",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen bg-slate-100 text-slate-800">
        {children}
      </body>
    </html>
  );
}
```
