"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { updateSiteContent } from "@/app/ava/admin/actions";
import {
  adminSiteContentSchema,
  type AdminSiteContentInput,
} from "@/lib/validations/admin-users";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

type SiteContentRow = {
  ctaLabel: string | null;
  description: string;
  slug: AdminSiteContentInput["slug"];
  title: string;
};

const defaults: Record<AdminSiteContentInput["slug"], SiteContentRow> = {
  contato: {
    ctaLabel: "Falar com a Candy",
    description:
      "Fale com a Candy English para alinhar objetivos, rotina e melhor formato de aula.",
    slug: "contato",
    title: "Vamos montar seu plano de ingles.",
  },
  home: {
    ctaLabel: "Comecar conversa",
    description:
      "Aulas personalizadas com materiais, vocabulario, homework online e feedback em um AVA proprio.",
    slug: "home",
    title: "Fale ingles com clareza, rotina e feedback.",
  },
  metodologia: {
    ctaLabel: "Conhecer planos",
    description:
      "A metodologia combina aula personalizada, pratica entre encontros e feedback registrado.",
    slug: "metodologia",
    title: "Um metodo feito para transformar aula em continuidade.",
  },
  planos: {
    ctaLabel: "Solicitar plano",
    description:
      "Planos para rotina individual, reforco e acompanhamento com feedback.",
    slug: "planos",
    title: "Planos simples para uma rotina consistente.",
  },
  sobre: {
    ctaLabel: "Falar com a Candy",
    description:
      "A Candy English une aula humana, organizacao digital e acompanhamento proximo.",
    slug: "sobre",
    title: "Uma escola digital pequena, humana e organizada.",
  },
};

function toFormValues(content: SiteContentRow): AdminSiteContentInput {
  return {
    ctaLabel: content.ctaLabel ?? "",
    description: content.description,
    slug: content.slug,
    title: content.title,
  };
}

export function AdminSiteContentForm({
  contents,
}: {
  contents: SiteContentRow[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const bySlug = useMemo(
    () =>
      contents.reduce<Record<string, SiteContentRow>>((accumulator, content) => {
        accumulator[content.slug] = content;
        return accumulator;
      }, {}),
    [contents],
  );
  const form = useForm<AdminSiteContentInput>({
    defaultValues: toFormValues(defaults.home),
    resolver: zodResolver(adminSiteContentSchema),
  });
  const slug = form.watch("slug");

  useEffect(() => {
    const selected = bySlug[slug] ?? defaults[slug];
    form.reset(toFormValues(selected));
  }, [bySlug, form, slug]);

  const onSubmit = form.handleSubmit((values) => {
    setMessage(null);
    startTransition(async () => {
      const result = await updateSiteContent(values);

      if (!result.ok) {
        Object.entries(result.errors ?? {}).forEach(([field, fieldMessage]) => {
          if (fieldMessage) {
            form.setError(field as keyof AdminSiteContentInput, {
              message: fieldMessage,
            });
          }
        });
        setMessage(result.message);
        return;
      }

      setMessage(result.message);
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <FieldGroup>
        <Field data-invalid={Boolean(form.formState.errors.slug)}>
          <FieldLabel htmlFor="site-slug">Pagina</FieldLabel>
          <NativeSelect
            id="site-slug"
            aria-invalid={Boolean(form.formState.errors.slug)}
            disabled={isPending}
            {...form.register("slug")}
          >
            <option value="home">Home</option>
            <option value="sobre">Sobre</option>
            <option value="metodologia">Metodologia</option>
            <option value="planos">Planos</option>
            <option value="contato">Contato</option>
          </NativeSelect>
          <FieldError errors={[form.formState.errors.slug]} />
        </Field>

        <Field data-invalid={Boolean(form.formState.errors.title)}>
          <FieldLabel htmlFor="site-title">Titulo principal</FieldLabel>
          <Input
            id="site-title"
            aria-invalid={Boolean(form.formState.errors.title)}
            disabled={isPending}
            {...form.register("title")}
          />
          <FieldError errors={[form.formState.errors.title]} />
        </Field>

        <Field data-invalid={Boolean(form.formState.errors.description)}>
          <FieldLabel htmlFor="site-description">Descricao</FieldLabel>
          <Textarea
            id="site-description"
            aria-invalid={Boolean(form.formState.errors.description)}
            disabled={isPending}
            {...form.register("description")}
          />
          <FieldError errors={[form.formState.errors.description]} />
        </Field>

        <Field data-invalid={Boolean(form.formState.errors.ctaLabel)}>
          <FieldLabel htmlFor="site-cta">Texto do botao</FieldLabel>
          <Input
            id="site-cta"
            aria-invalid={Boolean(form.formState.errors.ctaLabel)}
            disabled={isPending}
            {...form.register("ctaLabel")}
          />
          <FieldError errors={[form.formState.errors.ctaLabel]} />
        </Field>
      </FieldGroup>

      {message ? (
        <p className="rounded-lg border bg-muted px-4 py-3 text-sm text-muted-foreground">
          {message}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? (
          <LoaderCircle data-icon="inline-start" className="animate-spin" />
        ) : (
          <Save data-icon="inline-start" />
        )}
        Salvar conteudo
      </Button>
    </form>
  );
}
