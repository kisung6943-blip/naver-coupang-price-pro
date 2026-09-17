import React, { useState, useEffect } from "react";
import { 
  Search, Plus, Trash2, Edit2, Sparkles, LineChart as ChartIcon, 
  Calendar, ArrowUpDown, TrendingDown, TrendingUp, CheckCircle, 
  ExternalLink, FileSpreadsheet, Download, Upload, Info, AlertTriangle, 
  RefreshCw, Layers, X, Copy, Link as LinkIcon
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer 
} from "recharts";
import { Product, PriceLog } from "./types";
import { INITIAL_PRODUCTS, generateHistoricalLogs } from "./data";
import { supabase } from "./supabase";

export default function App() {
  // State for products and price logs
  const [products, setProducts] = useState<Product[]>([]);
  const [priceLogs, setPriceLogs] = useState<PriceLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // UI filter states
  const [selectedDate, setSelectedDate] = useState<string>("2026-09-16");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all"); // all, naver_cheaper, coupang_cheaper, same, no_coupang
  
  // Selected product for chart and quick logging
  const [selectedProductId, setSelectedProductId] = useState<string>("prod-6");
  
  // AI Parsing states
  const [aiInputText, setAiInputText] = useState<string>("");
  const [isAiParsing, setIsAiParsing] = useState(false);
  const [aiParseError, setAiParseError] = useState<string | null>(null);
  const [aiParsingPlatform, setAiParsingPlatform] = useState<"naver" | "coupang">("naver");
  const [localApiKey, setLocalApiKey] = useState(() => localStorage.getItem("gemini_api_key") || "");
  const [showApiKeyInput, setShowApiKeyInput] = useState(!import.meta.env.VITE_GEMINI_API_KEY && !localStorage.getItem("gemini_api_key"));
  const [aiInputImage, setAiInputImage] = useState<string | null>(null);
  
  // Keyword Rank AI parsing
  const [myStoreName, setMyStoreName] = useState(() => localStorage.getItem("my_store_name") || "ES리빙");
  const [activeAiKeywordIndex, setActiveAiKeywordIndex] = useState<{ index: number, platform: 'naver' | 'coupang' } | null>(null);
  const [isKeywordAiParsing, setIsKeywordAiParsing] = useState<boolean>(false);

  // Link Editing Modal states
  const [editingLinkProduct, setEditingLinkProduct] = useState<Product | null>(null);
  const [linkNaverUrl, setLinkNaverUrl] = useState<string>("");
  const [linkCoupangUrl, setLinkCoupangUrl] = useState<string>("");

  const openLinkModal = (product: Product) => {
    setEditingLinkProduct(product);
    setLinkNaverUrl(product.naverUrl || `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(product.name)}`);
    setLinkCoupangUrl(product.coupangUrl || `https://www.coupang.com/np/search?component=&q=${encodeURIComponent(product.name)}`);
  };

  const handleSaveLinks = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLinkProduct) return;

    const updatedProducts = products.map(p => {
      if (p.id === editingLinkProduct.id) {
        return {
          ...p,
          naverUrl: linkNaverUrl.trim(),
          coupangUrl: linkCoupangUrl.trim()
        };
      }
      return p;
    });

    saveToLocalStorage(updatedProducts, priceLogs);
    setEditingLinkProduct(null);
    showToast(`✅ [${editingLinkProduct.name}] 쇼핑몰 링크가 성공적으로 저장되었습니다!`);
  };

  const handleKeywordAiParse = async (index: number, text: string, platform: 'naver' | 'coupang') => {
    if (!text.trim()) return;
    
    setIsKeywordAiParsing(true);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || localApiKey;
      if (!apiKey) {
        throw new Error("API 키가 없습니다. 상단의 AI 가격 분석 폼에서 톱니바퀴 버튼을 눌러 API 키를 먼저 입력해주세요.");
      }
      
      const selectedProduct = products.find(p => p.id === selectedProductId);
      const keyword = selectedProduct?.keywords?.[index] || "";
      const queryContext = selectedProduct ? selectedProduct.name : "";

      const prompt = `You are an expert e-commerce rank auditor. 
Analyze the provided raw search results text from a Korean e-commerce site.
The user wants to find the exact ORGANIC ranking of ONE SPECIFIC PRODUCT they are monitoring.

[TARGET TO FIND]
1. Target Seller/Store Name: "${myStoreName}"
2. Target Product Name: "${queryContext}"

[CRITICAL COUNTING RULES - IGNORE ADS]
In Korean e-commerce, the first few items are usually Sponsored Ads (labeled as "광고" or "스폰서" or "파워링크" or "쇼핑검색광고").
You MUST completely IGNORE any product blocks that contain these ad labels. Do not include them in your counting at all.
Start counting Rank 1 from the FIRST organic (non-ad) product.

[CRITICAL MATCHING INSTRUCTION]
You must look for an item that is semantically the same product as the Target Product Name. 
If the Seller/Store Name is visible in the text block, it MUST match the Target Seller Name. 
HOWEVER, on platforms like Coupang, the seller name might not be shown in the search results. If the seller name is completely missing, you can match based on the Target Product Name alone.

[SPEED OPTIMIZATION - CRITICAL]
To make your response lightning fast, your "reasoning" field MUST be extremely short. DO NOT write out product names or full sentences.
Just write a comma-separated sequence of what you see until you hit the target, then STOP immediately.
Example reasoning: "AD, AD, ORG1, ORG2, ORG3(Target Found!)"

Return a JSON object containing the SINGLE numerical position (rank) of this specific product in the ORGANIC search results.
If you happen to find it multiple times in organic results, return them comma-separated (e.g. "3, 12"). If not found, return "-".

Text to analyze:
"""
${text}
"""

Return ONLY a valid JSON string (no markdown formatting, no \`\`\`json) with exactly this structure:
{
  "reasoning": "short sequence like 'AD, ORG1, ORG2(Target)'",
  "ranks": string (e.g. "3" or "3, 12" or "-")
}`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1 }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || "AI 서버와의 통신에 실패했습니다.");
      }

      const rawData = await response.json();
      const generatedText = rawData.candidates?.[0]?.content?.parts?.[0]?.text || "";
      let data;
      try {
        const cleanedText = generatedText.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
        data = JSON.parse(cleanedText);
      } catch (e) {
        throw new Error("AI 응답을 분석할 수 없습니다.");
      }

      if (data.ranks) {
        if (platform === 'naver') {
          handleKeywordRankChange(selectedProductId, index, data.ranks);
        } else {
          handleCoupangKeywordRankChange(selectedProductId, index, data.ranks);
        }
        showToast(`✅ [${keyword}] ${platform === 'naver' ? '네이버' : '쿠팡'} 순위(${data.ranks})가 자동 입력되었습니다!`);
      }
    } catch (error: any) {
      showToast(`⚠️ 순위 분석 에러: ${error.message}`);
    } finally {
      setIsKeywordAiParsing(false);
      setActiveAiKeywordIndex(null);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      const file = e.clipboardData.files[0];
      if (file.type.startsWith('image/')) {
        e.preventDefault();
        const reader = new FileReader();
        reader.onload = (event) => {
          setAiInputImage(event.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };
  
  // Manual / AI Edit form states (for selected product & selected date)
  const [editNaverPrice, setEditNaverPrice] = useState<string>("");
  const [editNaverShipping, setEditNaverShipping] = useState<string>("");
  const [editCoupangSeller, setEditCoupangSeller] = useState<string>("");
  const [editCoupangPrice, setEditCoupangPrice] = useState<string>("");
  const [editCoupangShipping, setEditCoupangShipping] = useState<string>("");
  
  // Manage Products state
  const [isManagingProducts, setIsManagingProducts] = useState<boolean>(false);
  const [newProductName, setNewProductName] = useState<string>("");
  const [newProductNaverUrl, setNewProductNaverUrl] = useState<string>("");
  const [newProductCoupangUrl, setNewProductCoupangUrl] = useState<string>("");
  
  // Toast notifications
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Initialize data from LocalStorage instantly, fallback to seed data, sync Supabase non-blocking
  useEffect(() => {
    const initData = () => {
      let currentProducts: Product[] = [];
      let currentLogs: PriceLog[] = [];

      // 1. Instantly load from LocalStorage synchronously
      const storedProducts = localStorage.getItem("price_monitor_products");
      const storedLogs = localStorage.getItem("price_monitor_logs");
      if (storedProducts && storedLogs) {
        try {
          currentProducts = JSON.parse(storedProducts);
          currentLogs = JSON.parse(storedLogs);
        } catch (e) {}
      }

      // 2. Fallback to INITIAL_PRODUCTS if LocalStorage is empty
      if (currentProducts.length === 0) {
        currentProducts = INITIAL_PRODUCTS;
        currentLogs = generateHistoricalLogs();
      }

      // Automatically enrich products with seed keywords if missing
      const seedLogs = generateHistoricalLogs();
      const updatedProducts = currentProducts.map(p => {
        const seedP = INITIAL_PRODUCTS.find(ip => ip.id === p.id || ip.name === p.name);
        return {
          ...p,
          keywords: (p.keywords && p.keywords.some(k => k)) 
            ? p.keywords 
            : (seedP?.keywords || ["휘슬러압력밥솥부품", "휘슬러고무패킹", "휘슬러압력밥솥패킹"])
        };
      });

      // Automatically enrich logs with seed keyword ranks and memos for 2026-07 if missing
      const updatedLogs = [...currentLogs];
      seedLogs.forEach(seed => {
        if (updatedProducts.some(p => p.id === seed.productId)) {
          const idx = updatedLogs.findIndex(l => l.productId === seed.productId && l.date === seed.date);
          if (idx >= 0) {
            const existing = updatedLogs[idx];
            const hasKeywordRanks = existing.keywordRanks && existing.keywordRanks.some(r => r);
            const hasCoupangRanks = existing.coupangKeywordRanks && existing.coupangKeywordRanks.some(r => r);
            
            updatedLogs[idx] = {
              ...existing,
              keywordRanks: hasKeywordRanks ? existing.keywordRanks : seed.keywordRanks,
              coupangKeywordRanks: hasCoupangRanks ? existing.coupangKeywordRanks : seed.coupangKeywordRanks,
              memo: existing.memo || seed.memo
            };
          } else {
            updatedLogs.push(seed);
          }
        }
      });

      // Set state and render INSTANTLY!
      setProducts(updatedProducts);
      setPriceLogs(updatedLogs);
      localStorage.setItem("price_monitor_products", JSON.stringify(updatedProducts));
      localStorage.setItem("price_monitor_logs", JSON.stringify(updatedLogs));
      setIsLoading(false);

      // 3. Background non-blocking sync with Supabase (with 1.5s timeout)
      const syncSupabase = async () => {
        try {
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Supabase timeout")), 1500)
          );
          
          const fetchPromise = Promise.all([
            supabase.from("products").select("*"),
            supabase.from("price_logs").select("*")
          ]);

          const [prodRes, logRes]: any = await Promise.race([fetchPromise, timeoutPromise]);
          
          if (prodRes?.data && prodRes.data.length > 0) {
            setProducts(prodRes.data);
            if (logRes?.data) setPriceLogs(logRes.data);
            localStorage.setItem("price_monitor_products", JSON.stringify(prodRes.data));
            if (logRes?.data) localStorage.setItem("price_monitor_logs", JSON.stringify(logRes.data));
          }
        } catch (err) {
          // Supabase timeout or network error - local data is already rendered instantly
        }
      };

      syncSupabase();
    };
    
    initData();
  }, []);

  // Restore real entered keyword ranks (e.g. 21위, 199위, 59위, 25위)
  const handleRestoreRealRanks = () => {
    const seedLogs = generateHistoricalLogs();
    const updatedLogs = priceLogs.map(existing => {
      const seed = seedLogs.find(s => s.productId === existing.productId && s.date === existing.date);
      if (seed && seed.keywordRanks && seed.keywordRanks.some(r => r)) {
        return {
          ...existing,
          keywordRanks: seed.keywordRanks,
          coupangKeywordRanks: seed.coupangKeywordRanks,
        };
      }
      return existing;
    });

    saveToLocalStorage(products, updatedLogs);
    showToast("✅ 실제 기록되어 있던 키워드 순위(21위, 199위, 59위, 25위 등)가 성공적으로 복원되었습니다!");
  };

  // Clear fake/dummy sample ranks with confirmation
  const handleClearDummyRanks = () => {
    if (confirm("등록하신 품목, 쇼핑몰 링크, 판매가, 배송비, 메모는 전혀 삭제되지 않고 안전하게 유지됩니다.\n\n예시용으로 자동 채워져 있던 샘플 키워드 순위 숫자만 지우시겠습니까?")) {
      const updatedLogs = priceLogs.map(l => ({
        ...l,
        keywordRanks: [],
        coupangKeywordRanks: []
      }));
      saveToLocalStorage(products, updatedLogs);
      showToast("🧹 샘플 키워드 순위만 초기화되었습니다. 품목 및 가격 데이터는 완벽히 보존됩니다!");
    }
  };

  // Sync state changes with localStorage and Supabase (non-blocking)
  const saveToLocalStorage = (updatedProducts: Product[], updatedLogs: PriceLog[]) => {
    setProducts(updatedProducts);
    setPriceLogs(updatedLogs);
    localStorage.setItem("price_monitor_products", JSON.stringify(updatedProducts));
    localStorage.setItem("price_monitor_logs", JSON.stringify(updatedLogs));
    
    setTimeout(async () => {
      try {
        if (updatedProducts.length > 0) await supabase.from("products").upsert(updatedProducts);
        if (updatedLogs.length > 0) await supabase.from("price_logs").upsert(updatedLogs);
      } catch (e) {
        console.error("Supabase sync error:", e);
      }
    }, 0);
  };

  // Toast Helper
  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Populate input fields when selected product or date changes
  useEffect(() => {
    const activeLog = priceLogs.find(
      (log) => log.productId === selectedProductId && log.date === selectedDate
    );
    
    if (activeLog) {
      setEditNaverPrice(activeLog.naverPrice.toString());
      setEditNaverShipping(activeLog.naverShipping.toString());
      setEditCoupangSeller(activeLog.coupangSeller || "");
      setEditCoupangPrice(activeLog.coupangPrice === 0 ? "" : activeLog.coupangPrice.toString());
      setEditCoupangShipping(activeLog.coupangShipping === 0 ? "" : activeLog.coupangShipping.toString());
    } else {
      // Find the most recent past log to carry over
      const pastLogs = priceLogs
        .filter((log) => log.productId === selectedProductId && log.date < selectedDate)
        .sort((a, b) => b.date.localeCompare(a.date));
        
      const mostRecentLog = pastLogs[0];
      
      if (mostRecentLog) {
        setEditNaverPrice(mostRecentLog.naverPrice.toString());
        setEditNaverShipping(mostRecentLog.naverShipping.toString());
        setEditCoupangSeller(mostRecentLog.coupangSeller || "");
        setEditCoupangPrice(mostRecentLog.coupangPrice === 0 ? "" : mostRecentLog.coupangPrice.toString());
        setEditCoupangShipping(mostRecentLog.coupangShipping === 0 ? "" : mostRecentLog.coupangShipping.toString());
      } else {
        setEditNaverPrice("");
        setEditNaverShipping("");
        setEditCoupangSeller("");
        setEditCoupangPrice("");
        setEditCoupangShipping("");
      }
    }
    setAiInputText("");
    setAiParseError(null);
  }, [selectedProductId, selectedDate, priceLogs]);

  const parsePrice = (val: any): number => {
    if (typeof val === "number") return isNaN(val) ? 0 : val;
    if (!val) return 0;
    const cleaned = String(val).replace(/[^0-9]/g, "");
    return cleaned ? parseInt(cleaned, 10) : 0;
  };

  const getOrCreateLogForDate = (productId: string, date: string): PriceLog => {
    const existingIndex = priceLogs.findIndex(l => l.productId === productId && l.date === date);
    if (existingIndex >= 0) return { ...priceLogs[existingIndex] };

    const pastLogs = priceLogs
      .filter(l => l.productId === productId && l.date < date)
      .sort((a, b) => b.date.localeCompare(a.date));
    const mostRecent = pastLogs[0];

    if (mostRecent) {
      return {
        ...mostRecent,
        id: `log-${productId}-${date}`,
        date: date,
      };
    }

    return {
      id: `log-${productId}-${date}`,
      date: date,
      productId,
      naverPrice: 0,
      naverShipping: 0,
      naverTotal: 0,
      coupangSeller: "",
      coupangPrice: 0,
      coupangShipping: 0,
      coupangTotal: 0,
      difference: 0,
      keywordRanks: [],
      coupangKeywordRanks: [],
    };
  };

  // Compute logs for the selected date
  const currentLogsForDate = products.map((prod) => {
    const log = priceLogs.find((l) => l.productId === prod.id && l.date === selectedDate);
    
    let baseLog: Partial<PriceLog> = {};
    let hasLog = false;
    let isCopied = false;
    let logId: string | null = null;

    if (log) {
      baseLog = log;
      hasLog = true;
      logId = log.id;
    } else {
      // Find the most recent log before selectedDate
      const pastLogs = priceLogs
        .filter((l) => l.productId === prod.id && l.date < selectedDate)
        .sort((a, b) => b.date.localeCompare(a.date));
        
      const mostRecentLog = pastLogs[0];
      if (mostRecentLog) {
        baseLog = mostRecentLog;
        hasLog = true;
        isCopied = true;
      }
    }

    const isSelected = prod.id === selectedProductId;

    const naverPrice = isSelected ? parsePrice(editNaverPrice) : parsePrice(baseLog.naverPrice);
    const naverShipping = isSelected ? parsePrice(editNaverShipping) : parsePrice(baseLog.naverShipping);
    const naverTotal = naverPrice > 0 ? (naverPrice + naverShipping) : 0;

    const coupangPrice = isSelected ? parsePrice(editCoupangPrice) : parsePrice(baseLog.coupangPrice);
    const coupangShipping = isSelected ? parsePrice(editCoupangShipping) : parsePrice(baseLog.coupangShipping);
    const coupangTotal = coupangPrice > 0 ? (coupangPrice + coupangShipping) : 0;

    const difference = (naverTotal > 0 && coupangTotal > 0)
      ? (naverTotal - coupangTotal)
      : (baseLog.difference ?? 0);

    return {
      ...prod,
      ...baseLog,
      id: prod.id,
      logId,
      hasLog,
      isCopied,
      date: selectedDate,
      naverPrice,
      naverShipping,
      naverTotal,
      coupangSeller: isSelected ? editCoupangSeller : (baseLog.coupangSeller || ""),
      coupangPrice,
      coupangShipping,
      coupangTotal,
      difference,
      keywordRanks: baseLog.keywordRanks || [],
      coupangKeywordRanks: baseLog.coupangKeywordRanks || [],
    };
  });

  // Filter & Search logic
  const filteredLogs = currentLogsForDate.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === "all") return matchesSearch;
    if (statusFilter === "naver_cheaper") {
      return matchesSearch && item.naverTotal > 0 && item.coupangTotal > 0 && item.difference < 0;
    }
    if (statusFilter === "coupang_cheaper") {
      return matchesSearch && item.naverTotal > 0 && item.coupangTotal > 0 && item.difference > 0;
    }
    if (statusFilter === "same") {
      return matchesSearch && item.naverTotal > 0 && item.coupangTotal > 0 && item.difference === 0;
    }
    if (statusFilter === "no_coupang") {
      return matchesSearch && (item.naverTotal === 0 || item.coupangTotal === 0);
    }
    return matchesSearch;
  });

  // Global metrics for selected date
  const metrics = (() => {
    const validLogs = currentLogsForDate.filter(l => l.naverTotal > 0);
    const withCoupang = validLogs.filter(l => l.coupangTotal > 0);
    
    const naverWins = withCoupang.filter(l => l.difference < 0).length;
    const coupangWins = withCoupang.filter(l => l.difference > 0).length;
    const samePrice = withCoupang.filter(l => l.difference === 0).length;
    const noCoupang = currentLogsForDate.filter(l => l.naverTotal === 0 || l.coupangTotal === 0).length;

    let totalDiff = 0;
    withCoupang.forEach(l => {
      totalDiff += l.difference;
    });
    const avgDiff = withCoupang.length > 0 ? Math.round(totalDiff / withCoupang.length) : 0;

    return {
      totalProducts: products.length,
      naverWins,
      coupangWins,
      samePrice,
      noCoupang,
      avgDiff,
    };
  })();

  // Handle saving prices manually
  const handleSavePrice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) return;

    const navPrice = parsePrice(editNaverPrice);
    const navShip = parsePrice(editNaverShipping);
    const coupPrice = parsePrice(editCoupangPrice);
    const coupShip = parsePrice(editCoupangShipping);
    
    const naverTotal = navPrice > 0 ? (navPrice + navShip) : 0;
    const coupangTotal = coupPrice > 0 ? (coupPrice + coupShip) : 0;
    const difference = (naverTotal > 0 && coupangTotal > 0) ? (naverTotal - coupangTotal) : 0;

    const baseLog = getOrCreateLogForDate(selectedProductId, selectedDate);

    const existingLogIndex = priceLogs.findIndex(
      (log) => log.productId === selectedProductId && log.date === selectedDate
    );

    const updatedLogs = [...priceLogs];
    const newLog: PriceLog = {
      ...baseLog,
      id: `log-${selectedProductId}-${selectedDate}`,
      date: selectedDate,
      productId: selectedProductId,
      naverPrice: navPrice,
      naverShipping: navShip,
      naverTotal,
      coupangSeller: editCoupangSeller.trim(),
      coupangPrice: coupPrice,
      coupangShipping: coupShip,
      coupangTotal,
      difference,
      keywordRanks: baseLog.keywordRanks || [],
      coupangKeywordRanks: baseLog.coupangKeywordRanks || [],
      memo: baseLog.memo || "",
    };

    if (existingLogIndex >= 0) {
      updatedLogs[existingLogIndex] = newLog;
    } else {
      updatedLogs.push(newLog);
    }

    saveToLocalStorage(products, updatedLogs);
    const prod = products.find(p => p.id === selectedProductId);
    showToast(`✅ [${prod?.name || ''}] ${selectedDate} 날짜의 가격 정보가 저장되었습니다!`);
  };

  // Direct inline price change from table
  const handleInlinePriceChange = (
    productId: string, 
    field: 'naverPrice' | 'naverShipping' | 'coupangSeller' | 'coupangPrice' | 'coupangShipping', 
    value: string
  ) => {
    const baseLog = getOrCreateLogForDate(productId, selectedDate);
    
    let navPrice = baseLog.naverPrice;
    let navShip = baseLog.naverShipping;
    let coupSeller = baseLog.coupangSeller || "";
    let coupPrice = baseLog.coupangPrice;
    let coupShip = baseLog.coupangShipping;

    if (field === 'naverPrice') navPrice = parsePrice(value);
    if (field === 'naverShipping') navShip = parsePrice(value);
    if (field === 'coupangSeller') coupSeller = value;
    if (field === 'coupangPrice') coupPrice = parsePrice(value);
    if (field === 'coupangShipping') coupShip = parsePrice(value);

    const naverTotal = navPrice > 0 ? (navPrice + navShip) : 0;
    const coupangTotal = coupPrice > 0 ? (coupPrice + coupShip) : 0;
    const difference = (naverTotal > 0 && coupangTotal > 0) ? (naverTotal - coupangTotal) : 0;

    const existingLogIndex = priceLogs.findIndex(
      (log) => log.productId === productId && log.date === selectedDate
    );

    const newLog: PriceLog = {
      ...baseLog,
      id: `log-${productId}-${selectedDate}`,
      date: selectedDate,
      productId: productId,
      naverPrice: navPrice,
      naverShipping: navShip,
      naverTotal,
      coupangSeller: coupSeller,
      coupangPrice: coupPrice,
      coupangShipping: coupShip,
      coupangTotal,
      difference,
    };

    const updatedLogs = [...priceLogs];
    if (existingLogIndex >= 0) {
      updatedLogs[existingLogIndex] = newLog;
    } else {
      updatedLogs.push(newLog);
    }

    // Sync right sidebar form inputs if editing the currently selected product
    if (productId === selectedProductId) {
      if (field === 'naverPrice') setEditNaverPrice(value);
      if (field === 'naverShipping') setEditNaverShipping(value);
      if (field === 'coupangSeller') setEditCoupangSeller(value);
      if (field === 'coupangPrice') setEditCoupangPrice(value);
      if (field === 'coupangShipping') setEditCoupangShipping(value);
    }

    saveToLocalStorage(products, updatedLogs);
  };

  const handleKeywordNameChange = (productId: string, index: number, value: string) => {
    const updatedProducts = products.map(p => {
      if (p.id === productId) {
        const keywords = [...(p.keywords || Array(6).fill(""))];
        keywords[index] = value;
        return { ...p, keywords };
      }
      return p;
    });
    saveToLocalStorage(updatedProducts, priceLogs);
  };

  const handleKeywordVolumeChange = (productId: string, index: number, value: string) => {
    const updatedProducts = products.map(p => {
      if (p.id === productId) {
        const keywordVolumes = [...(p.keywordVolumes || Array(6).fill(""))];
        keywordVolumes[index] = value;
        return { ...p, keywordVolumes };
      }
      return p;
    });
    saveToLocalStorage(updatedProducts, priceLogs);
  };

  const handleKeywordRankChange = (productId: string, index: number, value: string) => {
    const existingLogIndex = priceLogs.findIndex(
      (log) => log.productId === productId && log.date === selectedDate
    );
    const updatedLogs = [...priceLogs];
    const log = getOrCreateLogForDate(productId, selectedDate);
    const ranks = [...(log.keywordRanks || Array(6).fill(""))];
    ranks[index] = value;
    log.keywordRanks = ranks;

    if (existingLogIndex >= 0) {
      updatedLogs[existingLogIndex] = log;
    } else {
      updatedLogs.push(log);
    }
    saveToLocalStorage(products, updatedLogs);
  };

  const handleCoupangKeywordRankChange = (productId: string, index: number, value: string) => {
    const existingLogIndex = priceLogs.findIndex(
      (log) => log.productId === productId && log.date === selectedDate
    );
    const updatedLogs = [...priceLogs];
    const log = getOrCreateLogForDate(productId, selectedDate);
    const ranks = [...(log.coupangKeywordRanks || Array(6).fill(""))];
    ranks[index] = value;
    log.coupangKeywordRanks = ranks;

    if (existingLogIndex >= 0) {
      updatedLogs[existingLogIndex] = log;
    } else {
      updatedLogs.push(log);
    }
    saveToLocalStorage(products, updatedLogs);
  };

  const handleMemoChange = (productId: string, date: string, value: string) => {
    const existingLogIndex = priceLogs.findIndex(
      (log) => log.productId === productId && log.date === date
    );
    const updatedLogs = [...priceLogs];
    const log = getOrCreateLogForDate(productId, date);
    log.memo = value;

    if (existingLogIndex >= 0) {
      updatedLogs[existingLogIndex] = log;
    } else {
      updatedLogs.push(log);
    }
    saveToLocalStorage(products, updatedLogs);
  };

  // AI Parser trigger
  const handleAiParse = async () => {
    if (!aiInputText.trim() && !aiInputImage) {
      setAiParseError("분석할 텍스트나 이미지를 입력(붙여넣기)해 주세요.");
      return;
    }

    setIsAiParsing(true);
    setAiParseError(null);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || localApiKey;
      if (!apiKey) {
        setShowApiKeyInput(true);
        throw new Error("API 키가 설정되지 않았습니다. 톱니바퀴 버튼을 눌러 API 키를 직접 입력해주세요.");
      }
      
      const parts: any[] = [];
      const queryContext = aiInputText.trim() || (selectedProduct ? selectedProduct.name : "추출");

      const promptText = `You are an expert price auditor. 
Analyze the provided information (text and/or image) from a Korean e-commerce site (Naver Shopping or Coupang). 
Extract the primary selling price, shipping fee, seller name, product name, and the platform.
If multiple products exist (e.g. in a search results screenshot), focus heavily on finding the exact product named: "${queryContext}".
If the exact product is not found, extract the price for the most prominent or first product shown.

Text context provided by user:
"""
${aiInputText}
"""

Return ONLY a valid JSON string (no markdown formatting, no \`\`\`json) with exactly these fields:
{
  "platform": "naver" | "coupang" | "unknown",
  "price": number (the primary selling price, digits only),
  "shipping": number (the shipping fee, digits only, 0 if free),
  "seller": string (the seller name, if found),
  "productName": string (the parsed product name)
}`;

      parts.push({ text: promptText });

      if (aiInputImage) {
        const base64Data = aiInputImage.split(',')[1];
        const mimeType = aiInputImage.split(';')[0].split(':')[1];
        parts.push({
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        });
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: parts }],
          generationConfig: { temperature: 0.1 }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || "AI 분석 서버(Google)와의 통신에 실패했습니다.");
      }

      const rawData = await response.json();
      const generatedText = rawData.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      let data;
      try {
        const cleanedText = generatedText.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
        data = JSON.parse(cleanedText);
      } catch (parseErr) {
        throw new Error("AI가 응답한 데이터를 분석할 수 없습니다.");
      }
      data.success = true;

      if (data.success) {
        if (data.platform === "naver") {
          setEditNaverPrice(data.price ? data.price.toString() : "0");
          setEditNaverShipping(data.shipping ? data.shipping.toString() : "0");
          showToast(data.price ? "✅ 네이버 폼에 가격이 채워졌습니다! 맨 아래 주황색 [저장하기] 버튼을 눌러주세요." : "⚠️ 텍스트에서 가격을 찾지 못해 0원으로 입력되었습니다.");
        } else if (data.platform === "coupang") {
          setEditCoupangPrice(data.price ? data.price.toString() : "0");
          setEditCoupangShipping(data.shipping ? data.shipping.toString() : "0");
          setEditCoupangSeller(data.seller || "쿠팡");
          showToast(data.price ? "✅ 쿠팡 폼에 가격이 채워졌습니다! 맨 아래 주황색 [저장하기] 버튼을 눌러주세요." : "⚠️ 텍스트에서 가격을 찾지 못해 0원으로 입력되었습니다.");
        } else {
          if (aiParsingPlatform === "naver") {
            setEditNaverPrice(data.price ? data.price.toString() : "0");
            setEditNaverShipping(data.shipping ? data.shipping.toString() : "0");
            showToast(data.price ? "✅ 네이버 폼에 추출된 가격이 채워졌습니다! 아래 주황색 버튼으로 저장하세요." : "⚠️ 텍스트에서 숫자를 찾지 못했습니다. 진짜 가격이 포함된 글을 복사해주세요.");
          } else {
            setEditCoupangPrice(data.price ? data.price.toString() : "0");
            setEditCoupangShipping(data.shipping ? data.shipping.toString() : "0");
            setEditCoupangSeller(data.seller || "타판매자");
            showToast(data.price ? "✅ 쿠팡 폼에 추출된 가격이 채워졌습니다! 아래 주황색 버튼으로 저장하세요." : "⚠️ 텍스트에서 숫자를 찾지 못했습니다. 진짜 가격이 포함된 글을 복사해주세요.");
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      setAiParseError(err.message || "서버 통신에 실패했습니다.");
    } finally {
      setIsAiParsing(false);
    }
  };

  // Add new product
  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim()) return;

    const newId = `prod-${Date.now()}`;
    const newProduct: Product = {
      id: newId,
      name: newProductName.trim(),
      naverUrl: newProductNaverUrl.trim() || undefined,
      coupangUrl: newProductCoupangUrl.trim() || undefined,
    };

    const updatedProducts = [...products, newProduct];
    saveToLocalStorage(updatedProducts, priceLogs);
    
    setSelectedProductId(newId);
    setNewProductName("");
    setNewProductNaverUrl("");
    setNewProductCoupangUrl("");
    setIsManagingProducts(false);
    showToast("새로운 품목이 추가되었습니다.");
  };

  // Delete product
  const handleDeleteProduct = async (productId: string) => {
    if (confirm("정말로 이 품목과 연동된 가격 모니터링 로그를 삭제하시겠습니까?")) {
      const updatedProducts = products.filter((p) => p.id !== productId);
      const updatedLogs = priceLogs.filter((l) => l.productId !== productId);
      
      saveToLocalStorage(updatedProducts, updatedLogs);
      if (selectedProductId === productId) {
        setSelectedProductId(updatedProducts[0]?.id || "");
      }

      try {
        await supabase.from("products").delete().eq("id", productId);
        await supabase.from("price_logs").delete().eq("productId", productId);
      } catch (e) {
        console.error("Supabase delete error:", e);
      }

      showToast("품목이 성공적으로 삭제되었습니다.");
    }
  };

  const handleResetDefaultData = () => {
    const defaultProducts = INITIAL_PRODUCTS;
    const defaultLogs = generateHistoricalLogs();
    saveToLocalStorage(defaultProducts, defaultLogs);
    setSelectedProductId(defaultProducts[0]?.id || "");
    showToast("✅ 기본 14개 품목 데이터가 성공적으로 복원되었습니다!");
  };

  // Export database as JSON
  const handleExportData = () => {
    const dataStr = JSON.stringify({ products, priceLogs }, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `price_monitor_backup_${selectedDate}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    showToast("백업 파일이 내보내기 되었습니다.");
  };

  // Import database from JSON file
  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.products && parsed.priceLogs) {
            saveToLocalStorage(parsed.products, parsed.priceLogs);
            showToast("백업 데이터가 성공적으로 복구되었습니다!");
          } else {
            showToast("올바른 백업 형식이 아닙니다.", "error");
          }
        } catch (err) {
          showToast("파일을 읽는 과정에서 오류가 발생했습니다.", "error");
        }
      };
    }
  };

  // Fill sample text for testing the AI parser
  const fillSampleText = (platform: "naver" | "coupang") => {
    setAiParsingPlatform(platform);
    if (platform === "naver") {
      setAiInputText(
        `[네이버 스마트스토어 공식몰]\n품명: 휘슬러 프리미엄 고무패킹 22cm 신형\n고객평점: 4.8/5\n정상가: 9,000원\n오늘 하루 특가 할인 35% 적용\n최종 결제가: 5,890원\n배송비: 3,000원 (CJ대한통운)\n\n※ 해당 제품은 휘슬러 정품 고무씰을 사용하여 수명이 깁니다.`
      );
    } else {
      setAiInputText(
        `쿠팡 추천 상품!\n휘슬러 호환 보조손잡이 (구형 모델 호환용)\n판매가: 5,000원\n로켓배송 무료체험 가능\n일반 배송비: 3,500원\n판매 스토어명: 레세나 홀딩스\n배송 예정: 내일 오전 7시 전 도착 보장`
      );
    }
  };

  const getChartData = () => {
    const productLogs = priceLogs
      .filter((l) => l.productId === selectedProductId)
      .sort((a, b) => a.date.localeCompare(b.date));

    return productLogs.map((log) => ({
      date: log.date.substring(5),
      "네이버 합계": log.naverTotal > 0 ? log.naverTotal : null,
      "쿠팡 합계": log.coupangTotal > 0 ? log.coupangTotal : null,
    }));
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const chartData = getChartData();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans" id="app-root">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium ${
              toastMessage.type === "success" 
                ? "bg-emerald-600 text-white" 
                : "bg-rose-600 text-white"
            }`}
            id="toast-notification"
          >
            {toastMessage.type === "success" ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-slate-900 text-white shadow-md border-b border-slate-800" id="main-header">
        <div className="max-w-[1600px] mx-auto px-4 py-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 text-slate-950 p-2.5 rounded-xl font-bold shadow-md flex items-center justify-center">
              <FileSpreadsheet size={24} className="text-slate-950" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight flex items-center gap-2" id="header-title">
                <span>네이버 & 쿠팡 가격 비교 모니터링</span>
                <span className="bg-amber-500 text-slate-950 text-xs px-2 py-0.5 rounded-md font-extrabold uppercase">PRO</span>
              </h1>
              <p className="text-xs text-slate-400">매일의 최저가 차액 추적 및 실시간 경쟁 분석 전용 대시보드</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            {/* Date Picker */}
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
              <Calendar size={16} className="text-amber-500" />
              <input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-white text-sm outline-none cursor-pointer border-none font-medium"
                id="date-picker"
              />
            </div>

            {/* Backups */}
            <div className="flex items-center gap-1.5">
              <button 
                onClick={handleExportData}
                title="데이터 백업 받기"
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 text-sm font-medium flex items-center gap-1.5 transition-colors"
                id="btn-export"
              >
                <Download size={15} />
                <span className="hidden sm:inline">백업 추출</span>
              </button>
              
              <label 
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 text-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                id="label-import"
              >
                <Upload size={15} />
                <span className="hidden sm:inline">백업 복구</span>
                <input 
                  type="file" 
                  accept=".json" 
                  onChange={handleImportData}
                  className="hidden" 
                />
              </label>

              <button 
                onClick={handleResetDefaultData}
                title="기본 14개 모니터링 품목 복원하기"
                className="bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 px-3 py-1.5 rounded-lg border border-slate-700 text-sm font-medium flex items-center gap-1.5 transition-colors"
                id="btn-reset-default"
              >
                <RefreshCw size={14} />
                <span className="hidden sm:inline">기본 품목 복원</span>
              </button>

              <button 
                onClick={handleRestoreRealRanks}
                title="실제 기록되어 있던 순위 데이터(21위, 199위, 59위, 25위 등)를 복원합니다."
                className="bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 px-3 py-1.5 rounded-lg border border-slate-700 text-sm font-medium flex items-center gap-1.5 transition-colors"
                id="btn-restore-real-header"
              >
                <RefreshCw size={14} />
                <span className="hidden sm:inline">실제 순위 복원</span>
              </button>

              <button 
                onClick={handleClearDummyRanks}
                title="샘플로 자동 채워져 있던 더미 순위 데이터를 초기화합니다."
                className="bg-slate-800 hover:bg-slate-700 text-rose-400 hover:text-rose-300 px-3 py-1.5 rounded-lg border border-slate-700 text-sm font-medium flex items-center gap-1.5 transition-colors"
                id="btn-clear-dummy-header"
              >
                <Trash2 size={14} />
                <span className="hidden sm:inline">더미 순위 초기화</span>
              </button>

              <button 
                onClick={() => setIsManagingProducts(true)}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-3.5 py-1.5 rounded-lg font-semibold text-sm flex items-center gap-1.5 shadow-sm transition-all"
                id="btn-manage-products"
              >
                <Plus size={16} />
                <span>품목 관리</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1600px] mx-auto px-4 py-6 sm:px-6 lg:px-8 w-full flex flex-col gap-6" id="main-content">
        
        {/* Statistics Widgets */}
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-4" id="stats-section">
          
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between" id="stat-card-total">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">모니터링 품목</span>
              <Layers size={18} className="text-slate-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-950">{metrics.totalProducts}</span>
              <span className="text-xs text-slate-500">개 등록됨</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between" id="stat-card-naver-win">
            <div className="flex items-center justify-between text-amber-600">
              <span className="text-xs font-semibold uppercase tracking-wider">네이버가 더 저렴</span>
              <TrendingDown size={18} className="text-amber-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-600">{metrics.naverWins}</span>
              <span className="text-xs text-slate-500">/{metrics.totalProducts - metrics.noCoupang} 품목</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between" id="stat-card-coupang-win">
            <div className="flex items-center justify-between text-blue-600">
              <span className="text-xs font-semibold uppercase tracking-wider">쿠팡이 더 저렴</span>
              <TrendingUp size={18} className="text-blue-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-blue-600">{metrics.coupangWins}</span>
              <span className="text-xs text-slate-500">/{metrics.totalProducts - metrics.noCoupang} 품목</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between" id="stat-card-same">
            <div className="flex items-center justify-between text-slate-600">
              <span className="text-xs font-semibold uppercase tracking-wider">동일가 비율</span>
              <CheckCircle size={18} className="text-slate-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-700">{metrics.samePrice}</span>
              <span className="text-xs text-slate-500">품목</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between col-span-2 lg:col-span-1" id="stat-card-avg-diff">
            <div className="flex items-center justify-between text-slate-600">
              <span className="text-xs font-semibold uppercase tracking-wider">평균 차액 (네-쿠)</span>
              <ArrowUpDown size={18} className="text-slate-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className={`text-2xl font-bold ${metrics.avgDiff < 0 ? 'text-amber-600' : metrics.avgDiff > 0 ? 'text-blue-600' : 'text-slate-700'}`}>
                {metrics.avgDiff > 0 ? `+${metrics.avgDiff.toLocaleString()}` : metrics.avgDiff.toLocaleString()}
              </span>
              <span className="text-xs text-slate-500">원</span>
            </div>
          </div>

        </section>

        {/* Dashboard Grid split into Left (Table) and Right (Detail / AI Parser) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start" id="dashboard-layout-grid">
          
          {/* Left panel: Product Pricing Table (9 cols on desktop) */}
          <div className="lg:col-span-9 flex flex-col gap-4 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs" id="table-panel">
            
            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-100 pb-4" id="filters-bar">
              <div className="relative w-full sm:w-72">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="품목명을 검색해 주세요..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 bg-slate-50"
                  id="search-input"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <span className="text-xs text-slate-500 font-medium whitespace-nowrap">필터:</span>
                <select 
                  value={statusFilter} 
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs bg-slate-100 hover:bg-slate-200 border-none outline-none rounded-lg px-2.5 py-1.5 font-medium cursor-pointer text-slate-700"
                  id="status-filter-select"
                >
                  <option value="all">전체 품목</option>
                  <option value="naver_cheaper">네이버가 더 저렴 (차액 &lt; 0)</option>
                  <option value="coupang_cheaper">쿠팡이 더 저렴 (차액 &gt; 0)</option>
                  <option value="same">가격 동일 (차액 = 0)</option>
                  <option value="no_coupang">쿠팡 미등록/비교불가</option>
                </select>
              </div>
            </div>

            {/* Table Area (Horizontal scrolling for safety) */}
            <div className="overflow-x-auto rounded-lg border border-slate-100" id="table-container">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 font-medium border-b border-slate-100 text-[11px] uppercase tracking-wider">
                    <th className="py-2 px-1.5 text-center w-8">번호</th>
                    <th className="py-2 px-1.5 min-w-[160px]">모니터링 품목</th>
                    <th className="py-2 px-1 text-right bg-amber-50/50 text-amber-900 border-l border-slate-100 font-bold whitespace-nowrap">네이버 판매가</th>
                    <th className="py-2 px-1 text-right bg-amber-50/50 text-amber-900 whitespace-nowrap">배송비</th>
                    <th className="py-2 px-1.5 text-right bg-amber-100/60 text-amber-950 font-bold border-r border-slate-100 whitespace-nowrap" style={{ backgroundColor: "#FFF2CC" }}>네이버 합계</th>
                    <th className="py-2 px-1 text-center bg-blue-50/50 text-blue-900 whitespace-nowrap">타판매자</th>
                    <th className="py-2 px-1 text-right bg-blue-50/50 text-blue-900 font-bold whitespace-nowrap">쿠팡 판매가</th>
                    <th className="py-2 px-1 text-right bg-blue-50/50 text-blue-900 whitespace-nowrap">배송비</th>
                    <th className="py-2 px-1.5 text-right text-blue-950 font-bold border-r border-slate-100 whitespace-nowrap" style={{ backgroundColor: "#DDEBF7" }}>쿠팡 합계</th>
                    <th className="py-2 px-1.5 text-right font-bold whitespace-nowrap">차액</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={10} className="text-center py-20">
                        <div className="flex flex-col items-center justify-center">
                          <RefreshCw size={28} className="text-slate-300 animate-spin mb-3" />
                          <p className="text-slate-500 font-medium">데이터를 불러오는 중입니다...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-10 text-slate-400">
                        <Info size={24} className="mx-auto mb-2 text-slate-300" />
                        <p className="mb-2">조건에 일치하는 모니터링 품목이 없습니다.</p>
                        <button 
                          onClick={handleResetDefaultData}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-all shadow-xs inline-flex items-center gap-1.5"
                        >
                          <RefreshCw size={13} /> 기본 14개 품목 복원하기
                        </button>
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((item, idx) => {
                      const isSelected = item.id === selectedProductId;
                      const isNaverCheaper = item.naverTotal > 0 && item.coupangTotal > 0 && item.difference < 0;
                      const isCoupangCheaper = item.naverTotal > 0 && item.coupangTotal > 0 && item.difference > 0;

                      return (
                        <React.Fragment key={item.id}>
                          <tr 
                            onClick={() => setSelectedProductId(item.id)}
                            className={`group hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-100 ${
                              isSelected ? "bg-slate-100/70 font-semibold border-l-4 border-l-amber-500" : ""
                            }`}
                            id={`row-${item.id}`}
                          >
                            <td className="py-2 px-1 text-center text-xs text-slate-400 group-hover:text-slate-600">
                              {idx + 1}
                            </td>
                            
                            <td className="py-2 px-1.5 min-w-[160px]">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-slate-900 text-xs line-clamp-1">{item.name}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(item.name);
                                    showToast(`📋 [${item.name}] 상품명이 복사되었습니다!`);
                                  }}
                                  className="inline-flex items-center gap-0.5 text-[9px] text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-1 py-0.5 rounded transition-all font-semibold shrink-0"
                                  title="상품명 복사하기"
                                >
                                  <Copy size={9} /> 복사
                                </button>
                              </div>
                              
                              <div className="flex items-center gap-1 mt-1 flex-wrap">
                                {item.naverUrl ? (
                                  <div className="inline-flex items-center bg-amber-50 border border-amber-200/80 rounded overflow-hidden shadow-2xs">
                                    <a 
                                      href={item.naverUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-[9px] text-amber-800 hover:bg-amber-100 px-1 py-0.5 flex items-center gap-0.5 font-medium transition-colors border-r border-amber-200/60"
                                      title="네이버 쇼핑 페이지 열기"
                                    >
                                      네이버 <ExternalLink size={7} />
                                    </a>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(item.naverUrl!);
                                        showToast(`📋 [네이버 쇼핑 URL] 복사되었습니다!`);
                                      }}
                                      className="text-[9px] text-amber-700 hover:bg-amber-100 px-1 py-0.5 flex items-center gap-0.5 font-medium transition-colors"
                                      title="네이버 쇼핑 URL 복사하기"
                                    >
                                      <Copy size={8} />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openLinkModal(item);
                                    }}
                                    className="text-[9px] text-amber-600 hover:text-amber-800 border border-dashed border-amber-300 px-1 py-0.5 rounded flex items-center gap-0.5 font-medium"
                                  >
                                    + 네이버
                                  </button>
                                )}

                                {item.coupangUrl ? (
                                  <div className="inline-flex items-center bg-blue-50 border border-blue-200/80 rounded overflow-hidden shadow-2xs">
                                    <a 
                                      href={item.coupangUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-[9px] text-blue-800 hover:bg-blue-100 px-1 py-0.5 flex items-center gap-0.5 font-medium transition-colors border-r border-blue-200/60"
                                      title="쿠팡 쇼핑 페이지 열기"
                                    >
                                      쿠팡 <ExternalLink size={7} />
                                    </a>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(item.coupangUrl!);
                                        showToast(`📋 [쿠팡 바로가기 URL] 복사되었습니다!`);
                                      }}
                                      className="text-[9px] text-blue-700 hover:bg-blue-100 px-1 py-0.5 flex items-center gap-0.5 font-medium transition-colors"
                                      title="쿠팡 바로가기 URL 복사하기"
                                    >
                                      <Copy size={8} />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openLinkModal(item);
                                    }}
                                    className="text-[9px] text-blue-600 hover:text-blue-800 border border-dashed border-blue-300 px-1 py-0.5 rounded flex items-center gap-0.5 font-medium"
                                  >
                                    + 쿠팡
                                  </button>
                                )}

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openLinkModal(item);
                                  }}
                                  className="text-[9px] text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-1 py-0.5 rounded flex items-center gap-0.5 font-medium transition-colors"
                                  title="쇼핑몰 링크 수정하기"
                                >
                                  <LinkIcon size={8} /> 링크
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteProduct(item.id);
                                  }}
                                  className="text-[9px] text-rose-500 hover:text-rose-700 flex items-center gap-0.5 ml-auto mr-1 font-semibold"
                                  title="이 품목 삭제하기"
                                >
                                  <Trash2 size={9} /> 삭제
                                </button>
                              </div>
                            </td>

                            <td className="py-2 px-1 text-right bg-amber-50/20 text-slate-800">
                              <input
                                type="number"
                                placeholder="0"
                                value={item.naverPrice > 0 ? item.naverPrice : ""}
                                onChange={(e) => handleInlinePriceChange(item.id, 'naverPrice', e.target.value)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedProductId(item.id);
                                }}
                                className="w-16 text-right bg-white hover:bg-amber-50/80 focus:bg-white border border-slate-200 focus:border-amber-500 rounded p-1 text-xs outline-none font-semibold text-slate-800 transition-all placeholder-slate-300"
                                title="네이버 판매가 직접 입력"
                              />
                            </td>

                            <td className="py-2 px-1 text-right bg-amber-50/20 text-slate-500 text-xs">
                              <input
                                type="number"
                                placeholder="0"
                                value={item.naverShipping > 0 ? item.naverShipping : (item.naverShipping === 0 && item.naverPrice > 0 ? "0" : "")}
                                onChange={(e) => handleInlinePriceChange(item.id, 'naverShipping', e.target.value)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedProductId(item.id);
                                }}
                                className="w-12 text-right bg-white hover:bg-amber-50/80 focus:bg-white border border-slate-200 focus:border-amber-500 rounded p-1 text-xs outline-none transition-all font-medium text-slate-700 placeholder-slate-300"
                                title="네이버 배송비 (0=무료)"
                              />
                            </td>

                            <td 
                              className={`py-2 px-1.5 text-right font-semibold border-r border-slate-100 whitespace-nowrap transition-all ${
                                isNaverCheaper ? "bg-amber-100 text-amber-950 ring-2 ring-emerald-500 ring-inset" : "bg-amber-50 text-slate-900"
                              }`}
                              style={!isNaverCheaper ? { backgroundColor: "#FFF9E6" } : undefined}
                            >
                              {item.naverTotal > 0 ? `${item.naverTotal.toLocaleString()}원` : "-"}
                            </td>

                            <td className="py-2 px-1 text-center bg-blue-50/25 text-slate-600 text-xs">
                              <input
                                type="text"
                                placeholder="판매자"
                                value={item.coupangSeller || ""}
                                onChange={(e) => handleInlinePriceChange(item.id, 'coupangSeller', e.target.value)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedProductId(item.id);
                                }}
                                className="w-14 text-center bg-white hover:bg-blue-50/80 focus:bg-white border border-slate-200 focus:border-blue-500 rounded p-1 text-xs outline-none transition-all font-medium text-slate-700 placeholder-slate-300"
                                title="쿠팡/타판매자 이름 입력"
                              />
                            </td>

                            <td className="py-2 px-1 text-right bg-blue-50/25 text-slate-800">
                              <input
                                type="number"
                                placeholder="0"
                                value={item.coupangPrice > 0 ? item.coupangPrice : ""}
                                onChange={(e) => handleInlinePriceChange(item.id, 'coupangPrice', e.target.value)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedProductId(item.id);
                                }}
                                className="w-16 text-right bg-white hover:bg-blue-50/80 focus:bg-white border border-slate-200 focus:border-blue-500 rounded p-1 text-xs outline-none transition-all font-semibold text-slate-800 placeholder-slate-300"
                                title="쿠팡 판매가 직접 입력"
                              />
                            </td>

                            <td className="py-2 px-1 text-right bg-blue-50/25 text-slate-500 text-xs">
                              <input
                                type="number"
                                placeholder="0"
                                value={item.coupangShipping > 0 ? item.coupangShipping : (item.coupangShipping === 0 && item.coupangPrice > 0 ? "0" : "")}
                                onChange={(e) => handleInlinePriceChange(item.id, 'coupangShipping', e.target.value)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedProductId(item.id);
                                }}
                                className="w-12 text-right bg-white hover:bg-blue-50/80 focus:bg-white border border-slate-200 focus:border-blue-500 rounded p-1 text-xs outline-none transition-all font-medium text-slate-700 placeholder-slate-300"
                                title="쿠팡 배송비 (0=무료)"
                              />
                            </td>

                            <td 
                              className={`py-3 px-3 text-right font-semibold border-r border-slate-100 transition-all ${
                                isCoupangCheaper ? "bg-blue-100 text-blue-950 ring-2 ring-emerald-500 ring-inset" : "bg-blue-50 text-slate-900"
                              }`}
                              style={!isCoupangCheaper ? { backgroundColor: "#F2F6FA" } : undefined}
                            >
                              {item.coupangTotal > 0 ? `${item.coupangTotal.toLocaleString()}원` : "-"}
                            </td>

                            <td className="py-3 px-3 text-right font-semibold">
                              {item.naverTotal > 0 && item.coupangTotal > 0 ? (
                                <span className={item.difference < 0 ? "text-amber-600" : item.difference > 0 ? "text-blue-600" : "text-slate-600"}>
                                  {item.difference > 0 ? `+${item.difference.toLocaleString()}` : item.difference.toLocaleString()}원
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between mt-2 text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>네이버 우위</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block"></span>쿠팡 우위</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block"></span>초록색 하이라이트: 해당 품목의 최저가 총액</span>
              </div>
              <span className="font-semibold">품목 행을 클릭하시면 가격 추세 차트와 AI 가격 파서가 오른쪽에 나타납니다.</span>
            </div>

            {/* Keyword Tracking & Management (Full width under table) */}
            {selectedProduct && (
              <div className="mt-6 border-t-2 border-slate-100 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="bg-emerald-500 text-white p-1.5 rounded-lg shadow-sm">
                      <Search size={18} />
                    </div>
                    <h3 className="font-bold text-slate-800 text-base">일별 키워드 순위 추적 및 관리</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1.5 gap-1.5 shadow-sm" title="AI가 이 스토어명의 상품만 찾습니다.">
                      <span className="text-xs font-bold text-emerald-700">🛒 내 스토어명:</span>
                      <input 
                        type="text"
                        value={myStoreName}
                        onChange={(e) => {
                          setMyStoreName(e.target.value);
                          localStorage.setItem("my_store_name", e.target.value);
                        }}
                        className="w-24 text-xs font-bold text-slate-800 bg-white border border-emerald-200 rounded px-1.5 py-0.5 outline-none focus:border-emerald-500"
                        placeholder="예: ES리빙"
                      />
                    </div>
                    <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-md font-bold">
                      선택된 품목: <span className="text-slate-800">{selectedProduct.name}</span>
                    </span>
                    <button
                      onClick={handleRestoreRealRanks}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md shadow-sm transition-all"
                      title="실제 기록되어 있던 순위 데이터(21위, 199위, 59위, 25위 등)를 복원합니다."
                    >
                      <RefreshCw size={13} /> 실제 순위 복원
                    </button>
                    <button
                      onClick={handleClearDummyRanks}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md shadow-sm transition-all"
                      title="샘플로 자동 채워져 있던 더미 순위 데이터를 깨끗이 초기화합니다."
                    >
                      <Trash2 size={13} /> 더미 순위 데이터 초기화
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-6">
                  {/* Top: Input fields */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col gap-4 shadow-sm">
                    <div className="flex justify-between items-center text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> {selectedDate} 네이버 키워드 순위 입력</span>
                      <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-xs font-semibold">✓ 자동 저장됨</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Array.from({ length: 6 }).map((_, i) => {
                        const keywordName = selectedProduct?.keywords?.[i] || "";
                        const activeLog = priceLogs.find(l => l.productId === selectedProductId && l.date === selectedDate);
                        const keywordRank = activeLog?.keywordRanks?.[i] || "";
                        return (
                          <div key={i} className="flex flex-col gap-1.5">
                            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition-all shadow-xs">
                              <span className="bg-slate-200/70 text-slate-500 font-bold px-3 py-2.5 text-sm border-r border-slate-200">{i+1}</span>
                              <input 
                                type="text" 
                                placeholder="키워드 입력"
                                value={keywordName}
                                onChange={(e) => handleKeywordNameChange(selectedProductId, i, e.target.value)}
                                className="w-full text-sm px-2 py-2.5 outline-none text-slate-800 font-medium bg-transparent placeholder-slate-400"
                              />
                              <div className="w-px h-6 bg-slate-200 shrink-0"></div>
                              <input 
                                type="text" 
                                placeholder="검색량"
                                value={selectedProduct?.keywordVolumes?.[i] || ""}
                                onChange={(e) => handleKeywordVolumeChange(selectedProductId, i, e.target.value)}
                                className="w-14 text-[11px] px-1 py-2.5 outline-none text-slate-500 font-medium text-center shrink-0 placeholder-slate-300 bg-transparent"
                                title="월간 검색량"
                              />
                              <div className="w-px h-6 bg-slate-200 shrink-0"></div>
                              <input 
                                type="text" 
                                placeholder="순위"
                                value={keywordRank}
                                onChange={(e) => handleKeywordRankChange(selectedProductId, i, e.target.value)}
                                className="w-12 text-sm px-1 py-2.5 outline-none text-emerald-600 font-bold text-center shrink-0 placeholder-slate-300 bg-transparent"
                              />
                              <button 
                                onClick={() => setActiveAiKeywordIndex(activeAiKeywordIndex?.index === i && activeAiKeywordIndex?.platform === 'naver' ? null : { index: i, platform: 'naver' })}
                                className={`px-2 py-2.5 text-xs font-bold border-l border-slate-200 hover:bg-emerald-100 transition-colors ${activeAiKeywordIndex?.index === i && activeAiKeywordIndex?.platform === 'naver' ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}
                                title="AI 네이버 순위 분석"
                              >
                                ✨
                              </button>
                            </div>

                            {activeAiKeywordIndex?.index === i && activeAiKeywordIndex?.platform === 'naver' && (
                              <div className="bg-emerald-50/80 p-2.5 rounded-lg border border-emerald-200 flex flex-col gap-2 shadow-inner mt-1">
                                <div className="text-[11px] text-emerald-800 font-bold flex justify-between items-center">
                                  <span>🚀 네이버 '{keywordName || "키워드"}' 검색결과 복사/붙여넣기</span>
                                  <button onClick={() => setActiveAiKeywordIndex(null)} className="text-emerald-500 hover:text-emerald-700 font-bold">✕</button>
                                </div>
                                <textarea
                                  placeholder="네이버 검색 결과 화면 전체(Ctrl+A -> Ctrl+C) 후 여기에 붙여넣기(Ctrl+V)"
                                  className="w-full text-[10px] p-2 outline-none border border-emerald-200 rounded resize-none h-16 focus:ring-1 focus:ring-emerald-400 bg-white placeholder-emerald-800/30 text-emerald-900"
                                  onPaste={(e) => {
                                    const text = e.clipboardData.getData('text');
                                    if (text) {
                                      e.preventDefault();
                                      handleKeywordAiParse(i, text, 'naver');
                                    }
                                  }}
                                  disabled={isKeywordAiParsing}
                                ></textarea>
                                {isKeywordAiParsing && (
                                  <div className="text-[10px] text-emerald-600 font-bold animate-pulse text-center flex items-center justify-center gap-1">
                                    <Sparkles size={12} /> AI가 네이버 순위를 분석 중입니다...
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Coupang: Input fields */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col gap-4 shadow-sm">
                    <div className="flex justify-between items-center text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span> {selectedDate} 쿠팡 키워드 순위 입력</span>
                      <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-xs font-semibold">✓ 자동 저장됨</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Array.from({ length: 6 }).map((_, i) => {
                        const keywordName = selectedProduct?.keywords?.[i] || "";
                        const activeLog = priceLogs.find(l => l.productId === selectedProductId && l.date === selectedDate);
                        const keywordRankCoupang = activeLog?.coupangKeywordRanks?.[i] || "";
                        return (
                          <div key={i} className="flex flex-col gap-1.5">
                            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all shadow-xs">
                              <span className="bg-slate-200/70 text-slate-500 font-bold px-3 py-2.5 text-sm border-r border-slate-200">{i+1}</span>
                              <input 
                                type="text" 
                                placeholder="키워드 입력"
                                value={keywordName}
                                onChange={(e) => handleKeywordNameChange(selectedProductId, i, e.target.value)}
                                className="w-full text-sm px-2 py-2.5 outline-none text-slate-800 font-medium bg-transparent placeholder-slate-400"
                              />
                              <div className="w-px h-6 bg-slate-200 shrink-0"></div>
                              <input 
                                type="text" 
                                placeholder="검색량"
                                value={selectedProduct?.keywordVolumes?.[i] || ""}
                                onChange={(e) => handleKeywordVolumeChange(selectedProductId, i, e.target.value)}
                                className="w-14 text-[11px] px-1 py-2.5 outline-none text-slate-500 font-medium text-center shrink-0 placeholder-slate-300 bg-transparent"
                                title="월간 검색량"
                              />
                              <div className="w-px h-6 bg-slate-200 shrink-0"></div>
                              <input 
                                type="text" 
                                placeholder="순위"
                                value={keywordRankCoupang}
                                onChange={(e) => handleCoupangKeywordRankChange(selectedProductId, i, e.target.value)}
                                className="w-12 text-sm px-1 py-2.5 outline-none text-blue-600 font-bold text-center shrink-0 placeholder-slate-300 bg-transparent"
                              />
                              <button 
                                onClick={() => setActiveAiKeywordIndex(activeAiKeywordIndex?.index === i && activeAiKeywordIndex?.platform === 'coupang' ? null : { index: i, platform: 'coupang' })}
                                className={`px-2 py-2.5 text-xs font-bold border-l border-slate-200 hover:bg-blue-100 transition-colors ${activeAiKeywordIndex?.index === i && activeAiKeywordIndex?.platform === 'coupang' ? 'bg-blue-200 text-blue-800' : 'bg-slate-200 text-slate-600'}`}
                                title="AI 쿠팡 순위 분석"
                              >
                                ✨
                              </button>
                            </div>

                            {activeAiKeywordIndex?.index === i && activeAiKeywordIndex?.platform === 'coupang' && (
                              <div className="bg-blue-50/80 p-2.5 rounded-lg border border-blue-200 flex flex-col gap-2 shadow-inner mt-1">
                                <div className="text-[11px] text-blue-800 font-bold flex justify-between items-center">
                                  <span>🚀 쿠팡 '{keywordName || "키워드"}' 검색결과 복사/붙여넣기</span>
                                  <button onClick={() => setActiveAiKeywordIndex(null)} className="text-blue-500 hover:text-blue-700 font-bold">✕</button>
                                </div>
                                <textarea
                                  placeholder="쿠팡 검색 결과 화면 전체(Ctrl+A -> Ctrl+C) 후 여기에 붙여넣기(Ctrl+V)"
                                  className="w-full text-[10px] p-2 outline-none border border-blue-200 rounded resize-none h-16 focus:ring-1 focus:ring-blue-400 bg-white placeholder-blue-800/30 text-blue-900"
                                  onPaste={(e) => {
                                    const text = e.clipboardData.getData('text');
                                    if (text) {
                                      e.preventDefault();
                                      handleKeywordAiParse(i, text, 'coupang');
                                    }
                                  }}
                                  disabled={isKeywordAiParsing}
                                ></textarea>
                                {isKeywordAiParsing && (
                                  <div className="text-[10px] text-blue-600 font-bold animate-pulse text-center flex items-center justify-center gap-1">
                                    <Sparkles size={12} /> AI가 쿠팡 순위를 분석 중입니다...
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Bottom: Trend Table */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col gap-4 shadow-sm overflow-hidden">
                    {(() => {
                      const year = parseInt(selectedDate.substring(0, 4)) || 2026;
                      const month = parseInt(selectedDate.substring(5, 7)) || 7;

                      const prevMonth = month === 1 ? 12 : month - 1;
                      const prevYear = month === 1 ? year - 1 : year;

                      const prevDays = new Date(prevYear, prevMonth, 0).getDate();
                      const currentDays = new Date(year, month, 0).getDate();

                      const prevMonthStr = prevMonth.toString().padStart(2, '0');
                      const currentMonthStr = month.toString().padStart(2, '0');

                      const prevDates = Array.from({ length: prevDays }).map((_, i) => 
                        `${prevYear}-${prevMonthStr}-${(i + 1).toString().padStart(2, '0')}`
                      );
                      
                      const currentDates = Array.from({ length: currentDays }).map((_, i) => 
                        `${year}-${currentMonthStr}-${(i + 1).toString().padStart(2, '0')}`
                      );

                      const twoMonthDates = [...prevDates, ...currentDates];
                      const rangeLabel = `${prevYear}-${prevMonthStr} ~ ${year}-${currentMonthStr}`;

                      const logsWithMemos = priceLogs.filter(l => 
                        l.productId === selectedProductId && 
                        twoMonthDates.includes(l.date) && 
                        l.memo && l.memo.trim() !== ""
                      );

                      return (
                        <>
                          {/* Naver Trend Table */}
                          <div className="flex justify-between items-center text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
                            <span className="flex items-center gap-1.5 font-bold">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> 
                              📈 네이버 키워드 순위 변동 추이 ({prevMonth}월 ~ {month}월)
                            </span>
                            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1 shadow-2xs">
                              👉 좌우 스크롤로 전월 1일 ~ 당월 말일 순위 확인 가능 👈
                            </span>
                          </div>
                          
                          <div className="overflow-x-auto rounded-lg border border-slate-100 h-full pb-2">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
                                  <th className="p-3 font-bold whitespace-nowrap bg-slate-100 sticky left-0 z-10 border-r border-slate-200 min-w-[150px]">키워드</th>
                                  {twoMonthDates.map(d => (
                                    <th key={d} className={`p-2 font-bold text-center whitespace-nowrap min-w-[50px] ${d === selectedDate ? 'bg-amber-100/50 text-amber-700' : ''}`}>
                                      <div className="flex flex-col items-center">
                                        <span className="text-[10px] opacity-70 font-normal">{d.substring(5, 7)}/</span>
                                        <span>{d.substring(8, 10)}</span>
                                      </div>
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {Array.from({ length: 6 }).map((_, i) => {
                                  const kw = selectedProduct?.keywords?.[i];
                                  if (!kw) return null;
                                  return (
                                    <tr key={i} className="hover:bg-slate-50/50">
                                      <td className="p-2.5 font-semibold text-emerald-800 min-w-[150px] max-w-[200px] truncate bg-emerald-50/30 sticky left-0 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] z-10" title={kw}>
                                        {kw}
                                      </td>
                                      {twoMonthDates.map(d => {
                                        const log = priceLogs.find(l => l.productId === selectedProductId && l.date === d);
                                        const rank = log?.keywordRanks?.[i];
                                        return (
                                          <td key={d} className={`p-2 text-center border-r border-slate-50 ${d === selectedDate ? 'bg-amber-50/50' : ''}`}>
                                            {rank ? <span className="text-emerald-600 font-bold text-[13px]">{rank}</span> : <span className="text-slate-200">-</span>}
                                          </td>
                                        )
                                      })}
                                    </tr>
                                  );
                                })}
                                <tr className="hover:bg-amber-50/50 bg-amber-50/20 border-t-2 border-slate-100">
                                  <td className="p-2.5 font-bold text-amber-800 min-w-[150px] max-w-[200px] truncate bg-amber-50/80 sticky left-0 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] z-10 flex items-center gap-1.5">
                                    <span>📝</span> 일일 특이사항 (메모)
                                  </td>
                                  {twoMonthDates.map(d => {
                                    const log = priceLogs.find(l => l.productId === selectedProductId && l.date === d);
                                    const memo = log?.memo || "";
                                    return (
                                      <td key={`memo-naver-${d}`} className={`p-1 text-center border-r border-amber-100/30 ${d === selectedDate ? 'bg-amber-100/60' : ''}`}>
                                        <input
                                          type="text"
                                          value={memo}
                                          onChange={(e) => handleMemoChange(selectedProductId, d, e.target.value)}
                                          placeholder="메모"
                                          className="w-full min-w-[40px] text-[11px] px-1 py-1.5 outline-none text-amber-900 bg-transparent text-center focus:bg-white focus:ring-1 focus:ring-amber-400 rounded transition-all placeholder-amber-900/20 font-medium"
                                          title={memo}
                                        />
                                      </td>
                                    )
                                  })}
                                </tr>
                              </tbody>
                            </table>
                            {(!selectedProduct?.keywords || !selectedProduct.keywords.some(k => k)) && (
                              <div className="p-10 text-center text-xs text-slate-400">
                                위에서 키워드를 입력하시면<br/>해당 월의 네이버 순위 변동 추이가 여기에 표시됩니다.
                              </div>
                            )}
                          </div>

                          {/* Naver Memo Summary Card */}
                          {logsWithMemos.length > 0 && (
                            <div className="mt-1 bg-amber-50/70 rounded-xl p-3.5 border border-amber-200/70 shadow-xs">
                              <div className="flex items-center gap-2 mb-2.5">
                                <span className="bg-amber-100 text-amber-900 text-[11px] font-bold px-2 py-0.5 rounded shadow-2xs">
                                  {rangeLabel}
                                </span>
                                <h4 className="text-xs font-bold text-slate-800">
                                  전월/당월 특이사항 모아보기
                                </h4>
                              </div>
                              <div className="flex flex-col gap-1.5 pl-1">
                                {logsWithMemos.sort((a, b) => a.date.localeCompare(b.date)).map(log => (
                                  <div key={`memo-summary-naver-${log.date}`} className="text-xs flex items-center gap-2.5 bg-white p-2 rounded-lg border border-amber-100/80 shadow-2xs">
                                    <span className="font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded text-[11px] shrink-0">
                                      {log.date.substring(5)}
                                    </span>
                                    <span className="text-slate-700 font-medium break-all">{log.memo}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Coupang Trend Table */}
                          <div className="flex justify-between items-center text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 mt-6">
                            <span className="flex items-center gap-1.5 font-bold">
                              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span> 
                              📈 쿠팡 키워드 순위 변동 추이 ({prevMonth}월 ~ {month}월)
                            </span>
                            <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full flex items-center gap-1 shadow-2xs">
                              👉 좌우 스크롤로 전월 1일 ~ 당월 말일 순위 확인 가능 👈
                            </span>
                          </div>
                          
                          <div className="overflow-x-auto rounded-lg border border-slate-100 h-full pb-2">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
                                  <th className="p-3 font-bold whitespace-nowrap bg-slate-100 sticky left-0 z-10 border-r border-slate-200 min-w-[150px]">키워드</th>
                                  {twoMonthDates.map(d => (
                                    <th key={d} className={`p-2 font-bold text-center whitespace-nowrap min-w-[50px] ${d === selectedDate ? 'bg-amber-100/50 text-amber-700' : ''}`}>
                                      <div className="flex flex-col items-center">
                                        <span className="text-[10px] opacity-70 font-normal">{d.substring(5, 7)}/</span>
                                        <span>{d.substring(8, 10)}</span>
                                      </div>
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {Array.from({ length: 6 }).map((_, i) => {
                                  const kw = selectedProduct?.keywords?.[i];
                                  if (!kw) return null;
                                  return (
                                    <tr key={i} className="hover:bg-slate-50/50">
                                      <td className="p-2.5 font-semibold text-blue-800 min-w-[150px] max-w-[200px] truncate bg-blue-50/30 sticky left-0 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] z-10" title={kw}>
                                        {kw}
                                      </td>
                                      {twoMonthDates.map(d => {
                                        const log = priceLogs.find(l => l.productId === selectedProductId && l.date === d);
                                        const rank = log?.coupangKeywordRanks?.[i];
                                        return (
                                          <td key={d} className={`p-2 text-center border-r border-slate-50 ${d === selectedDate ? 'bg-amber-50/50' : ''}`}>
                                            {rank ? <span className="text-blue-600 font-bold text-[13px]">{rank}</span> : <span className="text-slate-200">-</span>}
                                          </td>
                                        )
                                      })}
                                    </tr>
                                  );
                                })}
                                <tr className="hover:bg-amber-50/50 bg-amber-50/20 border-t-2 border-slate-100">
                                  <td className="p-2.5 font-bold text-amber-800 min-w-[150px] max-w-[200px] truncate bg-amber-50/80 sticky left-0 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] z-10 flex items-center gap-1.5">
                                    <span>📝</span> 일일 특이사항 (메모)
                                  </td>
                                  {twoMonthDates.map(d => {
                                    const log = priceLogs.find(l => l.productId === selectedProductId && l.date === d);
                                    const memo = log?.memo || "";
                                    return (
                                      <td key={`memo-coupang-${d}`} className={`p-1 text-center border-r border-amber-100/30 ${d === selectedDate ? 'bg-amber-100/60' : ''}`}>
                                        <input
                                          type="text"
                                          value={memo}
                                          onChange={(e) => handleMemoChange(selectedProductId, d, e.target.value)}
                                          placeholder="메모"
                                          className="w-full min-w-[40px] text-[11px] px-1 py-1.5 outline-none text-amber-900 bg-transparent text-center focus:bg-white focus:ring-1 focus:ring-amber-400 rounded transition-all placeholder-amber-900/20 font-medium"
                                          title={memo}
                                        />
                                      </td>
                                    )
                                  })}
                                </tr>
                              </tbody>
                            </table>
                            {(!selectedProduct?.keywords || !selectedProduct.keywords.some(k => k)) && (
                              <div className="p-10 text-center text-xs text-slate-400">
                                위에서 키워드를 입력하시면<br/>해당 월의 쿠팡 순위 변동 추이가 여기에 표시됩니다.
                              </div>
                            )}
                          </div>

                          {/* Coupang Memo Summary Card */}
                          {logsWithMemos.length > 0 && (
                            <div className="mt-1 bg-amber-50/70 rounded-xl p-3.5 border border-amber-200/70 shadow-xs">
                              <div className="flex items-center gap-2 mb-2.5">
                                <span className="bg-amber-100 text-amber-900 text-[11px] font-bold px-2 py-0.5 rounded shadow-2xs">
                                  {rangeLabel}
                                </span>
                                <h4 className="text-xs font-bold text-slate-800">
                                  전월/당월 특이사항 모아보기
                                </h4>
                              </div>
                              <div className="flex flex-col gap-1.5 pl-1">
                                {logsWithMemos.sort((a, b) => a.date.localeCompare(b.date)).map(log => (
                                  <div key={`memo-summary-coupang-${log.date}`} className="text-xs flex items-center gap-2.5 bg-white p-2 rounded-lg border border-amber-100/80 shadow-2xs">
                                    <span className="font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded text-[11px] shrink-0">
                                      {log.date.substring(5)}
                                    </span>
                                    <span className="text-slate-700 font-medium break-all">{log.memo}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Right panel: Details, Chart, and AI Parser (3 cols on desktop) */}
          <div className="lg:col-span-3 flex flex-col gap-6" id="right-panel">
            
            {/* 1. Dynamic Chart Card */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col gap-3" id="trend-chart-card">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5 text-slate-900 font-bold">
                  <ChartIcon size={18} className="text-amber-500" />
                  <span>가격 변동 추세 차트</span>
                </div>
                {selectedProduct && (
                  <span className="text-[11px] bg-slate-100 px-2 py-0.5 rounded font-bold text-slate-600">
                    {selectedProduct.name}
                  </span>
                )}
              </div>

              {selectedProduct ? (
                chartData.length > 0 ? (
                  <div className="h-44 w-full" id="trend-chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} domain={["auto", "auto"]} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: "#1e293b", borderRadius: "8px", border: "none", color: "#fff" }}
                          itemStyle={{ fontSize: "11px", padding: 0 }}
                          labelStyle={{ fontSize: "11px", fontWeight: "bold", color: "#fbbf24" }}
                        />
                        <Legend iconSize={10} wrapperStyle={{ fontSize: "10px", marginTop: "5px" }} />
                        <Line 
                          name="네이버 합계" 
                          type="monotone" 
                          dataKey="네이버 합계" 
                          stroke="#fbbf24" 
                          strokeWidth={2.5}
                          activeDot={{ r: 6 }} 
                          connectNulls
                        />
                        <Line 
                          name="쿠팡 합계" 
                          type="monotone" 
                          dataKey="쿠팡 합계" 
                          stroke="#3b82f6" 
                          strokeWidth={2.5}
                          activeDot={{ r: 6 }}
                          connectNulls
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="py-10 text-center text-xs text-slate-400">
                    등록된 과거 변동 이력이 없습니다.
                  </div>
                )
              ) : (
                <div className="py-10 text-center text-xs text-slate-400">
                  선택된 품목이 없습니다.
                </div>
              )}
            </div>

            {/* 2. Fast Input & AI Parser Card */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col gap-4" id="ai-parser-card">
              
              <div className="border-b border-slate-100 pb-3 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-900 font-bold">
                    <Sparkles size={18} className="text-amber-500 animate-pulse" />
                    <span>AI 기반 가격 입력 & 관리</span>
                  </div>
                  <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded font-semibold">
                    Gemini 3.5 Flash
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  네이버나 쿠팡의 본문 텍스트를 복사해 붙여넣으면 판매가와 배송비를 AI가 추출합니다!
                </p>
              </div>

              {selectedProduct ? (
                <div className="flex flex-col gap-4" id="price-entry-forms">
                  
                  {/* AI Paste Section */}
                  <div className="bg-amber-50/50 border border-amber-100 p-3 rounded-xl flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                        <Sparkles size={14} className="text-amber-500" />
                        복사한 텍스트 붙여넣기
                      </span>
                      <div className="flex gap-1.5">
                        <button 
                          onClick={() => fillSampleText("naver")}
                          className="text-[10px] bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded"
                        >
                          네이버 예시
                        </button>
                        <button 
                          onClick={() => fillSampleText("coupang")}
                          className="text-[10px] bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded"
                        >
                          쿠팡 예시
                        </button>
                      </div>
                    </div>

                    {showApiKeyInput && (
                      <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-lg flex flex-col gap-1.5 mt-1 mb-1">
                        <span className="text-[11px] font-bold text-rose-700">🔑 Gemini API 키 직접 입력 (서버 재시작 불필요)</span>
                        <input
                          type="password"
                          placeholder="발급받은 API 키를 여기에 바로 붙여넣어주세요..."
                          value={localApiKey}
                          onChange={(e) => {
                            setLocalApiKey(e.target.value);
                            localStorage.setItem("gemini_api_key", e.target.value);
                            if (e.target.value.trim().length > 10) {
                              setShowApiKeyInput(false);
                              setAiParseError(null);
                            }
                          }}
                          className="w-full text-xs p-1.5 rounded bg-white border border-rose-200 outline-none focus:border-rose-400 font-mono"
                        />
                        <span className="text-[10px] text-rose-500 font-medium leading-tight">입력하신 키는 브라우저 내부(localStorage)에만 안전하게 저장되며 외부나 깃허브로 유출되지 않습니다.</span>
                      </div>
                    )}

                    {!showApiKeyInput && (
                      <div className="flex justify-end -mt-1 mb-1">
                        <button 
                          onClick={() => setShowApiKeyInput(true)}
                          className="text-[10px] text-slate-400 hover:text-slate-600 flex items-center gap-0.5"
                        >
                          <span>⚙️ API 키 변경</span>
                        </button>
                      </div>
                    )}

                    <textarea
                      placeholder="텍스트를 붙여넣거나 화면 캡쳐(이미지)를 붙여넣어주세요... (Ctrl+V)"
                      value={aiInputText}
                      onChange={(e) => setAiInputText(e.target.value)}
                      onPaste={handlePaste}
                      rows={3}
                      className="w-full p-2 text-xs bg-white border border-slate-200 rounded-lg outline-none resize-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                      id="ai-text-textarea"
                    />

                    {aiInputImage && (
                      <div className="relative inline-block mt-1">
                        <img src={aiInputImage} alt="Pasted" className="h-20 object-contain rounded border border-slate-200" />
                        <button 
                          onClick={() => setAiInputImage(null)}
                          className="absolute -top-2 -right-2 bg-slate-800 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-rose-500"
                        >
                          ×
                        </button>
                      </div>
                    )}

                    {aiParseError && (
                      <div className="text-xs text-rose-600 font-medium flex items-center gap-1">
                        <AlertTriangle size={12} />
                        <span>{aiParseError}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-1.5">
                        <select 
                          value={aiParsingPlatform}
                          onChange={(e) => setAiParsingPlatform(e.target.value as "naver" | "coupang")}
                          className="text-xs bg-white border border-slate-200 px-2 py-1 rounded outline-none w-full"
                        >
                          <option value="naver">네이버에 입력</option>
                          <option value="coupang">쿠팡에 입력</option>
                        </select>
                      </div>
                      
                      <button
                        onClick={handleAiParse}
                        disabled={isAiParsing}
                        className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white font-bold text-xs py-1.5 px-2.5 rounded-lg flex items-center justify-center gap-1 shadow-xs transition-colors"
                        id="btn-ai-parse-trigger"
                      >
                        {isAiParsing ? (
                          <>
                            <RefreshCw size={12} className="animate-spin" />
                            <span>분석 중...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={12} className="text-amber-400" />
                            <span>AI 가격 분석 적용</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Pricing Form */}
                  <form onSubmit={handleSavePrice} className="flex flex-col gap-4">
                    <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/60 flex flex-col gap-3">
                      
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800 pb-1 border-b border-slate-100">
                        <span>✏️ 가격 정보 수동 입력 및 검증</span>
                        <span className="text-[10px] text-slate-400 font-normal">기준 날짜: {selectedDate}</span>
                      </div>

                      {/* Naver Input Fields */}
                      <div className="flex flex-col gap-2">
                        <span className="text-xs font-semibold text-amber-700 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          네이버 쇼핑
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] text-slate-400">판매가 (원)</label>
                            <input 
                              type="number" 
                              placeholder="0"
                              value={editNaverPrice}
                              onChange={(e) => setEditNaverPrice(e.target.value)}
                              className="bg-white border border-slate-200 rounded p-1.5 text-xs outline-none focus:border-amber-400"
                              id="input-naver-price"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] text-slate-400">배송비 (원)</label>
                            <input 
                              type="number" 
                              placeholder="0"
                              value={editNaverShipping}
                              onChange={(e) => setEditNaverShipping(e.target.value)}
                              className="bg-white border border-slate-200 rounded p-1.5 text-xs outline-none focus:border-amber-400"
                              id="input-naver-shipping"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Coupang Input Fields */}
                      <div className="flex flex-col gap-2 mt-1">
                        <span className="text-xs font-semibold text-blue-700 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                          쿠팡 / 타판매자
                        </span>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="flex flex-col gap-1 col-span-1">
                            <label className="text-[10px] text-slate-400">판매자명</label>
                            <input 
                              type="text" 
                              placeholder="예: 레세나"
                              value={editCoupangSeller}
                              onChange={(e) => setEditCoupangSeller(e.target.value)}
                              className="bg-white border border-slate-200 rounded p-1.5 text-xs outline-none focus:border-blue-400"
                              id="input-coupang-seller"
                            />
                          </div>
                          <div className="flex flex-col gap-1 col-span-1">
                            <label className="text-[10px] text-slate-400">판매가 (원)</label>
                            <input 
                              type="number" 
                              placeholder="0"
                              value={editCoupangPrice}
                              onChange={(e) => setEditCoupangPrice(e.target.value)}
                              className="bg-white border border-slate-200 rounded p-1.5 text-xs outline-none focus:border-blue-400"
                              id="input-coupang-price"
                            />
                          </div>
                          <div className="flex flex-col gap-1 col-span-1">
                            <label className="text-[10px] text-slate-400">배송비 (원)</label>
                            <input 
                              type="number" 
                              placeholder="0"
                              value={editCoupangShipping}
                              onChange={(e) => setEditCoupangShipping(e.target.value)}
                              className="bg-white border border-slate-200 rounded p-1.5 text-xs outline-none focus:border-blue-400"
                              id="input-coupang-shipping"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Real-time total preview badges */}
                      <div className="flex items-center justify-between text-xs bg-white p-2.5 rounded-lg border border-slate-200 font-semibold shadow-2xs mt-1">
                        <span className="text-amber-800">
                          네이버 합계: <span className="font-bold text-amber-950">{((parsePrice(editNaverPrice) > 0 ? parsePrice(editNaverPrice) + parsePrice(editNaverShipping) : 0)).toLocaleString()}원</span>
                        </span>
                        <span className="text-blue-800">
                          쿠팡 합계: <span className="font-bold text-blue-950">{((parsePrice(editCoupangPrice) > 0 ? parsePrice(editCoupangPrice) + parsePrice(editCoupangShipping) : 0)).toLocaleString()}원</span>
                        </span>
                      </div>

                    </div>

                    <button
                      type="submit"
                      className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-1.5"
                      id="btn-save-price-form"
                    >
                      <span>💾</span> {selectedDate} 날짜의 가격 저장하기
                    </button>
                  </form>

                </div>
              ) : (
                <div className="py-10 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
                  품목을 선택하시면 해당 품목의 가격을 관리할 수 있습니다.
                </div>
              )}

            </div>

          </div>

        </div>

      </main>

      {/* Product Management Modal */}
      <AnimatePresence>
        {isManagingProducts && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" id="product-modal-container">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
              id="product-modal-card"
            >
              <div className="bg-slate-950 text-white px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold">모니터링 품목 목록 관리</h3>
                  <p className="text-[11px] text-slate-400">모니터링할 품목을 추가하거나 삭제할 수 있습니다.</p>
                </div>
                <button 
                  onClick={() => setIsManagingProducts(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
                <form onSubmit={handleAddProduct} className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 flex flex-col gap-3">
                  <span className="text-xs font-bold text-slate-800">➕ 새 모니터링 품목 추가</span>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-4 flex flex-col gap-1">
                      <label className="text-[10px] text-slate-500 font-semibold">품목명 (필수)</label>
                      <input 
                        type="text" 
                        required
                        placeholder="예: 휘슬러 프리미엄 3종세트"
                        value={newProductName}
                        onChange={(e) => setNewProductName(e.target.value)}
                        className="bg-white border border-slate-200 rounded p-1.5 text-xs outline-none focus:border-amber-500"
                        id="new-product-name"
                      />
                    </div>
                    <div className="md:col-span-4 flex flex-col gap-1">
                      <label className="text-[10px] text-slate-500 font-semibold">네이버 쇼핑 검색 주소</label>
                      <input 
                        type="url" 
                        placeholder="https://..."
                        value={newProductNaverUrl}
                        onChange={(e) => setNewProductNaverUrl(e.target.value)}
                        className="bg-white border border-slate-200 rounded p-1.5 text-xs outline-none focus:border-amber-500"
                        id="new-product-naver"
                      />
                    </div>
                    <div className="md:col-span-4 flex flex-col gap-1">
                      <label className="text-[10px] text-slate-500 font-semibold">쿠팡 쇼핑 검색 주소</label>
                      <input 
                        type="url" 
                        placeholder="https://..."
                        value={newProductCoupangUrl}
                        onChange={(e) => setNewProductCoupangUrl(e.target.value)}
                        className="bg-white border border-slate-200 rounded p-1.5 text-xs outline-none focus:border-amber-500"
                        id="new-product-coupang"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button 
                      type="submit"
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-1.5 rounded-lg text-xs transition-all shadow-xs"
                      id="btn-add-product-submit"
                    >
                      추가 완료
                    </button>
                  </div>
                </form>

                <div className="flex flex-col gap-2.5">
                  <span className="text-xs font-bold text-slate-800">📋 현재 모니터링 중인 품목 리스트 ({products.length}개)</span>
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-64 overflow-y-auto">
                    {products.map((p, idx) => (
                      <div key={p.id} className="p-3 bg-white flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-400 w-5 text-center font-bold">{idx + 1}</span>
                          <div>
                            <span className="text-xs font-semibold text-slate-900">{p.name}</span>
                            <div className="flex gap-2.5 mt-0.5 text-[10px] text-slate-400">
                              <span>네이버 URL: {p.naverUrl ? "등록됨" : "미등록"}</span>
                              <span>•</span>
                              <span>쿠팡 URL: {p.coupangUrl ? "등록됨" : "미등록"}</span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                          title="품목 삭제"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={() => setIsManagingProducts(false)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-1.5 rounded-lg text-xs font-bold transition-colors"
                >
                  닫기
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Link Edit Modal */}
      <AnimatePresence>
        {editingLinkProduct && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden"
            >
              <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LinkIcon size={16} className="text-amber-500" />
                  <h3 className="font-bold text-slate-900 text-sm">쇼핑몰 링크 수정 및 설정</h3>
                </div>
                <button 
                  onClick={() => setEditingLinkProduct(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveLinks} className="p-5 flex flex-col gap-4">
                <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200/60">
                  <span className="text-xs font-bold text-amber-900">📦 품목명:</span>
                  <span className="text-xs font-semibold text-slate-800 ml-2">{editingLinkProduct.name}</span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-amber-800 flex items-center gap-1">
                    <span>🟢 네이버 쇼핑 URL</span>
                  </label>
                  <input 
                    type="url"
                    value={linkNaverUrl}
                    onChange={(e) => setLinkNaverUrl(e.target.value)}
                    placeholder="https://search.shopping.naver.com/..."
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg outline-none focus:border-amber-400 font-medium bg-white"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-blue-800 flex items-center gap-1">
                    <span>🔵 쿠팡 쇼핑 URL</span>
                  </label>
                  <input 
                    type="url"
                    value={linkCoupangUrl}
                    onChange={(e) => setLinkCoupangUrl(e.target.value)}
                    placeholder="https://www.coupang.com/..."
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-400 font-medium bg-white"
                  />
                </div>

                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLinkNaverUrl(`https://search.shopping.naver.com/search/all?query=${encodeURIComponent(editingLinkProduct.name)}`);
                      setLinkCoupangUrl(`https://www.coupang.com/np/search?component=&q=${encodeURIComponent(editingLinkProduct.name)}`);
                      showToast("🔍 검색 URL이 자동 생성되었습니다.");
                    }}
                    className="text-[11px] text-slate-500 hover:text-slate-800 underline font-medium"
                  >
                    🔄 검색 URL 자동 생성
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingLinkProduct(null)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold transition-colors shadow-xs"
                    >
                      저장하기
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="bg-slate-100 border-t border-slate-200 text-center py-5 text-xs text-slate-400 mt-auto" id="main-footer">
        <p>© 2026 Naver & Coupang Price Monitor. All rights reserved.</p>
        <p className="mt-1 text-[10px] text-slate-400">
          AI 분석 및 파싱은 Google Gemini 3.5 Flash 모델로 실행됩니다.
        </p>
      </footer>

    </div>
  );
}
