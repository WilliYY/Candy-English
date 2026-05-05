import { CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AvaPlaceholderProps = {
  title: string;
  description: string;
  items: string[];
};

export function AvaPlaceholder({
  title,
  description,
  items,
}: AvaPlaceholderProps) {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12 lg:px-8">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-normal md:text-4xl">
          {title}
        </h1>
        <p className="mt-4 text-lg leading-8 text-muted-foreground">
          {description}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reservado para próximas fases</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {items.map((item) => (
              <li key={item} className="flex items-center gap-3 text-muted-foreground">
                <CheckCircle2 className="text-accent" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}
