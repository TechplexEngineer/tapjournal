import type { TapButton } from './types.ts';

export function childrenOf(buttons: TapButton[], parentId: string | null): TapButton[] {
  return buttons.filter((b) => b.parentId === parentId).sort((a, b) => a.order - b.order);
}

/** The button itself plus every button nested beneath it. */
export function descendantIds(buttons: TapButton[], id: string): Set<string> {
  const ids = new Set([id]);
  let frontier = [id];
  while (frontier.length) {
    const next: string[] = [];
    for (const b of buttons) {
      if (b.parentId && frontier.includes(b.parentId) && !ids.has(b.id)) {
        ids.add(b.id);
        next.push(b.id);
      }
    }
    frontier = next;
  }
  return ids;
}

/** Root-first chain of buttons ending at `id`. */
export function pathOf(byId: Map<string, TapButton>, id: string): TapButton[] {
  const path: TapButton[] = [];
  let cur = byId.get(id);
  while (cur && path.length < 32) {
    path.unshift(cur);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return path;
}

export function labelOf(byId: Map<string, TapButton>, id: string): string {
  const path = pathOf(byId, id);
  return path.length ? path.map((b) => b.name).join(' › ') : 'Deleted button';
}

/** Depth-first listing of the whole tree, in display order. */
export function flattenTree(buttons: TapButton[]): { button: TapButton; depth: number }[] {
  const out: { button: TapButton; depth: number }[] = [];
  const walk = (parentId: string | null, depth: number) => {
    for (const b of childrenOf(buttons, parentId)) {
      out.push({ button: b, depth });
      walk(b.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

export function indexButtons(buttons: TapButton[]): Map<string, TapButton> {
  return new Map(buttons.map((b) => [b.id, b]));
}
