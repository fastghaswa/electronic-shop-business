// Product catalogue. Prices are in virtual rupees. Pure data: no React/three.
export type Shape =
  | "fanTable" | "fanPedestal" | "fanCeiling" | "fanWall"
  | "cooler" | "coolerTower" | "acSplit" | "acWindow"
  | "fridge" | "fridgeLarge" | "fridgeSmall"
  | "washer" | "dryer" | "washerDryer"
  | "tv" | "tvVintage" | "monitor"
  | "speaker" | "speakerSmall" | "radio" | "soundbar"
  | "phone" | "tablet" | "laptop" | "watch"
  | "blender" | "juicer" | "toaster" | "coffee" | "microwave" | "stove" | "hood" | "kettle" | "riceCooker" | "oven"
  | "geyser" | "geyserSmall" | "heater" | "oilHeater"
  | "charger" | "powerbank" | "headphones" | "earphones" | "keyboard" | "mouse" | "printer" | "router"
  | "iron" | "hairdryer" | "trimmer" | "bulb" | "extension" | "lamp"
  | "console" | "camera" | "projector" | "purifier" | "vacuum" | "inverter" | "dishwasher";

export type Category =
  | "Fans" | "Coolers" | "ACs" | "Refrigerators" | "Washing Machines" | "TVs & Displays"
  | "Audio" | "Mobiles & Tablets" | "Laptops & PCs" | "Kitchen" | "Geysers & Heaters"
  | "Accessories" | "Personal Care" | "Home & Lighting" | "Gaming & Cameras";

export interface Product {
  id: string;
  name: string;
  category: Category;
  wholesale: number;
  retail: number;
  unlock: number; // player level required
  shape: Shape;
  /** Height of the item itself in metres. */
  height: number;
  /** Small items stand on a pedestal display. */
  small: boolean;
  color: string;
}

const P = (
  id: string, name: string, category: Category, wholesale: number, retail: number,
  unlock: number, shape: Shape, height: number, small: boolean, color = "#d8dde3",
): Product => ({ id, name, category, wholesale, retail, unlock, shape, height, small, color });

export const PRODUCTS: Product[] = [
  // Level 1 — starter goods
  P("usb-charger", "USB Charger 20W", "Accessories", 180, 349, 1, "charger", 0.08, true, "#f4f4f4"),
  P("fast-charger", "Fast Charger 65W", "Accessories", 450, 799, 1, "charger", 0.1, true, "#2b2f36"),
  P("earphones", "Wired Earphones", "Audio", 120, 249, 1, "earphones", 0.06, true, "#1d1f24"),
  P("bt-headphones", "Bluetooth Headphones", "Audio", 900, 1499, 1, "headphones", 0.2, true, "#2a3b55"),
  P("wired-mouse", "Wired Mouse", "Accessories", 150, 299, 1, "mouse", 0.05, true, "#222"),
  P("wireless-mouse", "Wireless Mouse", "Accessories", 350, 649, 1, "mouse", 0.05, true, "#8a96a8"),
  P("basic-keyboard", "Basic Keyboard", "Accessories", 300, 549, 1, "keyboard", 0.05, true, "#222"),
  P("powerbank-10k", "Power Bank 10000mAh", "Accessories", 650, 1099, 1, "powerbank", 0.15, true, "#30343b"),
  P("table-fan", "Table Fan", "Fans", 1100, 1699, 1, "fanTable", 0.55, true, "#e9eef2"),
  P("ceiling-fan", "Ceiling Fan 1200mm", "Fans", 1400, 2199, 1, "fanCeiling", 0.5, false, "#c9a77a"),
  P("led-bulbs", "LED Bulb Pack (4)", "Home & Lighting", 180, 349, 1, "bulb", 0.14, true, "#fff6d8"),
  P("extension-board", "Extension Board 4-way", "Accessories", 220, 449, 1, "extension", 0.06, true, "#f2f2f2"),
  P("electric-kettle", "Electric Kettle 1.5L", "Kitchen", 600, 999, 1, "kettle", 0.25, true, "#b8bec6"),
  P("steam-iron", "Steam Iron", "Personal Care", 700, 1199, 1, "iron", 0.16, true, "#3a7bd5"),
  // Level 2
  P("pedestal-fan", "Pedestal Fan", "Fans", 1800, 2799, 2, "fanPedestal", 1.3, false, "#f1f3f5"),
  P("wall-fan", "Wall Fan", "Fans", 1500, 2299, 2, "fanWall", 0.55, true, "#e6e9ed"),
  P("mixer-grinder", "Mixer Grinder 750W", "Kitchen", 1900, 2999, 2, "blender", 0.4, true, "#c0392b"),
  P("juicer", "Juicer Mixer", "Kitchen", 1500, 2399, 2, "juicer", 0.42, true, "#27ae60"),
  P("bt-speaker", "Bluetooth Speaker", "Audio", 1200, 1999, 2, "speakerSmall", 0.25, true, "#1f2a44"),
  P("hair-dryer", "Hair Dryer", "Personal Care", 650, 1099, 2, "hairdryer", 0.22, true, "#e84393"),
  P("trimmer", "Beard Trimmer", "Personal Care", 700, 1199, 2, "trimmer", 0.17, true, "#2d3436"),
  P("smartwatch", "Smartwatch", "Mobiles & Tablets", 1500, 2499, 2, "watch", 0.05, true, "#111"),
  P("gaming-keyboard", "RGB Gaming Keyboard", "Accessories", 1400, 2299, 2, "keyboard", 0.05, true, "#101010"),
  P("gaming-mouse", "Gaming Mouse", "Accessories", 800, 1399, 2, "mouse", 0.05, true, "#c0392b"),
  // Level 3
  P("smartphone-basic", "Smartphone Lite", "Mobiles & Tablets", 6500, 8999, 3, "phone", 0.16, true, "#2c3e50"),
  P("room-heater", "Fan Room Heater", "Geysers & Heaters", 1300, 2199, 3, "heater", 0.5, true, "#ecf0f1"),
  P("oil-heater", "Oil Filled Radiator", "Geysers & Heaters", 5500, 7999, 3, "oilHeater", 0.7, false, "#f5f5f5"),
  P("instant-geyser", "Instant Geyser 3L", "Geysers & Heaters", 2800, 4199, 3, "geyserSmall", 0.45, true, "#fafafa"),
  P("storage-geyser", "Storage Geyser 15L", "Geysers & Heaters", 5200, 7499, 3, "geyser", 0.75, false, "#fafafa"),
  P("toaster", "Pop-up Toaster", "Kitchen", 900, 1499, 3, "toaster", 0.2, true, "#bdc3c7"),
  P("coffee-maker", "Coffee Maker", "Kitchen", 2200, 3399, 3, "coffee", 0.35, true, "#2d3436"),
  P("rice-cooker", "Electric Rice Cooker", "Kitchen", 1300, 2099, 3, "riceCooker", 0.3, true, "#ecf0f1"),
  P("personal-cooler", "Personal Air Cooler", "Coolers", 3800, 5499, 3, "cooler", 0.9, false, "#f0f3f6"),
  P("tower-cooler", "Tower Cooler", "Coolers", 5200, 7299, 3, "coolerTower", 1.2, false, "#e9eef3"),
  // Level 4
  P("tv-32", "32\" HD LED TV", "TVs & Displays", 9500, 12999, 4, "tv", 0.5, false, "#111"),
  P("microwave", "Microwave Oven 20L", "Kitchen", 6000, 8499, 4, "microwave", 0.32, true, "#2f3640"),
  P("inkjet-printer", "Inkjet Printer", "Laptops & PCs", 3200, 4799, 4, "printer", 0.2, true, "#2f3542"),
  P("monitor-24", "24\" IPS Monitor", "Laptops & PCs", 6500, 8999, 4, "monitor", 0.45, true, "#111"),
  P("soundbar", "Soundbar 120W", "Audio", 5500, 7999, 4, "soundbar", 0.1, true, "#1e1e1e"),
  P("wifi-router", "Dual-band Wi-Fi Router", "Accessories", 1500, 2399, 4, "router", 0.15, true, "#222"),
  P("fridge-single", "Single Door Fridge 190L", "Refrigerators", 11000, 14999, 4, "fridgeSmall", 1.3, false, "#9aa7b4"),
  P("washer-semi", "Semi-Auto Washing Machine", "Washing Machines", 8500, 11999, 4, "dryer", 0.95, false, "#eef2f5"),
  P("desert-cooler", "Desert Cooler 70L", "Coolers", 6800, 9499, 4, "cooler", 1.25, false, "#d7e0e8"),
  // Level 5
  P("smartphone-pro", "Smartphone Pro", "Mobiles & Tablets", 18000, 24999, 5, "phone", 0.17, true, "#5d6d7e"),
  P("laptop-basic", "Everyday Laptop", "Laptops & PCs", 26000, 33999, 5, "laptop", 0.22, true, "#8395a7"),
  P("tv-43", "43\" Smart TV", "TVs & Displays", 19000, 25999, 5, "tv", 0.65, false, "#111"),
  P("fridge-double", "Double Door Fridge 260L", "Refrigerators", 22000, 28999, 5, "fridge", 1.6, false, "#b2bec3"),
  P("washer-front", "Front Load Washer 7kg", "Washing Machines", 24000, 31999, 5, "washer", 0.85, false, "#f5f6f7"),
  P("ac-1ton", "1 Ton Split AC", "ACs", 24000, 31999, 5, "acSplit", 0.3, false, "#fbfbfb"),
  P("ac-window", "Window AC 1.5 Ton", "ACs", 22000, 28999, 5, "acWindow", 0.45, false, "#f1f1f1"),
  P("laser-printer", "Laser Printer", "Laptops & PCs", 9000, 12499, 5, "printer", 0.3, true, "#ecf0f1"),
  P("water-purifier", "RO Water Purifier", "Home & Lighting", 9000, 12999, 5, "purifier", 0.55, true, "#2e86de"),
  P("vacuum", "Vacuum Cleaner", "Home & Lighting", 4500, 6499, 5, "vacuum", 0.4, true, "#e17055"),
  // Level 6
  P("gaming-laptop", "Gaming Laptop RTX", "Laptops & PCs", 60000, 76999, 6, "laptop", 0.24, true, "#1b1b1b"),
  P("tv-55", "55\" 4K Smart TV", "TVs & Displays", 38000, 48999, 6, "tv", 0.8, false, "#0b0b0b"),
  P("ac-inverter", "1.5 Ton Inverter AC", "ACs", 32000, 41999, 6, "acSplit", 0.32, false, "#ffffff"),
  P("console", "Gaming Console", "Gaming & Cameras", 38000, 47999, 6, "console", 0.1, true, "#f5f5f5"),
  P("tablet", "10\" Tablet", "Mobiles & Tablets", 14000, 18999, 6, "tablet", 0.25, true, "#34495e"),
  P("home-theatre", "Home Theatre 5.1", "Audio", 11000, 14999, 6, "speaker", 1.0, false, "#222"),
  P("otg-oven", "OTG Oven 30L", "Kitchen", 5200, 7499, 6, "oven", 0.38, true, "#2d3436"),
  // Level 7+
  P("fridge-sbs", "Side-by-Side Fridge 600L", "Refrigerators", 55000, 69999, 7, "fridgeLarge", 1.8, false, "#7f8c8d"),
  P("washer-dryer", "Washer Dryer Combo", "Washing Machines", 42000, 54999, 7, "washerDryer", 1.7, false, "#f0f0f0"),
  P("dslr", "DSLR Camera Kit", "Gaming & Cameras", 42000, 54999, 7, "camera", 0.12, true, "#111"),
  P("projector", "4K Projector", "Gaming & Cameras", 30000, 39999, 7, "projector", 0.15, true, "#ecf0f1"),
  P("chimney", "Kitchen Chimney", "Kitchen", 9000, 12999, 7, "hood", 0.6, false, "#95a5a6"),
  P("induction", "Induction Cooktop", "Kitchen", 1800, 2799, 3, "stove", 0.08, true, "#111"),
  P("dishwasher", "Dishwasher 12 Place", "Kitchen", 30000, 38999, 8, "dishwasher", 0.85, false, "#dfe6e9"),
  P("tv-65-oled", "65\" OLED TV", "TVs & Displays", 120000, 149999, 8, "tv", 0.95, false, "#050505"),
  P("flagship-phone", "Flagship Phone Ultra", "Mobiles & Tablets", 95000, 119999, 8, "phone", 0.17, true, "#1c1c1c"),
  P("inverter-battery", "Home Inverter + Battery", "Home & Lighting", 14000, 18999, 6, "inverter", 0.6, false, "#2c3e50"),
  P("floor-lamp", "Smart Floor Lamp", "Home & Lighting", 1600, 2499, 2, "lamp", 1.5, false, "#f5e6c8"),
  P("vintage-tv", "Retro CRT TV (collector)", "TVs & Displays", 4500, 6999, 3, "tvVintage", 0.5, true, "#6d4c41"),
  P("radio", "FM Radio", "Audio", 500, 899, 1, "radio", 0.2, true, "#8d6e63"),
];

export const PRODUCT_MAP: Record<string, Product> = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

export const CATEGORIES: Category[] = Array.from(new Set(PRODUCTS.map((p) => p.category)));

export function getProduct(id: string): Product | undefined {
  return PRODUCT_MAP[id];
}

export interface DecorItem {
  id: string;
  name: string;
  cost: number;
  unlock: number;
  shape: "shelf" | "table" | "plant" | "lamp" | "plantSmall";
  /** Customer attraction bonus per item (fraction). */
  appeal: number;
}

export const DECOR: DecorItem[] = [
  { id: "plant", name: "Potted Plant", cost: 400, unlock: 1, shape: "plant", appeal: 0.03 },
  { id: "plant-small", name: "Desk Plant", cost: 250, unlock: 1, shape: "plantSmall", appeal: 0.02 },
  { id: "shelf", name: "Display Shelf", cost: 1500, unlock: 1, shape: "shelf", appeal: 0.04 },
  { id: "table", name: "Showcase Table", cost: 1200, unlock: 2, shape: "table", appeal: 0.04 },
  { id: "lamp", name: "Designer Floor Lamp", cost: 900, unlock: 2, shape: "lamp", appeal: 0.03 },
];

export const DECOR_MAP: Record<string, DecorItem> = Object.fromEntries(DECOR.map((d) => [d.id, d]));
