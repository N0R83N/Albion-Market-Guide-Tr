export interface MarketResponse {
  item_id: string;
  city: string;
  quality: number;
  sell_price_min: number;
  sell_price_min_date: string;
  sell_price_max: number;
  sell_price_max_date: string;
  buy_price_min: number;
  buy_price_min_date: string;
  buy_price_max: number;
  buy_price_max_date: string;
}

export const CITIES = [
  'Caerleon',
  'Bridgewatch',
  'Martlock',
  'Thetford',
  'Fort Sterling',
  'Lymhurst',
  'Brecilien',
  'Black Market',
];

export const ITEMS = [
  { id: 'T4_BAG', name: 'Adept’s Bag' },
  { id: 'T5_BAG', name: 'Expert’s Bag' },
  { id: 'T6_BAG', name: 'Master’s Bag' },
  { id: 'T4_CAPE', name: 'Adept’s Cape' },
  { id: 'T5_CAPE', name: 'Expert’s Cape' },
  { id: 'T6_CAPE', name: 'Master’s Cape' },
  { id: 'T3_MOUNT_HORSE', name: 'Journeyman’s Riding Horse' },
  { id: 'T4_MOUNT_HORSE', name: 'Adept’s Riding Horse' },
  { id: 'T5_MOUNT_HORSE', name: 'Expert’s Riding Horse' },
  { id: 'T3_MOUNT_OX', name: 'Journeyman’s Transport Ox' },
  { id: 'T4_MOUNT_OX', name: 'Adept’s Transport Ox' },
  { id: 'T5_MOUNT_OX', name: 'Expert’s Transport Ox' },
  { id: 'T4_ARMOR_CLOTH_SET1', name: 'Adept’s Scholar Robe' },
  { id: 'T4_ARMOR_LEATHER_SET1', name: 'Adept’s Mercenary Jacket' },
  { id: 'T4_ARMOR_PLATE_SET1', name: 'Adept’s Soldier Armor' },
  { id: 'T4_HEAD_CLOTH_SET1', name: 'Adept’s Scholar Cowl' },
  { id: 'T4_SHOES_CLOTH_SET1', name: 'Adept’s Scholar Sandals' },
  { id: 'T4_TOOL_PICK', name: 'Adept’s Pickaxe' },
  { id: 'T4_TOOL_AXE', name: 'Adept’s Woodaxe' },
  { id: 'T4_TOOL_SICKLE', name: 'Adept’s Sickle' },
  { id: 'T4_TOOL_HAMMER', name: 'Adept’s Stone Hammer' },
  { id: 'T4_TOOL_KNIFE', name: 'Adept’s Skinning Knife' },
];
