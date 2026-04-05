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

export interface ArbitrageOpportunity {
  itemId: string;
  itemName: string;
  buyCity: string;
  buyPrice: number;
  sellCity: string;
  sellPrice: number;
  profit: number;
  profitPercent: number;
  lastUpdated: string;
}

export const CITIES = [
  "Caerleon",
  "Bridgewatch",
  "Martlock",
  "Thetford",
  "Fort Sterling",
  "Lymhurst",
  "Brecilien",
  "Black Market"
];

export const ITEMS = [
  // Bags
  { id: "T4_BAG", name: "T4 Bag" },
  { id: "T5_BAG", name: "T5 Bag" },
  { id: "T6_BAG", name: "T6 Bag" },
  // Capes
  { id: "T4_CAPE", name: "T4 Cape" },
  { id: "T5_CAPE", name: "T5 Cape" },
  { id: "T6_CAPE", name: "T6 Cape" },
  // Mounts
  { id: "T3_RIDINGHORSE", name: "T3 Riding Horse" },
  { id: "T4_RIDINGHORSE", name: "T4 Riding Horse" },
  { id: "T5_RIDINGHORSE", name: "T5 Riding Horse" },
  { id: "T3_OX", name: "T3 Transport Ox" },
  { id: "T4_OX", name: "T4 Transport Ox" },
  { id: "T5_OX", name: "T5 Transport Ox" },
  // Popular Gear
  { id: "T4_ARMOR_CLOTH_SET1", name: "T4 Scholar Robe" },
  { id: "T4_ARMOR_LEATHER_SET1", name: "T4 Mercenary Jacket" },
  { id: "T4_ARMOR_PLATE_SET1", name: "T4 Soldier Armor" },
  { id: "T4_HEAD_CLOTH_SET1", name: "T4 Scholar Cowl" },
  { id: "T4_SHOES_CLOTH_SET1", name: "T4 Scholar Sandals" },
  // Tools
  { id: "T4_TOOL_PICK", name: "T4 Pickaxe" },
  { id: "T4_TOOL_AXE", name: "T4 Woodaxe" },
  { id: "T4_TOOL_SICKLE", name: "T4 Sickle" },
  { id: "T4_TOOL_HAMMER", name: "T4 Stone Hammer" },
  { id: "T4_TOOL_KNIFE", name: "T4 Skinning Knife" },
];
