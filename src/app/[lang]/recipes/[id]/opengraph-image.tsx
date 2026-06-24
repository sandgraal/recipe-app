import { ImageResponse } from 'next/og';
import { getRecipeById } from '@/lib/recipes';
import { recipeTitle, localizeCuisine, type Locale } from '@/lib/i18n';
import { SITE_NAME } from '@/lib/site';

// Per-recipe social share card (1200×630). Using the file convention means Next
// emits og:image + og:image:width/height + og:image:alt + twitter:image
// automatically, which the previous bare `images: [url]` metadata did not — the
// missing dimensions were why iMessage/Slack often rendered a bare link.
export const runtime = 'nodejs';
export const alt = `Recipe — ${SITE_NAME}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OgImage({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params;
  const locale = lang as Locale;
  const recipe = await getRecipeById(id).catch(() => null);

  const title = recipe ? recipeTitle(recipe, locale) : SITE_NAME;
  const cover = recipe?.image_url || '';
  const bits: string[] = [];
  if (recipe?.cuisine) bits.push(localizeCuisine(recipe.cuisine, locale));
  if (recipe?.total_time) bits.push(recipe.total_time);
  if (recipe?.servings) bits.push(`${recipe.servings} ${locale === 'es' ? 'porciones' : 'servings'}`);
  const meta = bits.join('   ·   ');

  const titleSize = title.length > 42 ? 54 : title.length > 26 ? 66 : 80;

  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: '100%', height: '100%', position: 'relative', backgroundColor: '#17120f' }}>
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            width={1200}
            height={630}
            style={{ position: 'absolute', top: 0, left: 0, width: 1200, height: 630, objectFit: 'cover' }}
          />
        ) : null}
        {/* Dark scrim so the title is always legible over any photo */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 1200,
            height: 630,
            display: 'flex',
            backgroundImage:
              'linear-gradient(to top, rgba(23,18,15,0.95) 6%, rgba(23,18,15,0.45) 46%, rgba(23,18,15,0.10) 100%)',
          }}
        />
        {/* Brand accent bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: 1200, height: 12, display: 'flex', backgroundColor: '#1f8a70' }} />
        <div style={{ position: 'absolute', left: 70, right: 70, bottom: 64, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 27, fontWeight: 600, color: '#f4794f', letterSpacing: 3, marginBottom: 18 }}>
            CREACIONES COLIBRÍ
          </div>
          <div style={{ display: 'flex', fontSize: titleSize, fontWeight: 700, color: '#ffffff', lineHeight: 1.05 }}>
            {title}
          </div>
          {meta ? <div style={{ display: 'flex', fontSize: 29, color: '#e8ddd5', marginTop: 22 }}>{meta}</div> : null}
        </div>
      </div>
    ),
    size,
  );
}
