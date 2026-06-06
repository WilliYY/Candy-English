import type { CattyArtifactCustomItem } from "@/lib/catty-artifacts";
import { CATTY_LOGGED_IN_BALLOON_TEMPLATES } from "@/lib/catty-personality";

type CattyBalloonArtifact = Pick<
  CattyArtifactCustomItem,
  "catchphrases" | "emojis" | "example" | "label" | "sounds" | "themeId"
>;

function compactBalloonText(value: string, maxLength: number) {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function capitalizeSoft(value: string) {
  const cleaned = compactBalloonText(value, 34);

  return cleaned ? `${cleaned[0]?.toUpperCase()}${cleaned.slice(1)}` : "";
}

function pickFirstSafe(items: string[], fallback = "") {
  return compactBalloonText(
    items.find((item) => item.trim().length > 0) ?? fallback,
    40,
  );
}

function formatNameEmoji(name: string, emoji: string) {
  const cleanName = compactBalloonText(name, 24);

  return emoji ? `${cleanName} ${emoji}` : cleanName;
}

function renderGenericLoggedInBalloon(input: {
  greeting: string;
  name: string;
  template: string;
}) {
  return input.template
    .replace(/\{name\}/g, input.name)
    .replace(/\{greeting\}/g, input.greeting);
}

export function buildCattyArtifactBalloonTemplates(input: {
  artifact: CattyBalloonArtifact;
  name: string;
}) {
  const label = compactBalloonText(input.artifact.label, 34);
  const theme = compactBalloonText(input.artifact.themeId, 34);
  const emoji = pickFirstSafe(input.artifact.emojis, "\u2728");
  const sound = pickFirstSafe(input.artifact.sounds);
  const soundOpening = capitalizeSoft(sound);
  const catchphrase =
    pickFirstSafe(input.artifact.catchphrases) ||
    `modo ${label || theme || "Candy"}`;
  const secondCatchphrase =
    input.artifact.catchphrases.find((item) => item !== catchphrase) ??
    catchphrase;
  const example = compactBalloonText(input.artifact.example ?? "", 58);
  const nameWithEmoji = formatNameEmoji(input.name, emoji);
  const themeLabel = label || theme || "Candy";

  return [
    soundOpening
      ? `${soundOpening}, ${nameWithEmoji}! Vamos acelerar esse English?`
      : `Miauw, ${nameWithEmoji}! ${catchphrase}: vamos praticar English?`,
    `Awnn, ${nameWithEmoji} ${catchphrase}: uma missao por vez.`,
    `Uwau, ${nameWithEmoji} ${secondCatchphrase}: checkpoint do dia, praticar uma frase.`,
    `Pss pss, ${nameWithEmoji} energia de ${themeLabel}: a Catty ta online.`,
    `${input.name}, ${catchphrase} ${emoji}: uma frase por vez ja conta.`,
    example
      ? `${input.name}, passinho tranquilo ${emoji} tenta repetir: ${example}`
      : `${input.name}, passinho tranquilo ${emoji} manda uma frase curtinha.`,
    `Miauw, ${nameWithEmoji} bora transformar ${themeLabel} em English?`,
    `Catty mode on, ${nameWithEmoji}. ${secondCatchphrase} e foco no estudo.`,
  ]
    .map((template) => compactBalloonText(template, 150))
    .filter((template) => template.length > 0);
}

export function buildCattyLoggedInBalloonPool(input: {
  artifacts?: CattyBalloonArtifact[];
  greeting: string;
  name: string;
}) {
  const genericBalloons = CATTY_LOGGED_IN_BALLOON_TEMPLATES.map((template) =>
    renderGenericLoggedInBalloon({
      greeting: input.greeting,
      name: input.name,
      template,
    }),
  );
  const artifactBalloons = (input.artifacts ?? [])
    .slice(0, 3)
    .flatMap((artifact) =>
      buildCattyArtifactBalloonTemplates({
        artifact,
        name: input.name,
      }),
    );

  if (artifactBalloons.length === 0) {
    return genericBalloons;
  }

  const genericBreaks = genericBalloons
    .filter((_, index) => index % 5 === 0)
    .slice(0, 8);

  return [...artifactBalloons, ...genericBreaks];
}

export function pickCattyLoggedInBalloon(input: {
  artifacts?: CattyBalloonArtifact[];
  current?: string;
  greeting: string;
  name: string;
}) {
  const pool = buildCattyLoggedInBalloonPool(input);
  const available = pool.filter((balloon) => balloon !== input.current);
  const candidates = available.length > 0 ? available : pool;

  return candidates[Math.floor(Math.random() * candidates.length)] ?? "";
}
