import React from 'react';
import { ArrowLeft, BookOpenText } from 'lucide-react';
import TutorialBrand from './TutorialBrand';
import { getTutorialPlayerUrl, getTutorialThumbnail, VISIBLE_TUTORIAL_VIDEOS } from './tutorialData';

interface TutorialWatchPageProps {
  videoId: string;
  onNavigate: (path: string) => void;
}

const TutorialWatchPage: React.FC<TutorialWatchPageProps> = ({ videoId, onNavigate }) => {
  const video = VISIBLE_TUTORIAL_VIDEOS.find((item) => item.id === videoId);

  if (!video) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-black text-slate-900">Tutorial not found</h1>
        <button type="button" onClick={() => onNavigate('/tutorial-video')} className="mt-5 rounded-xl bg-tiffany-600 px-5 py-3 text-sm font-bold text-white">Back to Tutorial Library</button>
      </div>
    );
  }

  const upNext = VISIBLE_TUTORIAL_VIDEOS.filter((item) => item.id !== video.id).slice(0, 4);

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-50/70 text-slate-900">
      <div className="border-b border-slate-200 bg-white/80 px-5 py-3 lg:px-10">
        <div className="mx-auto max-w-[1500px]"><TutorialBrand onHome={() => onNavigate('/')} showBack /></div>
      </div>
      <main className="mx-auto grid max-w-[1250px] gap-10 px-5 py-8 lg:grid-cols-[minmax(0,1fr)_330px] lg:px-10 lg:py-12">
        <article>
          <div className="aspect-video overflow-hidden rounded-2xl bg-black shadow-2xl shadow-slate-900/15">
            <iframe src={getTutorialPlayerUrl(video.playbackId)} title={video.title} className="h-full w-full border-0" allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture" allowFullScreen />
          </div>
          <div className="mt-6">
            <span className="inline-block rounded border border-tiffany-400 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-tiffany-700">{video.category}</span>
            <h1 className="mt-3 text-3xl font-black tracking-tight">{video.title}</h1>
            <p className="mt-3 text-base leading-7 text-slate-500">{video.description}</p>
            <div className="mt-7 flex items-center gap-3 border-t border-slate-200 pt-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-tiffany-100 text-tiffany-600"><BookOpenText size={20} /></span>
              <div><p className="text-xs font-semibold text-slate-400">Mini App</p><p className="font-extrabold">Snabbb {video.category}</p></div>
            </div>
          </div>
        </article>

        <aside>
          <p className="mb-5 text-xs font-black uppercase tracking-[0.2em] text-slate-400">Up Next</p>
          <div className="space-y-5">
            {upNext.map((item) => (
              <button key={item.id} type="button" onClick={() => onNavigate(`/tutorial-video/${item.id}`)} className="group flex w-full gap-3 text-left">
                <img src={getTutorialThumbnail(item.playbackId)} alt="" className="h-20 w-32 shrink-0 rounded-xl object-cover" />
                <span className="min-w-0 py-1"><span className="text-[9px] font-black uppercase tracking-wider text-tiffany-600">{item.category}</span><span className="mt-1 block text-sm font-extrabold leading-5 text-slate-800 group-hover:text-tiffany-700">{item.title}</span></span>
              </button>
            ))}
          </div>
          <button type="button" onClick={() => onNavigate('/tutorial-video')} className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl border border-tiffany-200 bg-tiffany-100/70 px-5 py-3.5 text-sm font-extrabold text-tiffany-700 hover:bg-tiffany-100"><ArrowLeft size={16} /> Back to Tutorial Library</button>
        </aside>
      </main>
    </div>
  );
};

export default TutorialWatchPage;
