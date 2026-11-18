// Event facts shared by prerendered HTML and client navigation.
export const SITE = Object.freeze({
  name: "米津玄師台北演唱會指南", title: "米津玄師 GHOST — 2026 台北演唱會指南",
  description: "米津玄師 GHOST 台北場非官方指南：2026/12/26、12/27 臺北大巨蛋，演出交通資訊與 28 首歌曲預習。",
  url: null, repoUrl: "https://github.com/vicecream/Yonezu-Kenshi-Taiwan-2026", officialUrl: "https://reissuerecords.net/",
});
export const EVENT = Object.freeze({
  name: "KENSHI YONEZU 2026-2027 WORLD TOUR / GHOST", timeZone: "Asia/Taipei",
  venue: "臺北大巨蛋", venueEn: "Taipei Dome", address: "臺北市信義區忠孝東路四段 515 號",
  mapUrl: "https://www.google.com/maps/search/?api=1&query=Taipei+Dome",
  ticketUrl: "https://ticketplus.com.tw/activity/73ed24f36dd62ca2b67a8b266c23df7f",
  tourUrl: "https://reissuerecords.net/2026/10/22/kenshi-yonezu-2026-2027-world-tour-ghost/",
  transitUrl: "https://www.farglorydome.com.tw/", stationUrl: "https://web.metro.taipei/pages2026/WebStation/092/1",
  announcementUrl: "https://yk2026.abigart.com/?lang=zh", checkedAt: "2026-11-18", organizer: "大鴻藝術 BIG ART、超級圓頂 SUPER DOME、大福音樂 HAPPY MUSIC",
  poster: "./images/ghost-poster.jpg", posterMobile: "./images/ghost-poster-mobile.jpg", seatMap: "./images/taipei-seat-map.jpg", venueMap: null,
  posterSource: "https://yk2026.abigart.com/images/hero.jpg", posterMobileSource: "https://yk2026.abigart.com/images/hero-mobile.jpg", seatMapSource: "https://yk2026.abigart.com/images/seatmap.jpg",
});
export const SHOWS = Object.freeze([
  Object.freeze({ id: "2026-12-26", date: "2026-12-26", dateLabel: "2026.12.26（六）", shortLabel: "12/26（六）", doors: "15:00", start: "2026-12-26T18:00:00+08:00", startLabel: "18:00" }),
  Object.freeze({ id: "2026-12-27", date: "2026-12-27", dateLabel: "2026.12.27（日）", shortLabel: "12/27（日）", doors: "15:00", start: "2026-12-27T18:00:00+08:00", startLabel: "18:00" }),
]);
export const TICKETS = Object.freeze({
  system: "Ticket Plus 遠大售票", prices: [5980, 5680, 4880, 4480, 3880, 2800, 2480, 1800], accessiblePrices: [2840, 2240],
  phases: [
    { label: "中國信託財管鼎鑽卡優先購", time: "10/24 12:00–16:00" },
    { label: "中國信託全卡友優先購", time: "10/25 10:00–16:00" },
    { label: "台灣大哥大專屬序號優先購", time: "10/26 12:00–10/28 12:00" },
    { label: "實名登記抽選", time: "10/29 13:00–10/31 13:00" },
    { label: "抽選結果／結帳期限", time: "11/2 12:00 起通知，11/3 13:00 前付款" },
    { label: "一般販售（視剩餘票券及公告）", time: "原公告 11/19 12:00 起；可能不實施" },
  ],
  policies: [
    { title: "全場實名制", text: "每會員每場各階段合計限購 2 張，每證件每場限購 1 張；票券限登記本人使用。" },
    { title: "證件查驗", text: "本國籍攜帶可辨識本人照片的身分證、駕照或健保卡正本；外國籍攜帶購票時登記的護照正本。影本、翻拍照片、截圖及學生證不接受。" },
    { title: "購票資料", text: "付款後無法修改，請在付款前核對姓名及證件號碼。領票方式與開放日期以遠大訂單及最新公告為準。" },
    { title: "退票規則", text: "主辦公告為購票後 3 日內（不含購票當日）可申請退票，第 4 日起不受理，每張酌收票面金額 5% 手續費；申請方式以遠大售票頁為準。" },
    { title: "年齡限制", text: "未滿 7 歲不得入場，滿 7 歲須購票，一人一票。" },
    { title: "身心障礙優惠席", text: "須於啟售前至少 24 小時完成遠大身分認證。本人及必要陪同者合計每場最多 2 張，須同時入場並出示證明正本。" },
  ],
});
export const ONSITE = Object.freeze({
  checkedAt: EVENT.checkedAt, sourceUrl: EVENT.announcementUrl,
  merchandise: "台北場周邊商品、取貨方式及販售時段待主辦公告。",
  entry: "台北場票區入口、現場服務配置與動線圖待主辦公告，請依票券及現場指引。",
  transport: "演出日交通管制與專屬接駁安排待主辦公告。",
  guidelines: [
    { title: "拍攝與錄音", text: "演出全程禁止拍照、錄影、錄音與直播，不得攜帶專業攝錄器材。" },
    { title: "行李與寄物", text: "大件行李不得入場，現場不提供寄物服務。" },
    { title: "攜入限制", text: "禁止攜帶飲食（瓶裝水除外）、玻璃、雷射筆及危險物品；館內禁菸、禁酒及禁嚼檳榔。完整限制以主辦及售票頁公告為準。" },
    { title: "遲到入場", text: "請依現場工作人員指示入場，提早預留證件查驗與安檢時間。" },
  ],
});
export const SHOW_TIMELINE = Object.freeze(Object.fromEntries(SHOWS.map(show => [show.date, [
  { t: show.doors, label: "預計開放入場" }, { t: show.startLabel, label: "正式開演" },
]])));
export const NOTICES = [];
export const PICS = {};
export const SONG_BPM = Object.freeze({});
export { SONGS, ALBUMS } from "./song-metadata.js";
