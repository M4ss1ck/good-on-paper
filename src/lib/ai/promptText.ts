import type { AppLocale } from "../../i18n";

/**
 * Prompt text, kept out of the Lingui catalogs on purpose: it is long,
 * whitespace-sensitive and structural (the handoff prompt embeds a JSON schema).
 * A translator editing this in a .po file would silently break the output format.
 *
 * The BYOK prompts always use the `en` entry — they are machine-facing and never
 * shown to the user. The handoff prompt is rendered in the app UI locale, because
 * the user reads it and iterates on it in their own chat tool.
 */
export interface PromptText {
  precedence: string;
  factualRules: string;
  targeting: string;
  cvLabel: string;
  jobOfferLabel: string;
  additionalContextLabel: string;
  handoffIntro: string;
  handoffIdRule: string;
  handoffContentLanguage: (language: string) => string;
  handoffSchemaIntro: string;
  handoffOutputRule: string;
}

const en: PromptText = {
  precedence: `Follow this order of precedence, highest first:
1. Explicit instructions the candidate wrote under "Additional context and instructions".
2. Facts: what the CV states, plus facts the candidate explicitly supplied in Additional context.
3. The job offer, which decides what to emphasise and which wording is most valuable.
4. General CV-writing heuristics, last.`,

  factualRules: `Factual rules:
- Never introduce a factual claim unless it is supported by the CV or explicitly stated by the candidate in Additional context. This covers technologies, years of experience, metrics, percentages, revenue, performance gains, team sizes, responsibilities, job titles, seniority, certifications, employers, dates, achievements, projects and business outcomes.
- Facts the candidate supplied in Additional context are valid evidence and you may use them. Do not extrapolate them. If the candidate says "I have used AWS professionally", you may mention AWS where it fits; you may not write "architected highly available AWS infrastructure serving millions of requests".
- Never change dates.
- If you cannot support a change with the CV or Additional context, leave the text alone.`,

  targeting: `Adapt this CV specifically for the job offer below. Read the entire offer and identify its technologies, required skills, responsibilities, domain terminology, role terminology, soft skills and seniority signals. Then maximise truthful overlap with that language:
- surface supported matching experience more explicitly
- reuse the employer's terminology when it is factually equivalent to the candidate's own wording
- prioritise the most relevant experience
- make relevant technologies easy to notice
- align the summary with what the offer actually asks for
- de-emphasise irrelevant detail where that helps
Do not rewrite text merely to make it sound more impressive. Relevance beats polish. Avoid filler like "leveraging", "passionate" or "results-driven". Do not use em dashes. Write like a person, not like an AI.`,

  cvLabel: "CV",
  jobOfferLabel: "Job offer",
  additionalContextLabel: "Additional context and instructions",

  handoffIntro: `You are helping a candidate adapt their CV to a specific job offer.`,

  handoffIdRule: `Keep the "id" of any section or item you carry over from the original, even if you rewrite its text. Omit "id" for anything you create. Never reuse an id twice. You may reorder sections and items, add sections and items, and drop ones that are not relevant.`,

  handoffContentLanguage: (language) =>
    `The CV is written in ${language}. Write all CV content in ${language}. Do not translate it.`,

  handoffSchemaIntro: `Return a single JSON object with exactly this shape:`,

  handoffOutputRule: `Output only the JSON object. No explanation, no commentary, no markdown code fences. Fill "position" and "company" by reading the job offer; use null if the offer does not state them. Copy "schemaVersion", "source.cvId" and "source.fingerprint" exactly as given above.`,
};

const es: PromptText = {
  precedence: `Sigue este orden de prioridad, de mayor a menor:
1. Las instrucciones explícitas que la persona candidata escribió en "Contexto e instrucciones adicionales".
2. Los hechos: lo que dice el CV, más los hechos que la persona candidata aportó explícitamente en el contexto adicional.
3. La oferta de empleo, que determina qué se debe destacar y qué vocabulario resulta más valioso.
4. Las buenas prácticas generales de redacción de CV, en último lugar.`,

  factualRules: `Reglas sobre los hechos:
- Nunca introduzcas una afirmación factual que no esté respaldada por el CV o declarada explícitamente por la persona candidata en el contexto adicional. Esto incluye tecnologías, años de experiencia, métricas, porcentajes, ingresos, mejoras de rendimiento, tamaños de equipo, responsabilidades, cargos, seniority, certificaciones, empleadores, fechas, logros, proyectos y resultados de negocio.
- Los hechos aportados en el contexto adicional son evidencia válida y puedes usarlos. No los extrapoles. Si la persona dice "he usado AWS profesionalmente", puedes mencionar AWS donde encaje; no puedes escribir "diseñé una infraestructura AWS de alta disponibilidad que atendía millones de peticiones".
- Nunca cambies las fechas.
- Si no puedes respaldar un cambio con el CV o con el contexto adicional, deja el texto como está.`,

  targeting: `Adapta este CV específicamente a la oferta de empleo que aparece más abajo. Lee la oferta completa e identifica sus tecnologías, competencias requeridas, responsabilidades, terminología del dominio, terminología del puesto, habilidades blandas y señales de seniority. Después maximiza la coincidencia veraz con ese lenguaje:
- haz más explícita la experiencia relevante que ya está respaldada
- reutiliza la terminología del empleador cuando sea equivalente a la de la persona candidata
- prioriza la experiencia más relevante
- haz que las tecnologías relevantes sean fáciles de detectar
- alinea el resumen con lo que la oferta pide realmente
- resta protagonismo a los detalles irrelevantes cuando ayude
No reescribas el texto solo para que suene más impresionante. La relevancia importa más que el estilo. Evita muletillas como "apasionado", "orientado a resultados" o "aprovechando". No uses rayas (—). Escribe como una persona, no como una IA.`,

  cvLabel: "CV",
  jobOfferLabel: "Oferta de empleo",
  additionalContextLabel: "Contexto e instrucciones adicionales",

  handoffIntro: `Vas a ayudar a una persona candidata a adaptar su CV a una oferta de empleo concreta.`,

  handoffIdRule: `Conserva el "id" de cada sección o elemento que mantengas del original, aunque reescribas su texto. Omite "id" en lo que crees de cero. Nunca repitas un id. Puedes reordenar secciones y elementos, añadir secciones y elementos, y eliminar los que no sean relevantes.`,

  handoffContentLanguage: (language) =>
    `El CV está escrito en ${language}. Escribe todo el contenido del CV en ${language}. No lo traduzcas.`,

  handoffSchemaIntro: `Devuelve un único objeto JSON exactamente con esta forma:`,

  handoffOutputRule: `Devuelve únicamente el objeto JSON. Sin explicaciones, sin comentarios y sin bloques de código markdown. Rellena "position" y "company" leyendo la oferta de empleo; usa null si la oferta no los indica. Copia "schemaVersion", "source.cvId" y "source.fingerprint" exactamente como aparecen arriba.`,
};

export const promptText: Record<AppLocale, PromptText> = { en, es };

export function getPromptText(locale: AppLocale): PromptText {
  return promptText[locale] ?? promptText.en;
}
