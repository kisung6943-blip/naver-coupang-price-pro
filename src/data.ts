import { Product, PriceLog } from "./types";

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: "prod-1",
    name: "휘슬러프리미엄고무패킹",
    naverUrl: "https://search.shopping.naver.com/search/all?query=휘슬러프리미엄고무패킹",
    coupangUrl: "https://www.coupang.com/np/search?component=&q=휘슬러프리미엄고무패킹",
    keywords: ["휘슬러압력밥솥부품", "휘슬러고무패킹", "휘슬러압력밥솥패킹"]
  },
  {
    id: "prod-2",
    name: "프리미엄고무패킹22+멤버레인",
    naverUrl: "https://search.shopping.naver.com/search/all?query=프리미엄고무패킹22+멤버레인",
    coupangUrl: "https://www.coupang.com/np/search?component=&q=프리미엄고무패킹22+멤버레인",
    keywords: ["휘슬러고무패킹22", "휘슬러멤버레인", "휘슬러고무패킹세트"]
  },
  {
    id: "prod-3",
    name: "휘슬러보조손잡이(구형)",
    naverUrl: "https://search.shopping.naver.com/search/all?query=휘슬러보조손잡이(구형)",
    coupangUrl: "https://www.coupang.com/np/search?component=&q=휘슬러보조손잡이(구형)",
    keywords: ["휘슬러보조손잡이", "휘슬러손잡이", "휘슬러압력밥솥손잡이"]
  },
  {
    id: "prod-4",
    name: "휘슬러멤버레인",
    naverUrl: "https://search.shopping.naver.com/search/all?query=휘슬러멤버레인",
    coupangUrl: "https://www.coupang.com/np/search?component=&q=휘슬러멤버레인",
    keywords: ["휘슬러멤버레인", "휘슬러부품", "휘슬러유니메틱"]
  },
  {
    id: "prod-5",
    name: "휘슬러멤버레인1+1",
    naverUrl: "https://search.shopping.naver.com/search/all?query=휘슬러멤버레인1%2B1",
    coupangUrl: "https://www.coupang.com/np/search?component=&q=휘슬러멤버레인1+1",
    keywords: ["휘슬러멤버레인", "휘슬러멤버레인1+1", "휘슬러패킹"]
  },
  {
    id: "prod-6",
    name: "휘슬러블루포인트멤버레인",
    naverUrl: "https://search.shopping.naver.com/search/all?query=휘슬러블루포인트멤버레인",
    coupangUrl: "https://www.coupang.com/np/search?component=&q=휘슬러블루포인트멤버레인",
    keywords: ["휘슬러블루포인트", "휘슬러멤버레인", "휘슬러부품"]
  },
  {
    id: "prod-7",
    name: "휘슬러블루포인트멤버레인1+1",
    naverUrl: "https://search.shopping.naver.com/search/all?query=휘슬러블루포인트멤버레인1%2B1",
    coupangUrl: "https://www.coupang.com/np/search?component=&q=휘슬러블루포인트멤버레인1+1",
    keywords: ["휘슬러블루포인트1+1", "휘슬러멤버레인", "휘슬러패킹"]
  },
  {
    id: "prod-8",
    name: "휘슬러 프리미엄3종세트",
    naverUrl: "https://search.shopping.naver.com/search/all?query=휘슬러프리미엄3종세트",
    coupangUrl: "https://www.coupang.com/np/search?component=&q=휘슬러프리미엄3종세트",
    keywords: ["휘슬러3종세트", "휘슬러프리미엄세트", "휘슬러패킹세트"]
  },
  {
    id: "prod-9",
    name: "휘슬러고무패킹22(구형)",
    naverUrl: "https://search.shopping.naver.com/search/all?query=휘슬러고무패킹22(구형)",
    coupangUrl: "https://www.coupang.com/np/search?component=&q=휘슬러고무패킹22(구형)",
    keywords: ["휘슬러고무패킹22", "휘슬러구형패킹", "휘슬러고무패킹"]
  },
  {
    id: "prod-10",
    name: "휘슬러유니메틱",
    naverUrl: "https://search.shopping.naver.com/search/all?query=휘슬러유니메틱",
    coupangUrl: "https://www.coupang.com/np/search?component=&q=휘슬러유니메틱",
    keywords: ["휘슬러유니메틱", "휘슬러부품", "휘슬러압력밥솥유니메틱"]
  }
];

const TODAY_PRICES: Record<string, {
  naverPrice: number;
  naverShipping: number;
  coupangSeller: string;
  coupangPrice: number;
  coupangShipping: number;
}> = {
  "prod-1": { naverPrice: 5890, naverShipping: 3000, coupangSeller: "휘슬러as", coupangPrice: 5900, coupangShipping: 3000 },
  "prod-2": { naverPrice: 6790, naverShipping: 3000, coupangSeller: "휘슬러as", coupangPrice: 6800, coupangShipping: 3000 },
  "prod-3": { naverPrice: 5800, naverShipping: 3000, coupangSeller: "레세나", coupangPrice: 5000, coupangShipping: 3500 },
  "prod-4": { naverPrice: 4300, naverShipping: 0, coupangSeller: "휘슬러as", coupangPrice: 1300, coupangShipping: 3000 },
  "prod-5": { naverPrice: 2650, naverShipping: 3000, coupangSeller: "휘슬러as", coupangPrice: 2660, coupangShipping: 3000 },
  "prod-6": { naverPrice: 3970, naverShipping: 3000, coupangSeller: "라인마인", coupangPrice: 3980, coupangShipping: 3000 },
  "prod-7": { naverPrice: 7940, naverShipping: 3000, coupangSeller: "", coupangPrice: 0, coupangShipping: 0 },
  "prod-8": { naverPrice: 12290, naverShipping: 3000, coupangSeller: "", coupangPrice: 0, coupangShipping: 0 },
  "prod-9": { naverPrice: 3990, naverShipping: 3000, coupangSeller: "휘슬러as", coupangPrice: 4000, coupangShipping: 3000 },
  "prod-10": { naverPrice: 4150, naverShipping: 3000, coupangSeller: "세계명품", coupangPrice: 4200, coupangShipping: 3000 }
};

export function generateHistoricalLogs(): PriceLog[] {
  const logs: PriceLog[] = [];
  
  // Generate dates for June and July 2026 (2026-06-01 ~ 2026-07-31)
  const dates: string[] = [];
  
  // June (30 days)
  for (let day = 1; day <= 30; day++) {
    const dayStr = day.toString().padStart(2, "0");
    dates.push(`2026-06-${dayStr}`);
  }
  // July (31 days)
  for (let day = 1; day <= 31; day++) {
    const dayStr = day.toString().padStart(2, "0");
    dates.push(`2026-07-${dayStr}`);
  }

  // Sample memos map
  const sampleMemos: Record<string, string> = {
    "2026-06-12": "신규 키워드 광고 세팅",
    "2026-06-25": "패킹 상품 썸네일 교체",
    "2026-07-02": "네이버 쇼핑 검색광고 개시",
    "2026-07-05": "네이버 쇼핑 메인 상단 노출",
    "2026-07-10": "쿠팡 타임딜 할인 행사 진행",
    "2026-07-15": "네이버 1위 상단 굳히기",
    "2026-07-21": "상품명수정",
    "2026-07-30": "클릭단가 350원으로인상"
  };

  INITIAL_PRODUCTS.forEach((p, pIdx) => {
    const todayData = TODAY_PRICES[p.id];
    if (!todayData) return;

    dates.forEach((date, index) => {
      const dayNum = index + 1;
      const diffMultiplier = 1 + (dayNum - 20) * 0.003;
      let navPrice = Math.round((todayData.naverPrice * diffMultiplier) / 10) * 10;
      let coupPrice = todayData.coupangPrice > 0 
        ? Math.round((todayData.coupangPrice * (diffMultiplier + (p.id === "prod-3" ? 0.02 : -0.005))) / 10) * 10
        : 0;

      if (date === "2026-07-10") {
        navPrice = todayData.naverPrice;
        coupPrice = todayData.coupangPrice;
      }

      const naverTotal = navPrice + (navPrice > 0 ? todayData.naverShipping : 0);
      const coupangTotal = coupPrice > 0 ? (coupPrice + todayData.coupangShipping) : 0;
      const difference = naverTotal - coupangTotal;

      // Deterministic sample rank patterns for Naver & Coupang keywords
      const naverRank1 = (1 + ((dayNum + pIdx) % 3)).toString();
      const naverRank2 = (1 + ((dayNum * 2 + pIdx) % 4)).toString();
      const naverRank3 = (1 + ((dayNum + pIdx * 3) % 2)).toString();

      const coupangRank1 = (1 + ((dayNum * 3 + pIdx) % 4)).toString();
      const coupangRank2 = (1 + ((dayNum + pIdx * 2) % 3)).toString();
      const coupangRank3 = (1 + ((dayNum * 2 + pIdx * 3) % 4)).toString();

      logs.push({
        id: `log-${p.id}-${date}`,
        date,
        productId: p.id,
        naverPrice: navPrice,
        naverShipping: navPrice > 0 ? todayData.naverShipping : 0,
        naverTotal,
        coupangSeller: coupPrice > 0 ? todayData.coupangSeller : "",
        coupangPrice: coupPrice,
        coupangShipping: coupPrice > 0 ? todayData.coupangShipping : 0,
        coupangTotal,
        difference,
        keywordRanks: [naverRank1, naverRank2, naverRank3],
        coupangKeywordRanks: [coupangRank1, coupangRank2, coupangRank3],
        memo: p.id === "prod-1" ? (sampleMemos[date] || "") : ""
      });
    });
  });

  return logs;
}
