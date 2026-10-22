// frontend/src/app/llms.txt/route.ts -- /llms.txt (https://llmstxt.org)
//
// A short, plain-text map of the site for AI assistants that read a page on a user's behalf.
// Written in English (the format's convention); the links point at the English pages.
import { getDictionary } from '@/i18n/get-dictionary';
import { i18n } from '@/i18n/config';
import { siteUrl } from '@/i18n/metadata';

export const dynamic = 'force-static';

export async function GET(): Promise<Response> {
  const dict = await getDictionary(i18n.defaultLocale);
  const base = siteUrl();
  const link = (path: string) => (base ? new URL(`/${i18n.defaultLocale}${path}`, base).toString() : `/${i18n.defaultLocale}${path}`);
  const body = [
    `# ${dict.app.title}`,
    '',
    `> ${dict.app.siteDescription}`,
    '',
    'Every page exists in English (/en), Spanish (/es), Polish (/pl), German (/de) and Japanese (/ja).',
    '',
    '## Tools',
    '',
    `- [Perks](${link('/perks')}): every survivor and killer perk with its description and type`,
    `- [Characters](${link('/characters')}): survivors and killers with their teachable perks`,
    `- [Maps](${link('/maps')}): realm maps with callouts`,
    `- [Perk randomizer](${link('/randomizer')}): random builds from the perks you own`,
    `- [Challenges](${link('/streaks')}): streak challenge modes (gauntlet, chaos, history, page streak)`,
    `- [Minigames](${link('/minigames')}): daily and practice guessing games`,
    `- [Tier lists](${link('/tier-lists')}): official and community tier lists`,
    `- [Smash or Pass](${link('/smash-or-pass')}): community character voting`,
    '',
    '## About',
    '',
    `- [About](${link('/about')})`,
    `- [Rules](${link('/rules')})`,
    `- [Privacy policy](${link('/privacy-policy')})`,
    `- [Terms of service](${link('/terms-of-service')})`,
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
