import React, { useState } from 'react';
import { SharedVirtualPet, SharedMeowdokuLauncher } from '@mrburdeveloperteam/pet-function/pet';
import { PET_ASSET_URLS } from '@mrburdeveloperteam/pet-function/resources';
import { DESIGN_OWNER, localPetRepository, localGameClient } from './localPetRepository';

export default function LocalPetDesign() {
  const [open, setOpen] = useState(true);
  const [meowdoku, setMeowdoku] = useState(false);
  return <>
    <main className="min-h-screen bg-teal-50 p-8">
      <h1 className="text-2xl font-bold">Snabbb Superapp · 猫咪游戏设计</h1>
      <p className="my-4">本地免登录模式 · Lv.50 · 100,000 金币起始存档 · 进度保存在此浏览器</p>
      <button className="rounded-xl bg-teal-600 px-6 py-3 text-white" onClick={() => setOpen(true)}>打开猫咪</button>
    </main>
    <SharedVirtualPet isOpen={open} onClose={() => setOpen(false)} userId={DESIGN_OWNER} repository={localPetRepository} gameProgressClient={localGameClient} assetUrls={PET_ASSET_URLS}
      extraGames={[{ id: 'meowdoku', title: 'Meowdoku', iconUrl: '/games/meowdoku/cover-148.png', onSelect: () => setMeowdoku(true) }]} />
    <SharedMeowdokuLauncher isOpen={meowdoku} onClose={() => setMeowdoku(false)} userId={DESIGN_OWNER} repository={localPetRepository} rpcClient={localGameClient} />
  </>;
}
