// ui.js - rendering helpers used by pages (index, watch, channel, search)
const ui = (function(){
  function escapeHtml(s=''){ return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

  function prettyViews(n){
    if (!n && n !== 0) return '';
    n = Number(n);
    if (n >= 1e9) return (n/1e9).toFixed(1) + 'B views';
    if (n >= 1e6) return (n/1e6).toFixed(1) + 'M views';
    if (n >= 1e3) return (n/1e3).toFixed(1) + 'K views';
    return n + ' views';
  }

  function timeAgo(iso){
    if(!iso) return '';
    const then = new Date(iso);
    const diff = Date.now() - then.getTime();
    const d = Math.floor(diff / (1000*60*60*24));
    if (d <= 0) return 'today';
    if (d < 30) return d + ' days ago';
    const months = Math.floor(d/30);
    if (months < 12) return months + ' months ago';
    return Math.floor(months/12) + ' years ago';
  }

  // render a grid from an array of "video-like" objects
  // items: array, target: DOM node, options: {onCardClick}
  function renderGrid(items, target, options = {}){
    const onCardClick = options.onCardClick;
    target.innerHTML = '';
    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'video-card';
      card.innerHTML = `
        <div class="video-thumb" style="background-image:url('${escapeHtml(item.thumb)}')"></div>
        <div class="video-info">
          <img src="https://i.pravatar.cc/36?img=${(item.channelTitle||'').length%10 + 1}" alt="channel" />
          <div class="video-details">
            <h4>${escapeHtml(item.title)}</h4>
            <p class="channel-name" data-channel-id="${escapeHtml(item.channelId || '')}">${escapeHtml(item.channelTitle || '')}</p>
            <p>${prettyViews(item.viewCount)} • ${timeAgo(item.publishedAt)}</p>
          </div>
        </div>
      `;
      // clicks
      const thumb = card.querySelector('.video-thumb');
      thumb.addEventListener('click', () => onCardClick && onCardClick('watch', item.id));
      const channelName = card.querySelector('.channel-name');
      channelName && channelName.addEventListener('click', (e) => {
        const ch = e.currentTarget.dataset.channelId;
        if (ch && onCardClick) onCardClick('channel', ch);
      });
      target.appendChild(card);
    });
  }

  return {
    renderGrid,
    prettyViews,
    timeAgo,
    escapeHtml
  };
})();