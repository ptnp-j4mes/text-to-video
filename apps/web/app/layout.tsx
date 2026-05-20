import "./globals.css";

import { Toaster } from "sonner";

export const metadata = {
  title: "AI Voice Avatar",
  description: "Local-first voice cloning and talking avatar workflow",
};

type LayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: LayoutProps) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}

