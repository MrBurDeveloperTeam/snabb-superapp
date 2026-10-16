import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { dismissProfileGuide, isProfileGuideDismissed } from '../../services/profileGuideStorage';

const targets = ['profile', 'settings', 'photo', 'address', 'save'];
const titles = ['Click on your profile icon', 'Click on Settings', 'Upload a profile photo', 'Fill in your address', 'Click on Save changes'];
type Props = { enabled: boolean; path: string; menuOpen: boolean; owner: string };
const readViewport = () => ({
  width: window.visualViewport?.width ?? window.innerWidth,
  height: window.visualViewport?.height ?? window.innerHeight,
  x: window.visualViewport?.offsetLeft ?? 0,
  y: window.visualViewport?.offsetTop ?? 0,
});

export default function ProfileCompletionGuide({ enabled, path, menuOpen, owner }: Props) {
  const [started, setStarted] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [step, setStep] = useState(0);
  const [addressReady, setAddressReady] = useState(false);
  const [repair, setRepair] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [viewport, setViewport] = useState(readViewport);
  const cardRef = useRef<HTMLElement>(null);
  const [cardHeight, setCardHeight] = useState(200);
  // In-memory state resets between users; saved dismissals survive future logins.
  useEffect(() => { setStarted(false); setSkipped(false); setStep(0); setAddressReady(false); setRepair(false); }, [owner]);
  useEffect(() => { if (enabled && path === '/') setStarted(true); }, [enabled, path]);
  const active = enabled && !!owner && started && !skipped && !isProfileGuideDismissed(owner) && (path === '/' || path === '/profile-settings');
  const skip = () => { dismissProfileGuide(owner); setSkipped(true); };
  useEffect(() => {
    if (!active) return;
    if (path === '/profile-settings' && step < 2) setStep(2);
    else if (path === '/' && step < 2) setStep(menuOpen ? 1 : 0);
  }, [active, path, menuOpen, step]);
  useEffect(() => {
    const progress = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail.photo && step === 2) setStep(3);
      if (typeof detail.address === 'boolean') setAddressReady(detail.address);
      if (detail.repair) setRepair(true);
    };
    window.addEventListener('profile-guide-progress', progress);
    return () => window.removeEventListener('profile-guide-progress', progress);
  }, [step]);
  useEffect(() => {
    if (!active) { setRect(null); return; }
    const selector = `[data-profile-guide="${repair ? 'personal' : targets[step]}"]`;
    let previous: Element | null = null;
    let restoreTarget: (() => void) | undefined;
    const update = () => {
      const visible = readViewport();
      const measuredCardHeight = cardRef.current?.getBoundingClientRect().height ?? 200;
      setCardHeight(measuredCardHeight);
      const target = document.querySelector<HTMLElement>(selector);
      if (target && target !== previous) {
        const originalMaxHeight = target.style.maxHeight;
        const originalOverflow = target.style.overflowY;
        restoreTarget = () => { target.style.maxHeight = originalMaxHeight; target.style.overflowY = originalOverflow; };
      }
      // Leave room for the instruction card when a form section fills a phone screen.
      if (target && (step === 2 || step === 3 || repair)) {
        const narrow = visible.width < 1100;
        target.style.maxHeight = narrow ? `${Math.max(80, visible.height - measuredCardHeight - 56)}px` : '';
        target.style.overflowY = narrow ? 'auto' : '';
      }
      if (target && target !== previous) {
        target.scrollIntoView({ block: 'center', inline: 'nearest' });
        previous = target;
      }
      if (target && visible.width < 1100) {
        const bounds = target.getBoundingClientRect();
        const above = bounds.top - visible.y - 28;
        const below = visible.y + visible.height - bounds.bottom - 28;
        // Reserve a real, measured space below the target instead of assuming a fixed card height.
        if (above < measuredCardHeight && below < measuredCardHeight && getComputedStyle(target).position !== 'fixed') {
          const delta = bounds.bottom - (visible.y + visible.height - measuredCardHeight - 28);
          if (delta > 1) window.scrollBy({ top: delta, behavior: 'instant' });
        }
      }
      setRect(target?.getBoundingClientRect() ?? null);
      setViewport(visible);
    };
    update();
    const timer = window.setInterval(update, 100);
    const allowed = (node: EventTarget | null) => node instanceof Element && !!node.closest(`${selector}, [data-profile-guide-card]`);
    const block = (event: Event) => { if (!allowed(event.target)) { event.preventDefault(); event.stopPropagation(); } };
    const focus = (event: Event) => {
      if (!allowed(event.target)) document.querySelector<HTMLElement>(`${selector} button, ${selector} input, ${selector}, [data-profile-guide-card]`)?.focus();
    };
    document.addEventListener('click', block, true);
    document.addEventListener('pointerdown', block, true);
    document.addEventListener('keydown', block, true);
    document.addEventListener('focusin', focus, true);
    return () => {
      clearInterval(timer);
      restoreTarget?.();
      document.removeEventListener('click', block, true);
      document.removeEventListener('pointerdown', block, true);
      document.removeEventListener('keydown', block, true);
      document.removeEventListener('focusin', focus, true);
    };
  }, [active, step, repair]);
  if (!active) return null;
  const { width, height, x, y } = viewport;
  const left = Math.max(x, Math.min(x + width, (rect?.left ?? x + width / 2) - 6));
  const top = Math.max(y, Math.min(y + height, (rect?.top ?? y + height / 2) - 6));
  const right = Math.max(left, Math.min(x + width, (rect?.right ?? left) + 6));
  const bottom = Math.max(top, Math.min(y + height, (rect?.bottom ?? top) + 6));
  const cardWidth = Math.min(300, Math.max(0, width - 24));
  const roomRight = right + cardWidth + 28 <= x + width;
  const roomLeft = left - cardWidth - 28 >= x;
  const cardLeft = roomRight ? right + 16 : roomLeft ? left - cardWidth - 16 : x + (width - cardWidth) / 2;
  const beside = roomRight || roomLeft;
  const preferredTop = beside ? top : bottom + cardHeight + 28 <= y + height ? bottom + 16 : top - cardHeight - 16;
  const cardTop = Math.max(y + 12, Math.min(y + height - cardHeight - 12, preferredTop));
  const shade: React.CSSProperties = { position: 'fixed', background: 'rgba(30, 41, 59, .58)', pointerEvents: 'auto' };
  return createPortal(<div style={{ position: 'fixed', inset: 0, zIndex: 2147483000, pointerEvents: 'none' }}>
    <div style={{ ...shade, left: 0, top: 0, right: 0, height: top }} />
    <div style={{ ...shade, left: 0, top, width: left, height: bottom - top }} />
    <div style={{ ...shade, left: right, top, right: 0, height: bottom - top }} />
    <div style={{ ...shade, left: 0, top: bottom, right: 0, bottom: 0 }} />
    {rect && <div style={{ position: 'fixed', left, top, width: right - left, height: bottom - top, border: '3px solid #2dd4bf', borderRadius: 14, boxShadow: '0 0 0 3px rgba(255,255,255,.8)' }} />}
    <section ref={cardRef} data-profile-guide-card tabIndex={-1} role="dialog" aria-label="Profile completion guide" aria-describedby="profile-guide-instruction" style={{ position: 'fixed', boxSizing: 'border-box', left: cardLeft, top: cardTop, width: cardWidth, maxHeight: Math.max(80, Math.min(260, height * 0.42)), overflowY: 'auto', overflowWrap: 'anywhere', padding: width < 480 ? 14 : 20, borderRadius: 16, background: '#fff', color: '#0f172a', boxShadow: '0 16px 48px #0004', pointerEvents: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
        <p style={{ fontSize: 12, lineHeight: 1.5, color: '#0f766e', fontWeight: 700, margin: 0 }}>PROFILE COMPLETION · STEP {step + 1}/5</p>
        <button type="button" onClick={skip} aria-label="Skip profile guide" style={{ flexShrink: 0, padding: 0, border: 0, borderRadius: 4, background: 'transparent', color: '#0f766e', fontFamily: 'inherit', fontSize: 12, lineHeight: 1.5, fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3, textDecorationThickness: 2, cursor: 'pointer' }}>Skip</button>
      </div>
      <h2 id="profile-guide-instruction" style={{ fontSize: 18, fontWeight: 700, margin: '0 0 10px' }}>{rect ? repair ? 'Check your personal details' : titles[step] : 'Loading your profile…'}</h2>
      <p style={{ fontSize: 13, lineHeight: 1.5, margin: 0 }}>Complete your profile to qualify for an extra platform coupon.{step === 3 && ' Enter your street, city, state and postal code.'}{step === 4 && ' Your guide will close once your completed profile is saved.'}</p>
      {step === 3 && <button disabled={!addressReady} onClick={() => setStep(4)} style={{ marginTop: 14, padding: '9px 14px', background: addressReady ? '#0f766e' : '#94a3b8', color: 'white', borderRadius: 8 }}>Continue to save →</button>}
      {repair && <button onClick={() => setRepair(false)} style={{ marginTop: 14, padding: '9px 14px', background: '#0f766e', color: 'white', borderRadius: 8 }}>Try saving again →</button>}
      <div aria-hidden="true" style={{ display: 'flex', gap: 5, marginTop: 16 }}>{targets.map((target, index) => <span key={target} style={{ height: 4, flex: 1, borderRadius: 4, background: index <= step ? '#14b8a6' : '#e2e8f0' }} />)}</div>
    </section>
  </div>, document.body);
}
