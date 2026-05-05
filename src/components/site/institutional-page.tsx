import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type InstitutionalSection = {
  title: string;
  text: string;
  icon?: LucideIcon;
};

type InstitutionalPageProps = {
  title: string;
  description: string;
  sections: InstitutionalSection[];
};

export function InstitutionalPage({
  title,
  description,
  sections,
}: InstitutionalPageProps) {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-14 lg:px-8">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-normal md:text-5xl">
          {title}
        </h1>
        <p className="mt-5 text-lg leading-8 text-muted-foreground">
          {description}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {sections.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              {section.icon ? (
                <section.icon className="text-primary" aria-hidden="true" />
              ) : null}
              <CardTitle>{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="leading-7 text-muted-foreground">{section.text}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
