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
    <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 text-xs w-full backdrop-blur-sm">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 mt-0.5">
            <Bookmark className="h-3.5 w-3.5" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400 block">{t.dlcChapter || 'Chapter'}</span>
            <span className="font-bold text-slate-100">{chapterName || 'Base Game'}</span>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 mt-0.5">
            <Calendar className="h-3.5 w-3.5" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400 block">{t.dlcReleaseYear || 'Release Date'}</span>
            <span className="font-bold text-slate-100">{releaseDate || releaseYear || '2016'}</span>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 mt-0.5">
            <ShieldCheck className="h-3.5 w-3.5" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400 block">{t.dlcLicense || 'Origin & Licensing'}</span>
            <span className="font-bold text-slate-100">
              {character.is_licensed ? (t.dlcLicensed || 'Licensed Franchise') : (t.dlcOriginal || 'Dead by Daylight Original')}
            </span>
          </div>
        </div>
      </div>

      {dlcCounterparts && dlcCounterparts.length > 0 && (
        <div className="pt-2.5 border-t border-slate-800 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-mono uppercase text-slate-400">
            {t.dlcAssociatedWith || 'DLC Counterparts'}:
          </span>
          {dlcCounterparts.map((counterpart) => (
            <Link
              key={counterpart}
              href={`/${currentLocale}/characters/${getCharacterSlug(counterpart)}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
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

