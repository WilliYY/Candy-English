import type { Metadata } from "next";
import Link from "next/link";
import {
  ChevronRight,
  Cookie,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Privacidade e cookies",
  description:
    "Saiba como a Candy English protege dados pessoais, usa cookies essenciais e respeita os direitos de alunos, responsaveis e equipe.",
};

const quickLinks = [
  ["Dados tratados", "#dados"],
  ["Crianças e adolescentes", "#menores"],
  ["Catty e inteligência artificial", "#inteligencia-artificial"],
  ["Cookies e armazenamento", "#cookies"],
  ["Retenção e segurança", "#seguranca"],
  ["Seus direitos", "#direitos"],
] as const;

const storageItems = [
  {
    name: "Cookies de autenticação e segurança",
    purpose:
      "Mantêm o login, protegem formulários e ajudam a impedir uso indevido da sessão.",
    duration: "Sessão ou prazo técnico do provedor de autenticação.",
  },
  {
    name: "Contador agregado de visitas",
    purpose:
      "Evita contar a mesma visita repetidamente em um intervalo curto e mostra o total público do site.",
    duration: "Permanece no navegador até a limpeza dos dados do site.",
  },
  {
    name: "Preferências da interface do AVA",
    purpose:
      "Lembram avisos já vistos e escolhas exclusivamente visuais do próprio dispositivo.",
    duration: "Permanece até a limpeza dos dados do site ou mudança do aviso.",
  },
  {
    name: "Cópia de segurança de atividade",
    purpose:
      "Ajuda a recuperar respostas ainda não entregues quando a conexão ou a página falha. O servidor continua sendo a cópia principal.",
    duration:
      "Até 7 dias após a última alteração; também é apagada ao entregar a atividade ou sair do AVA.",
  },
] as const;

const trustCards = [
  {
    icon: ShieldCheck,
    text: "Seus dados não são comercializados.",
    title: "Sem venda de dados",
  },
  {
    icon: LockKeyhole,
    text: "Cada perfil vê somente o que sua função permite.",
    title: "Acesso controlado",
  },
  {
    icon: UserRoundCheck,
    text: "Há um canal direto para dúvidas e solicitações.",
    title: "Você no controle",
  },
] as const;

function LegalSection({
  children,
  id,
  title,
}: Readonly<{
  children: React.ReactNode;
  id: string;
  title: string;
}>) {
  return (
    <section
      id={id}
      className="scroll-mt-28 border-b border-primary/10 py-8 first:pt-0 last:border-b-0 last:pb-0 sm:py-10"
    >
      <h2 className="text-balance text-2xl font-black tracking-tight text-primary sm:text-3xl">
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-[0.98rem] leading-7 text-foreground/76 sm:text-base">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="relative isolate overflow-hidden bg-[#fff9fc] text-foreground">
      <section className="relative overflow-hidden border-b border-white/15 bg-primary text-white">
        <div className="candy-kinetic-grid absolute inset-0 opacity-40" />
        <div
          aria-hidden="true"
          className="absolute -right-32 -top-40 size-[28rem] rounded-full bg-accent/20 blur-3xl"
        />
        <div className="relative mx-auto grid w-full max-w-7xl gap-8 px-6 py-16 sm:py-20 lg:grid-cols-[1fr_20rem] lg:items-end lg:px-8">
          <div className="max-w-4xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-white/85">
              <ShieldCheck aria-hidden="true" className="size-4" />
              Privacidade e segurança
            </span>
            <h1 className="mt-6 text-balance text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Seus dados merecem clareza e cuidado.
            </h1>
            <p className="mt-5 max-w-3xl text-pretty text-base leading-8 text-white/76 sm:text-lg">
              Este aviso explica quais dados a Candy English utiliza, por que
              eles são necessários e como alunos, responsáveis e equipe podem
              exercer seus direitos.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200/35 bg-emerald-50/95 p-5 text-emerald-950 shadow-xl shadow-black/10">
            <p className="flex items-center gap-2 text-sm font-black">
              <Cookie aria-hidden="true" className="size-5" />
              Situação atual dos cookies
            </p>
            <p className="mt-2 text-sm leading-6 text-emerald-900/80">
              Usamos somente recursos técnicos e essenciais. Não usamos cookies
              de publicidade nem rastreamento comportamental nesta versão.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-6 pb-64 pt-10 lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start lg:px-8">
        <aside className="rounded-2xl border border-primary/12 bg-white p-4 shadow-[0_18px_50px_rgb(44_19_56_/_0.08)] lg:sticky lg:top-28">
          <p className="px-2 text-xs font-black uppercase tracking-[0.16em] text-primary/55">
            Nesta página
          </p>
          <nav aria-label="Seções de privacidade" className="mt-3 grid gap-1">
            {quickLinks.map(([label, href]) => (
              <Link
                key={href}
                className="flex min-h-11 items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm font-bold text-primary/78 transition hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
                href={href}
              >
                {label}
                <ChevronRight aria-hidden="true" className="size-4 shrink-0" />
              </Link>
            ))}
          </nav>
          <div className="mt-4 border-t border-primary/10 px-2 pt-4 text-xs leading-5 text-muted-foreground">
            Última atualização: 3 de setembro de 2026.
          </div>
        </aside>

        <article className="min-w-0 rounded-2xl border border-primary/12 bg-white p-5 shadow-[0_18px_50px_rgb(44_19_56_/_0.08)] sm:p-8 lg:p-10">
          <div className="mb-10 grid gap-3 sm:grid-cols-3">
            {trustCards.map(({ icon: Icon, text, title }) => (
              <div
                key={title}
                className="rounded-xl border border-primary/10 bg-primary/[0.025] p-4"
              >
                <Icon aria-hidden="true" className="size-5 text-primary" />
                <strong className="mt-3 block text-sm text-primary">
                  {title}
                </strong>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {text}
                </p>
              </div>
            ))}
          </div>

          <LegalSection id="controladora" title="Quem cuida dos dados">
            <p>
              A <strong>Candy English</strong>, operação educacional com atuação
              nos polos de Ivaté e Douradina, é responsável pelas decisões sobre
              o tratamento de dados pessoais no site e no AVA.
            </p>
            <p>
              O canal de privacidade é o e-mail{" "}
              <a
                className="font-bold text-primary underline decoration-primary/25 underline-offset-4 hover:decoration-primary"
                href="mailto:candyenglishbr@gmail.com?subject=Privacidade%20e%20dados%20pessoais"
              >
                candyenglishbr@gmail.com
              </a>
              . Para facilitar o atendimento, use o assunto “Privacidade e dados
              pessoais”.
            </p>
          </LegalSection>

          <LegalSection id="dados" title="Quais dados tratamos e para quê">
            <p>
              Conforme a relação com a Candy English, podemos utilizar dados de
              identificação e contato, cadastro do aluno e do responsável,
              unidade, nível e rotina de estudos, aulas, homework, mensagens,
              contratos, mensalidades, compras internas, presença e registros da
              equipe.
            </p>
            <p>
              Também tratamos dados técnicos mínimos de login, sessão, aparelho e
              segurança para autenticar usuários, impedir fraude, investigar
              falhas e manter o AVA disponível. Senhas são armazenadas somente em
              formato protegido, e as senhas atuais não ficam visíveis no painel.
            </p>
            <p>
              Os dados são usados para prestar e organizar o serviço educacional,
              atender solicitações, cumprir contratos e obrigações legais,
              proteger contas e melhorar o funcionamento do sistema. A base legal
              aplicável pode incluir execução de contrato, procedimentos
              preliminares, obrigação legal, exercício regular de direitos,
              legítimo interesse avaliado e consentimento quando necessário.
            </p>
          </LegalSection>

          <LegalSection id="menores" title="Crianças, adolescentes e responsáveis">
            <p>
              O tratamento de dados de crianças e adolescentes deve respeitar seu
              melhor interesse. Quando o aluno for menor, a Candy English poderá
              solicitar dados do responsável e as autorizações necessárias para
              cadastro, aulas, comunicação e uso do AVA.
            </p>
            <p>
              Responsáveis podem pedir esclarecimentos, acesso ou correção dos
              dados pelo canal de privacidade. A Catty não deve receber documentos,
              senhas, informações de pagamento, endereço completo ou outros dados
              sensíveis em mensagens.
            </p>
          </LegalSection>

          <LegalSection
            id="inteligencia-artificial"
            title="Catty, inteligência artificial e serviços externos"
          >
            <p>
              Quando uma pessoa usa o chat da Catty, a mensagem digitada, o
              histórico recente da própria conversa e um contexto educacional
              limitado — como primeiro nome, perfil e nível — podem ser
              processados por provedores de inteligência artificial, atualmente
              Gemini ou OpenAI, para gerar a resposta.
            </p>
            <p>
              Dados financeiros, contratos, documentos, senhas, chaves e
              credenciais não fazem parte do contexto permitido da Catty. Ainda
              assim, não envie informações confidenciais no campo de conversa.
            </p>
            <p>
              Aulas ao vivo podem utilizar Jitsi. Ao escolher contato por WhatsApp
              ou Instagram, os dados passam também a seguir as políticas dessas
              plataformas. Alguns fornecedores podem processar dados fora do
              Brasil; nesses casos, a Candy English aplica os controles e
              salvaguardas cabíveis à relação com o fornecedor.
            </p>
          </LegalSection>

          <LegalSection id="cookies" title="Cookies e armazenamento no dispositivo">
            <p>
              Cookies são pequenos registros usados pelo navegador. O AVA utiliza
              cookies essenciais para autenticação, proteção contra falsificação
              de requisições e continuidade da sessão. Como são necessários ao
              serviço solicitado, não há banner de “aceitar tudo” nesta versão.
            </p>
            <div className="overflow-hidden rounded-xl border border-primary/12">
              <dl className="divide-y divide-primary/10">
                {storageItems.map((item) => (
                  <div
                    key={item.name}
                    className="grid gap-2 bg-white p-4 sm:grid-cols-[1.15fr_1.65fr_1fr] sm:gap-4"
                  >
                    <div>
                      <dt className="text-sm font-black text-primary">
                        {item.name}
                      </dt>
                      <dd className="mt-1 text-xs font-bold uppercase tracking-[0.1em] text-primary/45 sm:hidden">
                        Finalidade
                      </dd>
                    </div>
                    <dd className="text-sm leading-6 text-foreground/72">
                      {item.purpose}
                    </dd>
                    <dd className="text-sm leading-6 text-muted-foreground">
                      {item.duration}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
            <p>
              Se cookies opcionais de análise ou publicidade forem adicionados no
              futuro, eles ficarão desligados até uma escolha clara, com opções
              equivalentes para aceitar ou rejeitar os não essenciais.
            </p>
          </LegalSection>

          <LegalSection id="seguranca" title="Retenção, exclusão e segurança">
            <p>
              Guardamos dados pelo tempo necessário à finalidade informada e aos
              prazos legais. Quando uma conta é excluída pela administração, o
              acesso é bloqueado imediatamente e os dados pessoais são mantidos em
              área restrita por até dois anos antes da anonimização programada.
            </p>
            <p>
              Registros que precisem ser preservados por obrigação legal,
              contábil, contratual, trabalhista ou para exercício de direitos podem
              seguir prazo específico. Backups possuem ciclos técnicos próprios e
              não são usados como base ativa do atendimento diário.
            </p>
            <p>
              Utilizamos controle de acesso por perfil, conexão segura, proteção
              de sessão, senhas com hash, autenticação em dois fatores para
              administradores, registros de segurança, backups e monitoramento.
              Nenhum sistema é invulnerável; incidentes relevantes serão tratados
              e comunicados conforme a legislação aplicável.
            </p>
          </LegalSection>

          <LegalSection id="direitos" title="Seus direitos">
            <p>
              O titular ou seu responsável pode solicitar confirmação de
              tratamento, acesso, correção, informação sobre compartilhamento,
              portabilidade quando aplicável, revisão, oposição, anonimização,
              bloqueio ou exclusão de dados desnecessários e revogação de
              consentimento.
            </p>
            <p>
              Algumas solicitações podem exigir confirmação de identidade ou ser
              limitadas por dever legal de conservação. A resposta explicará o
              atendimento realizado ou o motivo de eventual limitação.
            </p>
            <div className="mt-6 flex flex-col gap-3 rounded-xl border border-primary/15 bg-primary/[0.035] p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <strong className="flex items-center gap-2 text-primary">
                  <Mail aria-hidden="true" className="size-5" />
                  Precisa falar sobre seus dados?
                </strong>
                <p className="mt-1 text-sm text-muted-foreground">
                  Envie sua dúvida ou solicitação pelo canal da Candy English.
                </p>
              </div>
              <Button asChild className="shrink-0">
                <a href="mailto:candyenglishbr@gmail.com?subject=Privacidade%20e%20dados%20pessoais">
                  Solicitar atendimento
                </a>
              </Button>
            </div>
          </LegalSection>
        </article>
      </section>
    </div>
  );
}
