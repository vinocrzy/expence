import { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Analytics',
};

export const viewport: Viewport = {
  themeColor: '#8b5cf6',
};

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
