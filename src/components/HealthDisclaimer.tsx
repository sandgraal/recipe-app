import { type Locale } from '@/lib/i18n';

/** Health-goal tags that trigger the non-medical disclaimer. */
export const HEALTH_TAGS = new Set([
  'Functional Foods', 'Anti-inflammatory', 'Gut Health', 'Heart Healthy', 'Immune',
]);

export function hasHealthTag(tags?: string[] | null): boolean {
  return !!tags?.some(t => HEALTH_TAGS.has(t));
}

const TEXT: Record<Locale, string> = {
  en: 'These recipes celebrate traditional, nutritious ingredients. They are not intended to diagnose, treat, cure, or prevent any disease. Consult a healthcare professional for medical advice.',
  es: 'Estas recetas celebran ingredientes tradicionales y nutritivos. No están destinadas a diagnosticar, tratar, curar ni prevenir ninguna enfermedad. Consulta a un profesional de la salud para obtener asesoramiento médico.',
};

/**
 * Non-medical disclaimer shown wherever health-goal framing appears, so the
 * "Functional Foods / Anti-inflammatory / ..." tags read as culinary/nutritional
 * interest rather than a medical claim.
 */
export default function HealthDisclaimer({ lang, className }: { lang: Locale; className?: string }) {
  return (
    <p className={className} style={{ fontSize: '0.75rem', lineHeight: 1.5, color: 'var(--muted)' }}>
      {TEXT[lang] ?? TEXT.en}
    </p>
  );
}
