"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { whatsappContactSchema, whatsappSendSchema } from "@/lib/validations/catty-whatsapp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Submit = (action: string, input: unknown) => Promise<boolean>;
export function WhatsappContactForm({ submit, disabled }: { submit: Submit; disabled: boolean }) {
  const form = useForm<z.infer<typeof whatsappContactSchema>>({ resolver: zodResolver(whatsappContactSchema) });
  return <form className="space-y-4" onSubmit={form.handleSubmit(async data => {
    if (await submit("contact", data)) form.reset();
  })}>
    <div className="space-y-2"><label htmlFor="wa-name" className="text-sm font-medium">Nome do contato</label>
      <Input id="wa-name" autoComplete="off" maxLength={100} {...form.register("name")} aria-invalid={Boolean(form.formState.errors.name)} />
      {form.formState.errors.name && <p className="text-sm text-destructive" role="alert">Informe um nome entre 2 e 100 caracteres.</p>}</div>
    <div className="space-y-2"><label htmlFor="wa-phone" className="text-sm font-medium">WhatsApp com país e DDD</label>
      <Input id="wa-phone" type="tel" placeholder="+55 (44) 99999-9999" autoComplete="off" maxLength={30} {...form.register("phone")} aria-invalid={Boolean(form.formState.errors.phone)} />
      {form.formState.errors.phone && <p className="text-sm text-destructive" role="alert">{form.formState.errors.phone.message}</p>}</div>
    <label className="flex items-start gap-3 text-sm leading-relaxed"><input type="checkbox" className="mt-1 size-4 accent-primary" {...form.register("consent")} />
      Este contato autorizou receber mensagens e sabe que a Catty usa IA. Um novo cadastro também confirma uma nova autorização.</label>
    {form.formState.errors.consent && <p className="text-sm text-destructive" role="alert">{form.formState.errors.consent.message}</p>}
    <Button type="submit" disabled={disabled || form.formState.isSubmitting}>Autorizar contato</Button>
  </form>;
}

export function WhatsappSendForm({ contacts, submit, disabled }: { contacts: { id: string; name: string; phoneMask: string }[]; submit: Submit; disabled: boolean }) {
  const form = useForm<z.infer<typeof whatsappSendSchema>>({ resolver: zodResolver(whatsappSendSchema) });
  return <form className="space-y-4" onSubmit={async event => {
    // Keep the same operationId on an uncertain HTTP response; reset only on success.
    if (!form.getValues("operationId")) form.setValue("operationId", crypto.randomUUID());
    await form.handleSubmit(async data => { if (await submit("send", data)) form.reset(); })(event);
  }}>
    <div className="space-y-2"><label htmlFor="wa-recipient" className="text-sm font-medium">Destinatário autorizado</label>
      <select id="wa-recipient" className="h-11 w-full rounded-lg border bg-background px-3 text-sm" {...form.register("contactId")}>
        <option value="">Selecione uma pessoa</option>
        {contacts.map(contact => <option key={contact.id} value={contact.id}>{contact.name} · {contact.phoneMask}</option>)}
      </select>
      {form.formState.errors.contactId && <p className="text-sm text-destructive" role="alert">Selecione um contato.</p>}</div>
    <div className="space-y-2"><label htmlFor="wa-text" className="text-sm font-medium">Mensagem individual</label>
      <Textarea id="wa-text" rows={5} maxLength={1000} placeholder="Escreva a mensagem para esta pessoa…" {...form.register("text")} />
      <p className="text-xs text-muted-foreground">Até 1.000 caracteres. A orientação para sair é incluída automaticamente.</p>
      {form.formState.errors.text && <p className="text-sm text-destructive" role="alert">Escreva uma mensagem de até 1.000 caracteres.</p>}</div>
    <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1 size-4 accent-primary" {...form.register("confirmed")} />Conferi o destinatário e autorizo o envio desta mensagem.</label>
    {form.formState.errors.confirmed && <p className="text-sm text-destructive" role="alert">Confirme antes de enviar.</p>}
    <Button type="submit" disabled={disabled || !contacts.length || form.formState.isSubmitting}>Adicionar à fila</Button>
  </form>;
}
