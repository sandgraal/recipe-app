import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE_NAME } from '@/lib/site';

export const revalidate = 86400;
export function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'es' }];
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return { title: `${lang === 'es' ? 'Privacidad' : 'Privacy'} · ${SITE_NAME}` };
}

export default async function PrivacyPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const es = lang === 'es';
  const items = es
    ? [
        'Creaciones Colibrí es una colección de recetas personal. No requiere una cuenta y no recopila información personal de quienes la visitan.',
        'Las recetas e imágenes se guardan en nuestra base de datos (Supabase). El sitio se aloja en Vercel, que puede registrar datos estándar y anonimizados de cada solicitud (como la dirección IP y el navegador) con fines de seguridad y operación.',
        'No usamos publicidad ni cookies de seguimiento de terceros. Solo se establece una cookie cuando alguien inicia sesión como administrador.',
        'Para cualquier consulta, comunícate con la persona responsable del sitio.',
      ]
    : [
        'Creaciones Colibrí is a personal recipe collection. It does not require an account and does not collect personal information from visitors.',
        'Recipes and images are stored in our database (Supabase). The site is hosted on Vercel, which may record standard, anonymized request data (such as IP address and user agent) for security and operations.',
        'We do not use advertising or third-party tracking cookies. A cookie is set only when someone logs in as an administrator.',
        'For any questions, please contact the site owner.',
      ];
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl mb-6" style={{ fontFamily: 'var(--font-display)', fontWeight: 500, color: 'var(--secondary)' }}>
        {es ? 'Privacidad' : 'Privacy'}
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
