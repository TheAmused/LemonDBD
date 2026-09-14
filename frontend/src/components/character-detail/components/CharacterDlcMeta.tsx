// frontend/src/components/character-detail/components/CharacterDlcMeta.tsx
import React from 'react';
import Link from 'next/link';
import { ExternalLink, Calendar, Bookmark, ShieldCheck } from 'lucide-react';
import { CharacterItem, getCharacterSlug } from '../types';

interface CharacterDlcMetaProps {
  character: CharacterItem;
  chapterName: string;
  releaseDate: string;
  releaseYear: number;
  dlcCounterparts: string[];
  currentLocale: string;
  t: Record<string, string>;
}

export const CharacterDlcMeta: React.FC<CharacterDlcMetaProps> = ({
  character,
  chapterName,
  releaseDate,
  releaseYear,
  dlcCounterparts,
  currentLocale,
  t,
}) => {
  return (
    <div className="p-4 rounded-2xl bg-bg-elevated border border-border-color space-y-3 text-xs w-full backdrop-blur-sm">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-xl bg-bg-surface text-text-secondary border border-border-color mt-0.5">
            <Bookmark className="h-3.5 w-3.5" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-text-secondary block">{t.dlcChapter || 'Chapter'}</span>
            <span className="font-bold text-text-primary">{chapterName || 'Base Game'}</span>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-xl bg-bg-surface text-text-secondary border border-border-color mt-0.5">
            <Calendar className="h-3.5 w-3.5" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-text-secondary block">{t.dlcReleaseYear || 'Release Date'}</span>
            <span className="font-bold text-text-primary">{releaseDate || releaseYear || '2016'}</span>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-xl bg-bg-surface text-text-secondary border border-border-color mt-0.5">
            <ShieldCheck className="h-3.5 w-3.5" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-text-secondary block">{t.dlcLicense || 'Origin & Licensing'}</span>
            <span className="font-bold text-text-primary">
              {character.is_licensed ? (t.dlcLicensed || 'Licensed Franchise') : (t.dlcOriginal || 'Dead by Daylight Original')}
            </span>
          </div>
        </div>
      </div>

      {dlcCounterparts && dlcCounterparts.length > 0 && (
        <div className="pt-2.5 border-t border-border-color flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-mono uppercase text-text-secondary">
            {t.dlcAssociatedWith || 'DLC Counterparts'}:
          </span>
          {dlcCounterparts.map((counterpart) => (
            <Link
              key={counterpart}
              href={`/${currentLocale}/characters/${getCharacterSlug(counterpart)}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-bg-surface hover:bg-bg-elevated text-text-primary border border-border-color transition-colors"
            >
              <span>{counterpart}</span>
              <ExternalLink className="h-3 w-3 opacity-60" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

