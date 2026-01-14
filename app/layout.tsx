import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'stakeholder update generator',
  description: 'turn raw notes into a stakeholder-ready update'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
