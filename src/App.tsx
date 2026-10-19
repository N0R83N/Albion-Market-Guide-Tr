import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { AlertTriangle, ArrowDown, Clock3, Info, MapPin, Package, Plus, RefreshCw, Search, ShoppingBag, Store, Trash2, TrendingUp } from 'lucide-react';
import { ITEMS, CITIES } from './types';
import type { MarketResponse } from './types';

const API_BASE = 'https://europe.albion-online-data.com/api/v2/stats/prices';
const RENDER_BASE = 'https://render.albiononline.com/v1/item';
const MAX_URL_LENGTH = 3900;
const FRESHNESS_OPTIONS = [1, 6, 24, 48, 0] as const;

type Item = { id: string; name: string };
type SaleMode = 'instant' | 'order';

function formatSilver(value: number) {
  return Math.round(value).toLocaleString('tr-TR') + ' silver';
}

function parseDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) || date.getTime() < 100000000000 ? null : date;
}

function freshnessLabel(date: Date | null) {
  if (!date) return 'Tarih yok';
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return 'az önce';
  if (minutes < 60) return minutes + ' dk önce';
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + ' sa önce';
  return Math.floor(hours / 24) + ' gün önce';
}

function App() {
  const [items, setItems] = useState<Item[]>(ITEMS.map((item) => ({ ...item })));
  const [customItem, setCustomItem] = useState('');
  const [selectedCities, setSelectedCities] = useState<string[]>([...CITIES]);
  const [quality, setQuality] = useState(1);
  const [saleMode, setSaleMode] = useState<SaleMode>('instant');
  const [premium, setPremium] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [minimumProfit, setMinimumProfit] = useState(0);
  const [maxAgeHours, setMaxAgeHours] = useState<number>(24);
  const [data, setData] = useState<MarketResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const addItems = (event: FormEvent) => {
    event.preventDefault();
    const candidates = customItem.split(/[,\n;\s]+/).map((id) => id.trim().toUpperCase()).filter(Boolean);
    const valid = candidates.filter((id) => /^[A-Z0-9_@.-]+$/.test(id));
    const invalid = candidates.filter((id) => !/^[A-Z0-9_@.-]+$/.test(id));
    const existing = new Set(items.map((item) => item.id));
    const additions = valid.filter((id) => !existing.has(id)).map((id) => ({ id, name: id.replace(/_/g, ' ') }));
    if (additions.length) setItems((current) => [...current, ...additions]);
    setCustomItem('');
    setNotice(invalid.length ? 'Geçersiz eşya kodları atlandı: ' + invalid.join(', ') : (additions.length ? additions.length + ' eşya eklendi.' : 'Bu eşya listede zaten var.'));
  };

  const removeItem = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
    setData((current) => current.filter((row) => row.item_id !== id));
  };

  const toggleCity = (city: string) => {
    setSelectedCities((current) => current.includes(city) ? current.filter((item) => item !== city) : [...current, city]);
  };

  const fetchData = useCallback(async () => {
    if (!items.length) {
      setError('Önce fiyatı aranacak en az bir eşya ekle.');
      return;
    }
    if (selectedCities.length < 2) {
      setError('Rota hesaplamak için en az iki şehir seç.');
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError('');
    setNotice('');
    setData([]);

    try {
      const locations = selectedCities.join(',');
      const query = 'locations=' + encodeURIComponent(locations) + '&qualities=' + quality;
      const groups: string[][] = [];
      let current: string[] = [];

      for (const item of items) {
        const candidate = [...current, item.id];
        const url = API_BASE + '/' + candidate.map(encodeURIComponent).join(',') + '.json?' + query;
        if (url.length > MAX_URL_LENGTH && current.length) {
          groups.push(current);
          current = [item.id];
        } else {
          current = candidate;
        }
      }
      if (current.length) groups.push(current);

      const responses = await Promise.all(groups.map(async (group) => {
        const url = API_BASE + '/' + group.map(encodeURIComponent).join(',') + '.json?' + query;
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error('Fiyat servisi ' + response.status + ' yanıtı verdi. Biraz sonra tekrar dene.');
        const result: MarketResponse[] = await response.json();
        if (!Array.isArray(result)) throw new Error('Fiyat servisinden beklenmeyen veri geldi.');
        return result;
      }));

      const rows = responses.flat();
      setData(rows);
      setLastFetch(new Date());
      if (!rows.length) setNotice('Bu eşya ve şehirler için API’de henüz fiyat kaydı yok. Bu, fiyatların sıfır olduğu anlamına gelmez.');
      else if (rows.every((row) => !row.sell_price_min && !row.buy_price_max)) {
        setNotice('Eşya bulundu ancak seçilen şehirlerde kullanılabilir alış/satış fiyatı yok.');
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Fiyatlar alınamadı. Bağlantını kontrol edip tekrar dene.');
    } finally {
      if (abortRef.current === controller) setLoading(false);
    }
  }, [items, selectedCities, quality]);

  useEffect(() => {
    fetchData();
    return () => abortRef.current?.abort();
  }, []);

  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const opportunities = useMemo(() => {
    const now = Date.now();
    const maxAgeMs = maxAgeHours === 0 ? Infinity : maxAgeHours * 60 * 60 * 1000;
    const priceRows = new Map<string, Map<string, MarketResponse>>();
    for (const row of data) {
      if (row.quality !== quality) continue;
      const byCity = priceRows.get(row.item_id) ?? new Map<string, MarketResponse>();
      byCity.set(row.city, row);
      priceRows.set(row.item_id, byCity);
    }

    const result: Array<{
      itemId: string; itemName: string; buyCity: string; sellCity: string;
      buyPrice: number; askPrice: number; bidPrice: number; sellPrice: number;
      profit: number; profitPercent: number; buyDate: Date | null; sellDate: Date | null;
    }> = [];

    for (const [itemId, byCity] of priceRows) {
      const item = itemById.get(itemId);
      if (!item) continue;
      for (const [buyCity, buyRow] of byCity) {
        const buyPrice = Number(buyRow.sell_price_min);
        const buyDate = parseDate(buyRow.sell_price_min_date);
        if (!buyPrice || buyPrice < 0 || !buyDate || now - buyDate.getTime() > maxAgeMs) continue;

        for (const [sellCity, sellRow] of byCity) {
          if (sellCity === buyCity) continue;
          const askPrice = Number(sellRow.sell_price_min);
          const bidPrice = Number(sellRow.buy_price_max);
          const sellDate = parseDate(saleMode === 'instant' ? sellRow.buy_price_max_date : sellRow.sell_price_min_date);
          const sellPrice = saleMode === 'instant' ? bidPrice : askPrice;
          if (!sellPrice || sellPrice <= 0 || !sellDate || now - sellDate.getTime() > maxAgeMs) continue;

          const taxRate = premium ? 0.04 : 0.08;
          const sellOrderSetupRate = saleMode === 'order' ? 0.025 : 0;
          const netSell = sellPrice * (1 - taxRate - sellOrderSetupRate);
          const profit = netSell - buyPrice;
          const profitPercent = (profit / buyPrice) * 100;
          if (profit <= 0 || profit * quantity < minimumProfit) continue;

          result.push({
            itemId, itemName: item.name, buyCity, sellCity, buyPrice,
            askPrice, bidPrice, sellPrice, profit, profitPercent, buyDate, sellDate,
          });
        }
      }
    }

    const needle = search.trim().toLocaleLowerCase('tr-TR');
    return result
      .filter((row) => !needle || row.itemName.toLocaleLowerCase('tr-TR').includes(needle) || row.itemId.toLowerCase().includes(needle))
      .sort((a, b) => (b.profit * quantity) - (a.profit * quantity));
  }, [data, itemById, quality, saleMode, premium, quantity, minimumProfit, maxAgeHours, search]);

  const cityCount = selectedCities.length;
  const taxRate = premium ? '4%' : '8%';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-400 p-2 text-slate-950"><TrendingUp size={24} /></div>
            <div>
              <h1 className="text-lg font-black text-white sm:text-xl">Albion Europa <span className="text-amber-400">Pazar Rehberi</span></h1>
              <p className="text-xs text-slate-400">Europa sunucusunda alış-satış rotaları</p>
            </div>
          </div>
          <button onClick={fetchData} disabled={loading} className="flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 font-bold text-slate-950 disabled:opacity-60">
            <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{loading ? 'Fiyatlar alınıyor' : 'Fiyatları yenile'}</span>
            <span className="sm:hidden">{loading ? 'Yükleniyor' : 'Yenile'}</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:py-9">
        <section className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
          <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-900/60 p-6 sm:p-8">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300"><MapPin size={14} /> EUROPA SUNUCUSU</div>
            <h2 className="mb-3 text-2xl font-black text-white sm:text-3xl">Nereden alıp nerede satmalı?</h2>
            <p className="max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">Eşya ve şehirleri seç. Rehber, mevcut en ucuz satış ilanından alış ve seçtiğin satış yöntemine göre tahmini net kazancı hesaplasın.</p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-300">
              <span className="rounded-full bg-slate-950 px-3 py-2"><Info className="mr-1 inline" size={14} /> Veri oyuncu bildirimlerinden gelir</span>
              <span className="rounded-full bg-slate-950 px-3 py-2"><AlertTriangle className="mr-1 inline text-amber-400" size={14} /> Oyun içi fiyatı kontrol et</span>
            </div>
          </div>
          <div className="rounded-3xl border border-amber-400/20 bg-amber-400/5 p-6">
            <h3 className="mb-3 flex items-center gap-2 font-bold text-amber-300"><NavigationIcon /> Nasıl kullanılır?</h3>
            <ol className="space-y-2 text-sm leading-5 text-slate-300">
              <li><b className="text-amber-300">1.</b> Eşya kodunu ekle veya örnek listeden seç.</li>
              <li><b className="text-amber-300">2.</b> Bakmak istediğin şehirleri işaretle.</li>
              <li><b className="text-amber-300">3.</b> Yenile’ye bas; net kazanç ve fiyat yaşıyla rotayı karşılaştır.</li>
            </ol>
            <p className="mt-4 border-t border-amber-400/10 pt-3 text-xs leading-5 text-slate-400">Pazar verisi anlık oyun verisi değildir. API’de son bildirilen fiyatı gösterir; veri eskiyse rota listesine alınmaz.</p>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.1fr_1fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-white"><Package size={19} className="text-amber-400" /> Eşyalar</h3>
            <form onSubmit={addItems} className="flex flex-col gap-2 sm:flex-row">
              <input value={customItem} onChange={(event) => setCustomItem(event.target.value)} placeholder="Albion eşya kodu (örn. T4_BAG), birden fazla kodu virgülle ayır" className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-amber-400" />
              <button type="submit" className="flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 font-bold text-slate-950"><Plus size={17} /> Eşya ekle</button>
            </form>
            {notice && <p className="mt-2 text-xs text-amber-200" role="status">{notice}</p>}
            <p className="mt-2 text-xs leading-5 text-slate-500">Kodları <a className="text-amber-300 underline" href="https://www.albion-online-data.com/items" target="_blank" rel="noreferrer">Albion Data Project eşya aramasında</a> bulabilirsin. Özel eşyalar için API kodunu (UniqueName) buraya ekle.</p>
            <div className="mt-4 flex max-h-52 flex-wrap content-start gap-2 overflow-auto rounded-xl border border-slate-800 bg-slate-950/50 p-3">
              {items.length ? items.map((item) => (
                <span key={item.id} className="inline-flex max-w-full items-center gap-1 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200">
                  <span className="truncate" title={item.id}>{item.name}</span>
                  <button aria-label={item.id + ' listesinden çıkar'} onClick={() => removeItem(item.id)} className="ml-1 rounded-full p-0.5 text-slate-500 hover:bg-red-500/20 hover:text-red-300"><Trash2 size={13} /></button>
                </span>
              )) : <span className="text-sm text-slate-500">Henüz eşya eklenmedi.</span>}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-white"><MapPin size={19} className="text-amber-400" /> Şehirler <span className="text-sm font-normal text-slate-500">({cityCount} seçili)</span></h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {CITIES.map((city) => (
                <label key={city} className={'flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm ' + (selectedCities.includes(city) ? 'border-amber-400/50 bg-amber-400/10 text-amber-100' : 'border-slate-800 bg-slate-950 text-slate-400')}>
                  <input type="checkbox" checked={selectedCities.includes(city)} onChange={() => toggleCity(city)} className="accent-amber-400" />
                  <span className="truncate">{city}</span>
                </label>
              ))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-slate-400">Kalite
                <select value={quality} onChange={(event) => setQuality(Number(event.target.value))} className="mt-1 block w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white">
                  {[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value} — {['Normal', 'İyi', 'Olağanüstü', 'Mükemmel', 'Usta işi'][value - 1]}</option>)}
                </select>
              </label>
              <label className="text-xs text-slate-400">Maksimum veri yaşı
                <select value={maxAgeHours} onChange={(event) => setMaxAgeHours(Number(event.target.value))} className="mt-1 block w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white">
                  {FRESHNESS_OPTIONS.map((value) => <option key={value} value={value}>{value ? value + ' saat' : 'Sınır yok'}</option>)}
                </select>
              </label>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:flex-row sm:flex-wrap sm:items-end sm:p-5">
          <label className="min-w-44 flex-1 text-xs text-slate-400">Satış yöntemi
            <select value={saleMode} onChange={(event) => setSaleMode(event.target.value as SaleMode)} className="mt-1 block w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white">
              <option value="instant">Hemen sat — mevcut alış emri</option>
              <option value="order">Satış ilanı — bekleme ve kurulum ücreti</option>
            </select>
          </label>
          <label className="min-w-32 text-xs text-slate-400">Adet
            <input type="number" min="1" step="1" value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))} className="mt-1 block w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white" />
          </label>
          <label className="min-w-36 text-xs text-slate-400">En az net kâr
            <input type="number" min="0" step="100" value={minimumProfit} onChange={(event) => setMinimumProfit(Math.max(0, Number(event.target.value) || 0))} className="mt-1 block w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm text-white" />
          </label>
          <label className="flex h-11 items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-200">
            <input type="checkbox" checked={premium} onChange={(event) => setPremium(event.target.checked)} className="accent-amber-400" />
            Premium hesabım var
          </label>
          <div className="text-xs text-slate-500">Tahmini satış vergisi: {taxRate}{saleMode === 'order' ? ' + %2,5 ilan kurulum ücreti' : ''}</div>
        </section>

        <section>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-black text-white">Alış-satış rotaları <span className="text-sm font-normal text-slate-500">({opportunities.length})</span></h3>
              <p className="mt-1 text-xs text-slate-500">{lastFetch ? 'Son API sorgusu: ' + lastFetch.toLocaleTimeString('tr-TR') : 'Fiyatlar bekleniyor'}</p>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Sonuçlarda eşya ara..." className="w-full rounded-xl border border-slate-800 bg-slate-900 py-3 pl-10 pr-3 text-sm outline-none focus:border-amber-400" />
            </div>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-900 py-16 text-center"><RefreshCw size={32} className="mx-auto mb-3 animate-spin text-amber-400" /><p className="text-slate-300">Europa fiyatları alınıyor…</p><p className="mt-1 text-xs text-slate-500">{items.length} eşya · {cityCount} şehir</p></div>
          ) : error ? (
            <div role="alert" className="rounded-3xl border border-red-500/30 bg-red-500/10 p-6 text-center"><AlertTriangle size={30} className="mx-auto mb-3 text-red-300" /><p className="text-red-200">{error}</p><button onClick={fetchData} className="mt-4 rounded-xl bg-red-500 px-4 py-2 font-bold text-white">Tekrar dene</button></div>
          ) : notice && !data.length ? (
            <div className="rounded-3xl border border-amber-400/20 bg-amber-400/5 p-6 text-center text-sm text-amber-100">{notice}</div>
          ) : opportunities.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/50 px-5 py-14 text-center">
              <Package size={36} className="mx-auto mb-3 text-slate-600" />
              <p className="font-bold text-slate-300">Seçilen eşya ve filtrelerde güvenilir bir kâr rotası bulunamadı.</p>
              <p className="mt-2 text-sm text-slate-500">Şehirleri veya veri yaşını değiştirip fiyatları yenilemeyi dene. Eksik/eski pazar kayıtları fırsat olarak gösterilmez.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {opportunities.map((row) => (
                <article key={row.itemId + row.buyCity + row.sellCity} className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
                  <div className="flex items-start justify-between gap-3 p-5">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-xl bg-slate-800"><img src={RENDER_BASE + '/' + encodeURIComponent(row.itemId) + '.png'} alt="" className="h-12 w-12 object-contain" loading="lazy" /></div>
                      <div className="min-w-0"><h4 className="truncate font-bold text-white">{row.itemName}</h4><p className="truncate text-xs text-slate-500">{row.itemId} · Kalite {quality}</p></div>
                    </div>
                    <div className="text-right"><p className="whitespace-nowrap text-lg font-black text-emerald-300">+{formatSilver(row.profit * quantity)}</p><p className="text-xs text-emerald-400">%{row.profitPercent.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} net</p></div>
                  </div>
                  <div className="space-y-3 px-5 pb-5">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                      <div className="flex items-center gap-3"><Store size={17} className="text-sky-300" /><div className="flex-1"><p className="text-xs font-bold uppercase text-slate-500">Buradan al</p><p className="font-bold text-white">{row.buyCity}</p></div><div className="text-right"><p className="font-bold text-slate-200">{formatSilver(row.buyPrice)}</p><p className="text-[10px] text-slate-500">en düşük satış ilanı · hemen al</p></div></div>
                      <div className="my-2 flex justify-center text-amber-400"><ArrowDown size={16} /></div>
                      <div className="flex items-center gap-3"><Store size={17} className="text-violet-300" /><div className="flex-1"><p className="text-xs font-bold uppercase text-slate-500">Şurada sat</p><p className="font-bold text-white">{row.sellCity}</p></div><div className="text-right"><p className="font-bold text-slate-200">{formatSilver(row.sellPrice)}</p><p className="text-[10px] text-slate-500">{saleMode === 'instant' ? 'en yüksek alış emri' : 'en düşük satış ilanı'}</p></div></div>
                    </div>
                    <div className="rounded-2xl border border-amber-400/15 bg-amber-400/5 p-4 text-xs leading-5 text-slate-300">
                      <p className="mb-1 flex items-center gap-2 font-bold text-amber-200"><ShoppingBag size={14} /> Yapılacak işlem</p>
                      {quantity} adet {row.itemName} ürününü <b>{row.buyCity}</b> şehrinde yaklaşık {formatSilver(row.buyPrice)} / adet fiyatla satın al; <b>{row.sellCity}</b> şehrinde {saleMode === 'instant' ? 'mevcut alış emrine hemen sat' : 'satış ilanı olarak listele'}. Tahmini net: <b className="text-emerald-300">{formatSilver(row.profit * quantity)}</b>.
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                      <span><Clock3 size={13} className="mr-1 inline" /> Alış {freshnessLabel(row.buyDate)} · Satış {freshnessLabel(row.sellDate)}</span>
                      <span>Vergi ve ücretler tahmini dahildir</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="mx-auto mt-10 max-w-7xl border-t border-slate-900 px-4 py-7 text-center text-xs leading-5 text-slate-500">
        Albion Online Data Project tarafından paylaşılan topluluk verisini kullanır; resmî Albion Online aracı değildir. Veriler gecikebilir veya eksik olabilir. İşlem yapmadan önce oyun içindeki pazar fiyatlarını ve rotanın riskini kontrol et.
      </footer>
    </div>
  );
}

function NavigationIcon() {
  return <MapPin size={19} />;
}

export default App;
