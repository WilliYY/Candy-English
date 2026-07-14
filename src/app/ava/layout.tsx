export default function AvaLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="min-h-screen overflow-x-hidden">{children}</div>;
}
