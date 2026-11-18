import { INFO_SVG, CHEVRON_SVG, EXT_LINK_SVG, NOTICE_SVG, SEAT_SVG, MAP_SVG, MANNER_SVG, SHARE_SVG, MOON_SVG } from "./icons.js";
import { SITE, EVENT, SHOWS, TICKETS, ONSITE, SONGS } from "../data.js";
import { siteFooterHtml } from "./footer.js";
const link = (url, label) => `<a class="info-book-link" href="${url}" target="_blank" rel="noopener">${EXT_LINK_SVG} ${label}</a>`;
const policies = items => `<ul class="way-list">${items.map(item => `<li><b>${item.title}</b>：${item.text}</li>`).join("")}</ul>`;
function card(id, title, icon, body){
  return `<div class="info-card" id="${id}-card"><button class="menu-row info-toggle" id="${id}-toggle" type="button" aria-expanded="false" aria-controls="${id}-panel"><span class="info-toggle-icon">${icon}</span><span class="info-toggle-label">${title}</span><span class="info-toggle-chevron">${CHEVRON_SVG}</span></button><div class="info-panel" id="${id}-panel" inert aria-hidden="true"><template class="info-panel-template"><div class="info-panel-inner">${body}</div></template></div></div>`;
}

// Both dates exist in static HTML; the client resolves the selected countdown.
export function homeHtml(build, themeToggle = `<button class="theme-toggle home-theme" type="button" data-theme-toggle aria-label="切換主題">${MOON_SVG}</button>`){
  return `<section class="hero">${themeToggle}<div class="hero-inner">
    <picture class="official-poster"><source media="(max-width: 600px)" srcset="${EVENT.posterMobile}"><img src="${EVENT.poster}" alt="米津玄師 GHOST 世界巡演台北場官方海報，2026 年 12 月 26、27 日臺北大巨蛋" fetchpriority="high"></picture>
    <div class="eyebrow">KENSHI YONEZU · TAIPEI 2026</div>
    <h1 class="tour-title"><span>米津玄師</span>GHOST</h1>
    <p class="hero-subtitle">2026–2027 WORLD TOUR<br>台北演唱會指南 · 非官方粉絲製作</p>
    <div class="countdown" id="countdown" aria-live="off"><div class="cd-pill"><span class="cd-dday" id="cd-dday">12.26–27</span><span class="cd-sep"></span><span class="cd-clock" id="cd-clock">18:00</span></div></div>
    <div class="show-meta"><div class="show-selector" role="group" aria-label="選擇演出場次">${SHOWS.map(show => `<button class="show-row" type="button" data-show-id="${show.id}" aria-pressed="false"><span class="show-day">${show.shortLabel}</span><span class="show-time">${show.startLabel}</span></button>`).join("")}</div><p class="selected-show-label" id="selected-show-label">選擇場次查看倒數</p><div class="show-venue">${EVENT.venue}</div><p class="show-doors">兩場皆預計 15:00 入場 · 台灣時間 UTC+8</p></div>
    <div class="today-card" id="today-card" hidden><div class="today-head"><span class="dot"></span><span id="today-title">今日演出</span></div><div class="today-now" id="today-now"></div><ul class="today-list" id="today-list"></ul></div>
    <nav class="main-menu" aria-label="主要導覽"><button class="menu-btn" id="guide-btn" type="button"><span class="menu-btn-label">${SONGS.length} 首歌曲預習</span></button><p class="prep-note">自選預習曲目 · 並非台北場正式歌單或演出順序</p></nav>
    <aside class="home-update" aria-labelledby="home-update-title"><h2 id="home-update-title">最新演出資訊</h2><a class="announcement-source" href="${ONSITE.sourceUrl}" target="_blank" rel="noopener">主辦公告 ↗</a><ul class="update-highlights"><li><strong>12/26（六）、12/27（日）</strong> 臺北大巨蛋</li><li><strong>預計 15:00 入場 · 18:00 開演</strong>，請攜帶實名證件正本</li><li>周邊、現場動線與專屬接駁安排待公告</li></ul></aside>
    <section class="info-section" aria-label="演出與交通資訊"><div class="menu-card">
    ${card("info", "演出與票務資訊", INFO_SVG, `
      <div class="info-panel-title">演出概要</div><dl class="info-facts">
      <dt>演出名稱</dt><dd>${EVENT.name}</dd>
      <dt>日期／時間</dt><dd>${SHOWS.map(show => `<span class="em">${show.dateLabel} ${show.startLabel}</span>`).join("<br>")}<span class="sub">預計 15:00 開放入場；散場時間依現場安排</span></dd>
      <dt>地點</dt><dd>${EVENT.venue}<span class="sub">${EVENT.address}</span></dd>
      <dt>主辦資訊</dt><dd>${EVENT.organizer}<span class="sub">完整主辦及協力名單以台北場活動頁為準</span></dd>
      <dt>票價</dt><dd><p class="info-price">${TICKETS.prices.map(price => `<span>NT$ ${price.toLocaleString("en-US")}</span>`).join("")}</p><span class="sub">身心障礙優惠席 NT$ ${TICKETS.accessiblePrices.join("／")}；票區及視線限制請查看售票說明</span></dd>
      <dt>售票／領票</dt><dd>${TICKETS.system}<span class="sub">領票方式及開放日期請依遠大訂單與最新公告確認</span></dd></dl>
      <div class="info-book-links">${link(EVENT.ticketUrl, "遠大活動與購票資訊")}${link(EVENT.tourUrl, "官方巡演資訊")}</div>
      <div class="table-scroll" tabindex="0" role="region" aria-label="2026 年售票時程"><table class="event-schedule"><caption>2026 年售票時程 · 台灣時間</caption><thead><tr><th scope="col">階段</th><th scope="col">公告時間</th></tr></thead><tbody>${TICKETS.phases.map(phase => `<tr><th scope="row">${phase.label}</th><td>${phase.time}</td></tr>`).join("")}</tbody></table></div>
      <p class="way-note">以上為公告時程，不代表目前仍有票；最新販售狀態以主辦與遠大售票為準。</p>${policies(TICKETS.policies)}
    `)}
    ${card("notice", "公告與周邊", NOTICE_SVG, `<h3 class="way-block-t">官方周邊</h3><p class="way-note">${ONSITE.merchandise}</p><h3 class="way-block-t">現場配置與服務</h3><p class="way-note">${ONSITE.entry}</p>${link(EVENT.announcementUrl, "台北場主辦專頁")}`)}
    ${card("seat", "舞台與座位配置", SEAT_SVG, `<p class="way-note">台北場官方座位圖，點擊可開啟原圖查看票區與票價。</p><a class="seat-map-link" href="${EVENT.seatMap}" target="_blank" rel="noopener"><img class="seat-map-image" data-src="${EVENT.seatMap}" alt="米津玄師 GHOST 台北大巨蛋場官方座位配置與票價圖" loading="lazy" decoding="async"></a><p class="way-note">部分區域可能有視線限制，請詳閱遠大售票說明。座位圖不代表入場動線。</p><p class="way-note">${ONSITE.entry}</p>`)}
    ${card("way", "交通與地址", MAP_SVG, `<div class="info-panel-title">${EVENT.venue}</div><p class="way-note">${EVENT.address}</p><div class="info-book-links"><button class="info-book-link" id="copy-addr" type="button">複製地址</button>${link(EVENT.mapUrl, "開啟地圖")}</div><div class="way-block"><h3 class="way-block-t">捷運板南線 · BL17 國父紀念館站</h3><ul class="way-list"><li>可由 4、5 號出口前往大巨蛋園區，實際入場入口請依票券及主辦動線。</li><li>無障礙出口與電梯資訊請查看台北捷運車站頁；演出日請預留安檢及步行時間。</li></ul></div><div class="info-book-links">${link(EVENT.stationUrl, "台北捷運出口資訊")}${link(EVENT.transitUrl, "臺北大巨蛋官方網站")}</div><p class="way-note">${ONSITE.transport}</p>`)}
    ${card("manner", "入場提醒", MANNER_SVG, `${policies(ONSITE.guidelines)}<p class="way-note">實名證件須與票券資料相符，請詳閱演出與票務資訊。再入場、包包尺寸等未核實細節以台北場後續公告為準。</p><p class="way-note">先在線上開啟指南並等待快取完成，資訊可離線閱讀；影片及外部網站仍需網路。</p>${link(EVENT.announcementUrl, "主辦常見問題與最新公告")}`)}
    <div class="menu-chips"><a class="menu-chip" href="${SITE.officialUrl}" target="_blank" rel="noopener"><span class="chip-label">米津玄師官方網站 ↗</span></a><button class="menu-chip" type="button" id="setlist-btn"><span class="chip-label">台北場歌單待確認</span></button></div></div>
    <aside class="home-note"><div class="home-note-body"><b>把歌曲先聽熟，把驚喜留給現場。</b><p>28 首為自選預習清單，歌詞、翻譯、讀音與同步時間依來源分批整理。</p></div></aside>
    <div class="home-foot"><button class="share-btn" type="button" id="share-btn">${SHARE_SVG} 分享指南</button></div></section>
  </div></section>${siteFooterHtml(build)}`;
}
