'use client';

import { useEffect } from 'react';

/** Updates document.documentElement.lang to match the current locale */
export default function LangSync({ lang }: { lang: string }) {
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return null;
}
