import { CheckCircle2 } from "lucide-react";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { SignOutButton } from "@/components/ava/sign-out-button";
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Usuario logado</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="flex flex-col gap-4 text-sm">
              <div className="flex flex-col gap-1">
                <dt className="text-muted-foreground">Nome</dt>
                <dd className="font-medium">{user.name ?? "Sem nome"}</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-muted-foreground">Email</dt>
                <dd className="font-medium">{user.email}</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-muted-foreground">Role</dt>
                <dd className="font-medium">{ROLE_LABELS[user.role]}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

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
