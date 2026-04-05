import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  ArrowRight, 
  MapPin, 
  RefreshCw, 
  Search, 
  Info, 
  AlertTriangle,
  Package,
  Coins,
  Navigation,
  Store,
  Zap,
  Clock,
  ExternalLink
} from 'lucide-react';
import { MarketResponse, ArbitrageOpportunity, CITIES, ITEMS } from './types';

const API_BASE = "https://europe.albion-online-data.com/api/v2/stats/prices";
const RENDER_BASE = "https://render.albiononline.com/v1/item";

export default function App() {
  const [data, setData] = useState<MarketResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [minProfit, setMinProfit] = useState(1000);
  const [showOutliers, setShowOutliers] = useState(false);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const itemIds = ITEMS.map(i => i.id).join(',');
      const locations = CITIES.join(',');
      const response = await fetch(`${API_BASE}/${itemIds}.json?locations=${locations}&qualities=1`);
      if (!response.ok) throw new Error("API hatası oluştu. Lütfen daha sonra tekrar deneyin.");
      const json: MarketResponse[] = await response.json();
      setData(json);
      setLastFetch(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Veri çekilemedi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const opportunities = useMemo(() => {
    const results: ArbitrageOpportunity[] = [];

    ITEMS.forEach(item => {
      const itemPrices = data.filter(d => d.item_id === item.id);
      
      itemPrices.forEach(buyLoc => {
        // KURAL 1: Black Market'ten ürün ALINAMAZ. Sadece şehirlerden alınabilir.
        if (buyLoc.city === "Black Market") return;
        if (buyLoc.sell_price_min <= 0) return;

        itemPrices.forEach(sellLoc => {
          // Aynı şehirde ticaret yapılmaz
          if (buyLoc.city === sellLoc.city) return;
          
          const buyPrice = buyLoc.sell_price_min;
          const isBlackMarket = sellLoc.city === "Black Market";
          
          // KURAL 2: Satış fiyatı belirleme
          // Black Market'e satarken "Buy Order" (Hemen Sat) fiyatı kullanılır.
          // Şehir marketlerine satarken "Sell Order" (İlan Ver) fiyatı kullanılır.
          const sellPrice = isBlackMarket ? sellLoc.buy_price_max : sellLoc.sell_price_min;
          
          if (sellPrice <= 0) return;

          const profit = sellPrice - buyPrice;
          const profitPercent = (profit / buyPrice) * 100;

          // KURAL 3: Anomali ve Mantık Filtreleri
          // - Kar minimum kardan yüksek olmalı
          // - Kar oranı %5'ten büyük olmalı
          // - Kar oranı %500'den küçük olmalı (Eğer showOutliers kapalıysa)
          const isOutlier = profitPercent >= 500;
          
          if (profit > minProfit && profitPercent > 5) {
            if (!showOutliers && isOutlier) return;

            results.push({
              itemId: item.id,
              itemName: item.name,
              buyCity: buyLoc.city,
              buyPrice,
              sellCity: sellLoc.city,
              sellPrice,
              profit,
              profitPercent,
              lastUpdated: buyLoc.sell_price_min_date
            });
          }
        });
      });
    });

    return results
      .filter(o => o.itemName.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => b.profit - a.profit);
  }, [data, searchTerm, minProfit, showOutliers]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-amber-500/30">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              <TrendingUp className="text-slate-950 w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-xl tracking-tight text-white">Albion Europe <span className="text-amber-500">Market Guide</span></h1>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">Europa Server Al-Sat Rehberi</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {lastFetch && (
              <span className="text-xs text-slate-500 hidden sm:inline">
                Son Güncelleme: {lastFetch.toLocaleTimeString()}
              </span>
            )}
            <button 
              onClick={fetchData}
              disabled={loading}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50 group"
            >
              <RefreshCw className={`w-5 h-5 text-amber-500 ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Intro Section */}
        <section className="mb-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-3xl border border-slate-700/50 relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-3xl font-bold text-white mb-4">Hoş Geldin Maceracı! ⚔️</h2>
              <p className="text-slate-300 text-lg mb-6 leading-relaxed">
                Bu araç, Albion Online Avrupa sunucusundaki şehirler arası fiyat farklarını takip ederek 
                en karlı ticaret rotalarını bulmana yardımcı olur. "Buradan al, şurada sat" mantığıyla çalışır.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 bg-slate-950/50 px-4 py-2 rounded-full border border-slate-700">
                  <Info className="w-4 h-4 text-amber-500" />
                  <span className="text-sm">Veriler topluluk tarafından sağlanır.</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-950/50 px-4 py-2 rounded-full border border-slate-700">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span className="text-sm">Fiyatlar anlık değişebilir, her zaman kontrol et!</span>
                </div>
              </div>
            </div>
            <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />
          </div>

          <div className="bg-amber-500/5 border border-amber-500/20 p-8 rounded-3xl">
            <h3 className="text-amber-500 font-bold mb-4 flex items-center gap-2">
              <Navigation className="w-5 h-5" />
              Nasıl Kullanılır?
            </h3>
            <ul className="space-y-4 text-sm text-slate-300">
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center flex-shrink-0 font-bold">1</span>
                <span>Aşağıdaki listeden en karlı rotayı seç.</span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center flex-shrink-0 font-bold">2</span>
                <span>Belirtilen şehre git ve eşyayı satın al.</span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center flex-shrink-0 font-bold">3</span>
                <span>Diğer şehre taşı ve oradaki markette sat.</span>
              </li>
              <li className="mt-4 p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs text-slate-400">
                💡 İpucu: Caerleon rotaları tehlikelidir (Kırmızı Bölge), dikkatli ol!
              </li>
            </ul>
          </div>
        </section>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Eşya ara... (Örn: Bag, Horse)" 
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-4 bg-slate-900 border border-slate-800 rounded-2xl px-6 py-4">
              <label className="text-sm font-medium text-slate-400 whitespace-nowrap">Min. Kar:</label>
              <input 
                type="number" 
                className="bg-transparent w-24 text-white font-bold focus:outline-none"
                value={minProfit}
                onChange={(e) => setMinProfit(Number(e.target.value))}
              />
              <Coins className="w-5 h-5 text-amber-500" />
            </div>

            <button 
              onClick={() => setShowOutliers(!showOutliers)}
              className={`flex items-center gap-3 px-6 py-4 rounded-2xl border transition-all font-bold text-sm ${
                showOutliers 
                ? 'bg-amber-500/20 border-amber-500 text-amber-500' 
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <Zap className={`w-5 h-5 ${showOutliers ? 'fill-amber-500' : ''}`} />
              <span>Anomali Göster</span>
            </button>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <RefreshCw className="w-12 h-12 text-amber-500 animate-spin" />
            <p className="text-slate-400 animate-pulse">Piyasa verileri taranıyor...</p>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl text-center">
            <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-4" />
            <p className="text-red-400">{error}</p>
            <button onClick={fetchData} className="mt-4 text-sm font-bold text-white bg-red-500 px-6 py-2 rounded-full">Tekrar Dene</button>
          </div>
        ) : opportunities.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/30 rounded-3xl border border-dashed border-slate-800">
            <Package className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500 text-lg">Şu an karlı bir rota bulunamadı. Filtreleri değiştirmeyi dene.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {opportunities.map((opp, idx) => (
                <motion.div
                  key={`${opp.itemId}-${opp.buyCity}-${opp.sellCity}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden hover:border-amber-500/50 transition-all group flex flex-col"
                >
                  <div className="p-6 flex-1">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform p-2 border border-slate-700">
                          <img 
                            src={`${RENDER_BASE}/${opp.itemId}.png`} 
                            alt={opp.itemName} 
                            className="w-full h-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-lg leading-tight">{opp.itemName}</h4>
                          <span className="text-xs text-slate-500 uppercase font-bold tracking-tighter">{opp.itemId}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-emerald-400 font-black text-xl">+{opp.profit.toLocaleString()}</div>
                        <div className="text-xs text-emerald-500/70 font-bold">%{opp.profitPercent.toFixed(1)} Kar</div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Buy From */}
                      <div className="flex items-center gap-4 bg-slate-950/50 p-4 rounded-2xl border border-slate-800 relative group/buy">
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">
                          <Store className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-slate-500 font-bold uppercase">Buradan Al</p>
                          <p className="font-bold text-white">{opp.buyCity}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-300">{opp.buyPrice.toLocaleString()}</p>
                          <p className="text-[10px] text-slate-600">Market Fiyatı</p>
                        </div>
                      </div>

                      <div className="flex justify-center -my-2 relative z-10">
                        <div className="bg-slate-900 p-1 rounded-full border border-slate-800">
                          <ArrowRight className="w-5 h-5 text-amber-500" />
                        </div>
                      </div>

                      {/* Sell To */}
                      <div className="flex items-center gap-4 bg-slate-950/50 p-4 rounded-2xl border border-slate-800 relative group/sell">
                        <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-500">
                          {opp.sellCity === "Black Market" ? <Zap className="w-4 h-4" /> : <Store className="w-4 h-4" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-slate-500 font-bold uppercase">Şurada Sat</p>
                          <p className="font-bold text-white">{opp.sellCity}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-300">{opp.sellPrice.toLocaleString()}</p>
                          <p className="text-[10px] text-slate-600">
                            {opp.sellCity === "Black Market" ? "Hemen Sat" : "Market Fiyatı"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Instruction */}
                    <div className="mt-6 p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10">
                      <div className="flex items-start gap-3">
                        <Navigation className="w-4 h-4 text-amber-500 mt-1 flex-shrink-0" />
                        <div className="text-xs text-slate-300 leading-relaxed">
                          <strong className="text-amber-500 uppercase block mb-1">Talimat:</strong>
                          {opp.sellCity === "Black Market" ? (
                            <span>
                              <strong>{opp.buyCity}</strong> marketinden en ucuz fiyata al. 
                              Caerleon'daki <strong>Kara Borsa'ya (Black Market)</strong> götür ve 
                              "Sell" butonuna basarak <strong>Hemen Sat</strong>.
                            </span>
                          ) : (
                            <span>
                              <strong>{opp.buyCity}</strong> marketinden al. 
                              <strong>{opp.sellCity}</strong> marketine götür ve 
                              mevcut en düşük fiyattan 1 gümüş ucuza <strong>Satış İlanı Ver</strong>.
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-slate-800/50 px-6 py-3 flex justify-between items-center border-t border-slate-800">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                      <Clock className="w-3 h-3" />
                      {new Date(opp.lastUpdated).toLocaleTimeString()}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-amber-500/70 font-bold uppercase">
                      <TrendingUp className="w-3 h-3" />
                      Fırsat Aktif
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 py-12 border-t border-slate-900 mt-20">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3 opacity-50">
            <TrendingUp className="text-amber-500 w-5 h-5" />
            <span className="font-bold text-sm">Albion Europe Market Guide</span>
          </div>
          <div className="text-slate-500 text-xs text-center md:text-right max-w-md">
            Bu site Albion Online Data Project verilerini kullanır. Albion Online, Sandbox Interactive GmbH'nin tescilli markasıdır. 
            Veriler her zaman %100 doğru olmayabilir, oyun içinde kontrol etmeniz önerilir.
          </div>
        </div>
      </footer>
    </div>
  );
}
