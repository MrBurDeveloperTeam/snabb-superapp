import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import type { ProductAttribute } from '../types';

interface AttributeFilterBarProps {
  /**
   * Available attributes + their currently-selectable values, as returned
   * alongside the product list (see types.ts's ProductAttribute doc comment)
   * — this narrows as other filters are applied, same as mrbur.shop.
   */
  attributes: ProductAttribute[];
  /** Flat list of selected product.attribute.value ids across all attributes. */
  value: number[];
  onChange: (valueIds: number[]) => void;
}

interface PanelPosition {
  top: number;
  left: number;
}

/**
 * Reproduces mrbur.shop's own attribute dropdown bar (SHANK / SHAPE & NAME /
 * DIAMETER — see `attribute_dropdown_*` in its filter-dropdown-container
 * markup) inside the Unified Shop: one dropdown per attribute, checkboxes
 * for its values, and an explicit Cancel/Apply footer rather than filtering
 * live on every click — matching that same UI's behavior so switching
 * between mrbur.shop and this feature doesn't feel like a different pattern.
 *
 * The bar itself scrolls horizontally (overflow-x-auto) once there are more
 * attributes than fit on screen. CSS won't let an element be "horizontally
 * scrollable, vertically visible" at the same time — setting overflow-x to
 * anything but visible forces the browser to compute overflow-y as auto too
 * — so a dropdown panel positioned *inside* that scrolling row gets
 * silently clipped the instant it extends past the row's own height, no
 * matter how high its z-index is (this was invisible-but-present in the
 * DOM, not a stacking problem). The panel is rendered through a portal into
 * document.body instead, positioned with fixed coordinates read from the
 * trigger button's own bounding box, so it paints above everything
 * regardless of the row's overflow/scroll state.
 */
const AttributeFilterBar: React.FC<AttributeFilterBarProps> = ({ attributes, value, onChange }) => {
  const [openId, setOpenId] = useState<number | null>(null);
  // Pending checkbox state for whichever dropdown is currently open. Kept
  // separate from `value` so Cancel can discard changes and Apply commits
  // them in one go, instead of every checkbox click re-querying products.
  const [pending, setPending] = useState<Set<number>>(new Set());
  const [panelPosition, setPanelPosition] = useState<PanelPosition | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  const closeDropdown = () => {
    setOpenId(null);
    setPanelPosition(null);
  };

  useEffect(() => {
    if (openId == null) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      // The panel is portaled out of containerRef now, so both refs have to
      // be checked — a click inside either one is "inside" this widget.
      if (containerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      closeDropdown();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openId]);

  useEffect(() => {
    if (openId == null) return;
    // The trigger can move (the row scrolls, the window resizes) while a
    // panel is open. It's no longer nested inside the row, so it won't
    // move along with it — close rather than leave it stranded over the
    // wrong spot.
    const handleReposition = () => closeDropdown();
    const scrollParent = containerRef.current;
    scrollParent?.addEventListener('scroll', handleReposition);
    window.addEventListener('resize', handleReposition);
    return () => {
      scrollParent?.removeEventListener('scroll', handleReposition);
      window.removeEventListener('resize', handleReposition);
    };
  }, [openId]);

  if (attributes.length === 0) return null;

  const openDropdown = (attr: ProductAttribute) => {
    if (openId === attr.id) {
      closeDropdown();
      return;
    }
    const ownIds = new Set(attr.values.map((v) => v.id));
    setPending(new Set(value.filter((id) => ownIds.has(id))));
    const trigger = triggerRefs.current.get(attr.id);
    if (trigger) {
      const rect = trigger.getBoundingClientRect();
      setPanelPosition({ top: rect.bottom + 4, left: rect.left });
    }
    setOpenId(attr.id);
  };

  const toggleValue = (id: number) => {
    setPending((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const applyAttribute = (attr: ProductAttribute) => {
    const ownIds = new Set(attr.values.map((v) => v.id));
    const rest = value.filter((id) => !ownIds.has(id));
    onChange([...rest, ...pending]);
    closeDropdown();
  };

  const openAttribute = attributes.find((a) => a.id === openId) ?? null;

  return (
    <div ref={containerRef} className="flex items-center gap-2 overflow-x-auto pb-1">
      {attributes.map((attr) => {
        const selectedCount = attr.values.filter((v) => value.includes(v.id)).length;
        const isOpen = openId === attr.id;

        return (
          <button
            key={attr.id}
            type="button"
            ref={(el) => {
              if (el) triggerRefs.current.set(attr.id, el);
              else triggerRefs.current.delete(attr.id);
            }}
            onClick={() => openDropdown(attr)}
            className={`flex shrink-0 items-center gap-1 rounded-xl border px-3 py-2 text-[13px] font-medium whitespace-nowrap transition-colors ${
              selectedCount > 0
                ? 'border-tiffany-500 bg-tiffany-50 text-tiffany-700 dark:border-tiffany-500 dark:bg-tiffany-950/40 dark:text-tiffany-300'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            All {attr.name}
            {selectedCount > 0 ? ` (${selectedCount})` : ''}
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          </button>
        );
      })}

      {openAttribute && panelPosition &&
        createPortal(
          <div
            ref={panelRef}
            style={{ top: panelPosition.top, left: panelPosition.left }}
            className="fixed z-[100] flex max-h-80 w-52 flex-col rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
          >
            <ul className="flex-1 overflow-y-auto py-1">
              {openAttribute.values.map((v) => (
                <li key={v.id}>
                  <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-[13px] text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800">
                    <input
                      type="checkbox"
                      checked={pending.has(v.id)}
                      onChange={() => toggleValue(v.id)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-tiffany-500 focus:ring-tiffany-500 dark:border-slate-600"
                    />
                    {v.name}
                  </label>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-2 py-2 dark:border-slate-800">
              <button
                type="button"
                onClick={closeDropdown}
                className="rounded-lg px-2.5 py-1 text-[12px] font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => applyAttribute(openAttribute)}
                className="rounded-lg bg-tiffany-500 px-2.5 py-1 text-[12px] font-semibold text-white hover:bg-tiffany-600"
              >
                Apply
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default AttributeFilterBar;
