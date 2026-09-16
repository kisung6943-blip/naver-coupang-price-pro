import { Product, PriceLog } from "./types";

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: "prod-1",
    name: "휘슬러유니메틱",
    naverUrl: "https://search.shopping.naver.com/search/all?query=휘슬러유니메틱",
    coupangUrl: "https://www.coupang.com/np/search?component=&q=휘슬러유니메틱",
    keywords: ["휘슬러유니메틱", "휘슬러부품", "휘슬러압력밥솥유니메틱"]
  },
  {
    id: "prod-2",
    name: "휘슬러멤버레인1+1",
    naverUrl: "https://search.shopping.naver.com/search/all?query=휘슬러멤버레인1%2B1",
    coupangUrl: "https://www.coupang.com/np/search?component=&q=휘슬러멤버레인1+1",
    keywords: ["휘슬러멤버레인", "휘슬러멤버레인1+1", "휘슬러패킹"]
  },
  {
    id: "prod-3",
    name: "NHB 수동 소금 후추 그라인더",
    naverUrl: "https://search.shopping.naver.com/search/all?query=NHB+수동+소금+후추+그라인더",
    coupangUrl: "https://www.coupang.com/np/search?component=&q=NHB+수동+소금+후추+그라인더",
    keywords: ["소금그라인더", "후추그라인더", "양념통"]
  },
  {
    id: "prod-4",
    name: "NHB 실리콘 꿀통 소분용기 보관용기 양념통 소스 시럽 통 160ml 2개 세트",
    naverUrl: "https://search.shopping.naver.com/search/all?query=NHB+실리콘+꿀통",
    coupangUrl: "https://www.coupang.com/np/search?component=&q=NHB+실리콘+꿀통",
    keywords: ["꿀통소분용기", "양념통", "소스통"]
  },
  {
    id: "prod-5",
    name: "NHB 파스타쿠커 전자레인지 메이커",
    naverUrl: "https://search.shopping.naver.com/search/all?query=NHB+파스타쿠커",
    coupangUrl: "https://www.coupang.com/np/search?component=&q=NHB+파스타쿠커",
    keywords: ["파스타쿠커", "전자레인지메이커", "면조리기"]
  },
  {
    id: "prod-6",
    name: "NHB 깨그라인더 양념통 70ml",
    naverUrl: "https://search.shopping.naver.com/search/all?query=NHB+깨그라인더",
    coupangUrl: "https://www.coupang.com/np/search?component=&q=NHB+깨그라인더",
    keywords: ["조리도구거치대", "조리도구걸이", "조리도구정리", "주방조리도구걸이", "주방조리기구걸이"]
  },
  {
    id: "prod-7",
    name: "NHB 욕실 물기제거 화장실 청소도구 청소 스퀴지",
    naverUrl: "https://search.shopping.naver.com/search/all?query=NHB+욕실+스퀴지",
    coupangUrl: "https://www.coupang.com/np/search?component=&q=NHB+욕실+스퀴지",
    keywords: ["욕실스퀴지", "청소스퀴지", "물기제거기"]
  },
  {
    id: "prod-8",
    name: "NHB 와인잔거치대 와인잔걸이 렉 보관 선반 와인잔거치대1라인",
    naverUrl: "https://search.shopping.naver.com/search/all?query=NHB+와인잔거치대",
    coupangUrl: "https://www.coupang.com/np/search?component=&q=NHB+와인잔거치대",
    keywords: ["와인잔거치대", "와인잔걸이", "와인렉"]
  },
  {
    id: "prod-9",
    name: "NHB 무타공 스텐 키친타올걸이 키친타올 홀더 거치대 1라인",
    naverUrl: "https://search.shopping.naver.com/search/all?query=NHB+키친타올걸이",
    coupangUrl: "https://www.coupang.com/np/search?component=&q=NHB+키친타올걸이",
    keywords: ["키친타올걸이", "무타공걸이", "스텐홀더"]
  },
  {
    id: "prod-10",
    name: "NHB 도마거치대 스텐 도마걸이(M자형)",
    naverUrl: "https://search.shopping.naver.com/search/all?query=NHB+도마거치대",
    coupangUrl: "https://www.coupang.com/np/search?component=&q=NHB+도마거치대",
    keywords: ["도마거치대", "스텐도마걸이", "도마꽂이"]
  },
  {
    id: "prod-11",
    name: "NHB 스텐 도마 접시 거치대 걸이 주방수납 정리 정리대 홀더 상부",
    naverUrl: "https://search.shopping.naver.com/search/all?query=NHB+스텐+도마+접시+거치대",
    coupangUrl: "https://www.coupang.com/np/search?component=&q=NHB+스텐+도마+접시+거치대",
    keywords: ["접시거치대", "도마접시거치대", "주방수납정리대"]
  },
  {
    id: "prod-12",
    name: "NHB 업소용 대용량 유리 음료 디스펜서 3.3L 받침세트, 검정",
    naverUrl: "https://search.shopping.naver.com/search/all?query=NHB+유리+음료+디스펜서",
    coupangUrl: "https://www.coupang.com/np/search?component=&q=NHB+유리+음료+디스펜서",
    keywords: ["유리디스펜서", "음료디스펜서", "대용량디스펜서"]
  },
  {
    id: "prod-13",
    name: "NHB 와인잔거치대 스탠드형 와인잔걸이",
    naverUrl: "https://search.shopping.naver.com/search/all?query=NHB+스탠드형+와인잔걸이",
    coupangUrl: "https://www.coupang.com/np/search?component=&q=NHB+스탠드형+와인잔걸이",
    keywords: ["스탠드형와인잔걸이", "와인잔거치대", "와인잔걸이"]
  },
  {
    id: "prod-14",
    name: "휘슬러프리미엄고무패킹",
    naverUrl: "https://search.shopping.naver.com/search/all?query=휘슬러프리미엄고무패킹",
    coupangUrl: "https://www.coupang.com/np/search?component=&q=휘슬러프리미엄고무패킹",
    keywords: ["휘슬러압력밥솥부품", "휘슬러고무패킹", "휘슬러압력밥솥패킹"]
  }
];

const TODAY_PRICES: Record<string, {
  naverPrice: number;
  naverShipping: number;
  coupangSeller: string;
  coupangPrice: number;
  coupangShipping: number;
}> = {
  "prod-1": { naverPrice: 12000, naverShipping: 3000, coupangSeller: "휘슬러as", coupangPrice: 11000, coupangShipping: 2500 },
  "prod-2": { naverPrice: 2650, naverShipping: 0, coupangSeller: "휘슬러as", coupangPrice: 2660, coupangShipping: 0 },
  "prod-3": { naverPrice: 5800, naverShipping: 0, coupangSeller: "", coupangPrice: 0, coupangShipping: 0 },
  "prod-4": { naverPrice: 1070, naverShipping: 0, coupangSeller: "", coupangPrice: 0, coupangShipping: 0 },
  "prod-5": { naverPrice: 8890, naverShipping: 0, coupangSeller: "", coupangPrice: 0, coupangShipping: 0 },
  "prod-6": { naverPrice: 8700, naverShipping: 0, coupangSeller: "", coupangPrice: 0, coupangShipping: 0 },
  "prod-7": { naverPrice: 4500, naverShipping: 0, coupangSeller: "", coupangPrice: 0, coupangShipping: 0 },
  "prod-8": { naverPrice: 7900, naverShipping: 2500, coupangSeller: "", coupangPrice: 0, coupangShipping: 0 },
  "prod-9": { naverPrice: 13000, naverShipping: 0, coupangSeller: "", coupangPrice: 0, coupangShipping: 0 },
  "prod-10": { naverPrice: 0, naverShipping: 0, coupangSeller: "", coupangPrice: 0, coupangShipping: 0 },
  "prod-11": { naverPrice: 28000, naverShipping: 0, coupangSeller: "", coupangPrice: 0, coupangShipping: 0 },
  "prod-12": { naverPrice: 0, naverShipping: 0, coupangSeller: "", coupangPrice: 0, coupangShipping: 0 },
  "prod-13": { naverPrice: 8900, naverShipping: 3000, coupangSeller: "", coupangPrice: 0, coupangShipping: 0 },
  "prod-14": { naverPrice: 5890, naverShipping: 3000, coupangSeller: "휘슬러as", coupangPrice: 5900, coupangShipping: 3000 }
};

export function generateHistoricalLogs(): PriceLog[] {
  const logs: PriceLog[] = [];
  
  // Generate dates for June, July, August, September 2026
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
  // August (31 days)
  for (let day = 1; day <= 31; day++) {
    const dayStr = day.toString().padStart(2, "0");
    dates.push(`2026-08-${dayStr}`);
  }
  // September (16 days)
  for (let day = 1; day <= 16; day++) {
    const dayStr = day.toString().padStart(2, "0");
    dates.push(`2026-09-${dayStr}`);
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
    "2026-07-30": "클릭단가 350원으로인상",
    "2026-08-21": "상품명수정",
    "2026-08-30": "클릭단가 350원으로인상"
  };

  INITIAL_PRODUCTS.forEach((p, pIdx) => {
    const todayData = TODAY_PRICES[p.id];
    if (!todayData) return;

    dates.forEach((date, index) => {
      const dayNum = index + 1;
      let navPrice = todayData.naverPrice;
      let navShip = todayData.naverShipping;
      let coupPrice = todayData.coupangPrice;
      let coupShip = todayData.coupangShipping;

      const naverTotal = navPrice > 0 ? (navPrice + navShip) : 0;
      const coupangTotal = coupPrice > 0 ? (coupPrice + coupShip) : 0;
      const difference = (naverTotal > 0 && coupangTotal > 0) ? (naverTotal - coupangTotal) : 0;

      // Special sample ranks for prod-6 (NHB 깨그라인더 양념통 70ml)
      let naverRank1 = (1 + ((dayNum + pIdx) % 3)).toString();
      let naverRank2 = (1 + ((dayNum * 2 + pIdx) % 4)).toString();
      let naverRank3 = (1 + ((dayNum + pIdx * 3) % 2)).toString();
      let naverRank4 = "";
      let naverRank5 = "";

      if (p.id === "prod-6") {
        if (date === "2026-08-30" || date === "2026-07-30") {
          naverRank1 = "21";
          naverRank2 = "";
          naverRank3 = "27";
          naverRank4 = "19";
          naverRank5 = "";
        } else if (date === "2026-09-01") {
          naverRank1 = "199";
          naverRank2 = "9";
          naverRank3 = "";
          naverRank4 = "";
          naverRank5 = "";
        } else if (date === "2026-08-23") {
          naverRank1 = "59";
          naverRank2 = "";
          naverRank3 = "";
          naverRank4 = "";
          naverRank5 = "";
        } else if (date === "2026-08-27") {
          naverRank1 = "";
          naverRank2 = "25";
          naverRank3 = "";
          naverRank4 = "";
          naverRank5 = "";
        }
      }

      const coupangRank1 = (1 + ((dayNum * 3 + pIdx) % 4)).toString();
      const coupangRank2 = (1 + ((dayNum + pIdx * 2) % 3)).toString();
      const coupangRank3 = (1 + ((dayNum * 2 + pIdx * 3) % 4)).toString();

      logs.push({
        id: `log-${p.id}-${date}`,
        date,
        productId: p.id,
        naverPrice: navPrice,
        naverShipping: navShip,
        naverTotal,
        coupangSeller: coupPrice > 0 ? todayData.coupangSeller : "",
        coupangPrice: coupPrice,
        coupangShipping: coupShip,
        coupangTotal,
        difference,
        keywordRanks: p.id === "prod-6" 
          ? [naverRank1, naverRank2, naverRank3, naverRank4, naverRank5] 
          : [naverRank1, naverRank2, naverRank3],
        coupangKeywordRanks: [coupangRank1, coupangRank2, coupangRank3],
        memo: (p.id === "prod-6" || p.id === "prod-1") ? (sampleMemos[date] || "") : ""
      });
    });
  });

  return logs;
}
