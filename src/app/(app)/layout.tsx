import { redirect } from "next/navigation";
import { getUser } from "@/lib/require-user";
import { Providers } from "@/components/providers";
import { Sidebar, MobileHeader, MobileNav } from "@/components/app/sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) redirect("/login");

  const appUser = { name: user.name, email: user.email };

  return (
    <Providers>
      <div className="min-h-dvh">
        <Sidebar user={appUser} />
        <MobileHeader user={appUser} />
        <main className="px-4 pb-24 pt-6 md:ml-60 md:px-8 md:pb-10">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
        <MobileNav />
      </div>
    </Providers>
  );
}
