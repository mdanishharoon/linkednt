import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Signing in — linkedn't",
  description: "Sign-in relay for the linkedn't extension.",
  robots: { index: false, follow: false },
};

export default function AuthCallbackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
