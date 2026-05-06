import { CheckCircle2 } from "lucide-react";
import type { Role } from "@/lib/roles";
import { SignOutButton } from "@/components/ava/sign-out-button";
import { UserSummaryPanel } from "@/components/ava/user-summary-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AvaDashboardUser = {
  email: string;
  id: string;
  name?: string | null;
  role: Role;
};

type AvaDashboardProps = {
  description: string;
  items: string[];
  title: string;
  user: AvaDashboardUser;
};

export function AvaDashboard({
  description,
  items,
  title,
  user,
}: AvaDashboardProps) {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12 lg:px-8">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-normal md:text-4xl">
            {title}
          </h1>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            {description}
          </p>
        </div>
        <SignOutButton />
      </div>

      <UserSummaryPanel email={user.email} name={user.name} role={user.role} />

      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Base da area</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {items.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-3 text-muted-foreground"
                >
                  <CheckCircle2 className="text-accent" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
