import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { auth } from "@/lib/auth";
import { isRole } from "@/lib/roles";

export default async function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const role = session?.user?.role;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader
        sessionUser={
          isRole(role)
            ? {
                name: session?.user?.name ?? null,
                role,
              }
            : null
        }
      />
      <main className="flex-1 overflow-hidden">{children}</main>
      <SiteFooter />
    </div>
  );
}
