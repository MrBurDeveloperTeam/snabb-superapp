import React, { useMemo, useState } from 'react';
import { BookOpenText, Play } from 'lucide-react';
import TutorialBrand from './TutorialBrand';
import { getTutorialCategoryStyle, getTutorialThumbnail, VISIBLE_TUTORIAL_CATEGORIES, VISIBLE_TUTORIAL_VIDEOS, TutorialCategory } from './tutorialData';

interface TutorialLibraryPageProps {
  onNavigate: (path: string) => void;
}

const TutorialLibraryPage: React.FC<TutorialLibraryPageProps> = ({ onNavigate }) => {
  const [activeCategory, setActiveCategory] = useState<TutorialCategory | 'All'>('All');
  const videos = useMemo(
    () => activeCategory === 'All' ? VISIBLE_TUTORIAL_VIDEOS : VISIBLE_TUTORIAL_VIDEOS.filter((video) => video.category === activeCategory),
    [activeCategory],
  );

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-50/70 text-slate-900">
      <div className="border-b border-slate-200 bg-white px-5 py-4 lg:px-10">
        <div className="relative mx-auto flex max-w-[1500px] items-center justify-center">
          <TutorialBrand onHome={() => onNavigate('/')} showLabel={false} />
          <span className="absolute right-0 text-sm font-semibold text-slate-400">{VISIBLE_TUTORIAL_VIDEOS.length} videos</span>
        </div>
      </div>

      <main className="mx-auto max-w-[1500px] px-5 py-10 lg:px-10 lg:py-14">
        <section className="flex items-start gap-4">
          <div className="mt-1 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-tiffany-100 text-tiffany-600">
            <BookOpenText size={27} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-tiffany-600">Learn Snabbb</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Tutorial Library</h1>
            <p className="mt-2 text-sm font-medium text-slate-500 sm:text-base">Step-by-step guides for every mini app inside Snabbb. Browse by category or watch them all.</p>
          </div>
        </section>

        <div className="mt-8 space-y-4">
          <button type="button" onClick={() => setActiveCategory('All')} className={`rounded-full px-5 py-2.5 text-sm font-bold transition-all ${activeCategory === 'All' ? 'bg-tiffany-600 text-white shadow-lg shadow-tiffany-600/20' : 'border border-slate-200 bg-white text-slate-600 hover:border-tiffany-300'}`}>Show All</button>
          {VISIBLE_TUTORIAL_CATEGORIES.map(({ group, items }) => (
            <div key={group}>
              <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{group}</p>
              <div className="flex flex-wrap gap-2">
                {items.map((category) => (
                  <button key={category} type="button" onClick={() => setActiveCategory(category)} className={`rounded-full border px-4 py-2 text-sm font-bold transition-all ${activeCategory === category ? 'border-tiffany-600 bg-tiffany-600 text-white shadow-md shadow-tiffany-600/20' : 'border-slate-200 bg-white text-slate-600 hover:border-tiffany-300 hover:text-tiffany-700'}`}>{category}</button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <section className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-live="polite">
          {videos.map((video) => (
            <button key={video.id} type="button" onClick={() => onNavigate(`/tutorial-video/${video.id}`)} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition-all hover:-translate-y-1 hover:border-tiffany-200 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-tiffany-500/20">
              <div className="relative aspect-video overflow-hidden bg-slate-900">
                <img src={getTutorialThumbnail(video.playbackId)} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-300 group-hover:bg-black/30 group-focus-visible:bg-black/30">
                  <span className="flex h-14 w-14 scale-75 items-center justify-center rounded-full bg-white text-slate-900 opacity-0 shadow-xl shadow-slate-950/25 transition-all duration-300 group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100">
                    <Play size={23} fill="currentColor" className="translate-x-0.5" />
                  </span>
                </span>
                {video.isNew && <span className="absolute left-3 top-3 rounded-md bg-tiffany-500 px-2 py-1 text-[10px] font-black text-white">NEW</span>}
              </div>
              <div className="p-4">
                <span className={`inline-block rounded border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${getTutorialCategoryStyle(video.category)}`}>{video.category}</span>
                <h2 className="mt-2 line-clamp-2 text-base font-extrabold text-slate-900">{video.title}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-slate-500">{video.description}</p>
              </div>
            </button>
          ))}
        </section>
      </main>
    </div>
  );
};

export default TutorialLibraryPage;
