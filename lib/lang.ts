import { cookies } from 'next/headers';
import type { Lang } from './i18n';

export function getLang(): Lang {
  return cookies().get('lang')?.value === 'ur' ? 'ur' : 'en';
}
