import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_NAME } from '@/lib/site';

export const revalidate = 86400;
export function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'es' }];
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return { title: `${lang === 'es' ? 'Términos' : 'Terms'} · ${SITE_NAME}` };
}

export default async function TermsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const es = lang === 'es';
  const items = es
    ? [
        'Estas recetas se comparten para uso personal y no comercial.',
        'Las fotografías de las recetas tienen licencia (Adobe Stock) o se usan bajo licencias Creative Commons; la atribución aparece junto a cada foto. Respeta las licencias originales si las reutilizas.',
        'El contenido se ofrece “tal cual”, sin garantías. Las etiquetas relacionadas con la salud reflejan un interés culinario o nutricional y no son consejo médico (consulta el aviso en cada receta).',
      ]
    : [
        'These recipes are shared for personal, non-commercial use.',
        'Recipe photographs are either licensed (Adobe Stock) or used under Creative Commons licenses; attribution appears alongside each photo. Please respect the original licenses if you reuse them.',
        'Content is provided “as is,” without warranty. Health-related tags reflect culinary or nutritional interest and are not medical advice (see the disclaimer on each recipe).',
      ];
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl mb-6" style={{ fontFamily: 'var(--font-display)', fontWeight: 500, color: 'var(--secondary)' }}>
        {es ? 'Términos' : 'Terms'}
      </h1>
      <div className="space-y-4">
        {items.map((p, i) => (
          <p key={i} className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>{p}</p>
        ))}
      </div>
      <Link href={`/${lang}`} className="inline-block mt-8 text-sm" style={{ color: 'var(--accent)' }}>
        ← {es ? 'Volver al inicio' : 'Back to recipes'}
      </Link>
    </div>
  );
}
