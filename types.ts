export enum AppMode {
  GENERATOR = 'GENERATOR'
}

export interface StylingPreferences {
  occasion: string;
  style: string;
  colors: string;
  hijabType: string; // e.g., Pashmina, Square, Turban, Syar'i
}

export interface GeneratedLook {
  imageUrl?: string;
  description: string;
  tips: string[];
  items: string[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  image?: string;
}

export const HIJAB_STYLES = [
  'Casual Chic',
  'Formal Elegant',
  'Streetwear',
  'Bohemian',
  'Office Wear',
  'Wedding Guest',
  'Sporty Modest',
  'Minimalist'
];

export const HIJAB_TYPES = [
  'Pashmina',
  'Square Scarf (Segi Empat)',
  'Instant Hijab',
  'Syar\'i',
  'Turban Style',
  'Khimar'
];
