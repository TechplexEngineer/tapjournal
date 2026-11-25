export type ResetCycle = 'daily' | 'weekly' | 'monthly' | 'yearly';

export type ColorKey = 'blue' | 'teal' | 'purple' | 'orange' | 'red' | 'pink' | 'green' | 'slate';

/** A preset palette key, or a custom colour as `#rrggbb`. */
export type ButtonColor = ColorKey | `#${string}`;

/**
 * A tap button. Buttons form a tree via `parentId`: a button with children acts
 * as a group (tapping it reveals its subcategories), a button without children
 * logs a record when tapped.
 */
export interface TapButton {
  id: string;
  name: string;
  color: ButtonColor;
  resetCycle: ResetCycle;
  parentId: string | null;
  order: number;
  createdAt: number;
}

export interface TapRecord {
  id: string;
  buttonId: string;
  timestamp: number;
}

export interface Settings {
  /** 0 = Sunday, 1 = Monday */
  weekStartsOn: 0 | 1;
}

export interface AppData {
  version: 1;
  buttons: TapButton[];
  records: TapRecord[];
  settings: Settings;
}
