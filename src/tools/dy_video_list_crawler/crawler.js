/**
 * 抖音关键词视频采集 - 爬取函数
 * 参照 douyin_comment_crawler 实现
 */

function getVideoLinksBySelector() {
  const links = [];
  const selectors = [
    'a[href*="/video/"]',
    'a[href*="/note/"]',
    '[class*="video-item"] a',
    '[class*="VideoItem"] a',
    '[class*="search-result"] a[href*="/video/"]'
  ];

  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      let href = el.getAttribute('href');
      if (href && (href.includes('/video/') || href.includes('/note/'))) {
        if (href.startsWith('//')) {
          href = 'https:' + href;
        } else if (href.startsWith('/')) {
          href = 'https://www.douyin.com' + href;
        } else if (!href.startsWith('http')) {
          href = 'https://www.douyin.com/' + href;
        }
        links.push(href);
      }
    });
  }

  return [...new Set(links)];
}

function wheelScroll(xpath = null, delta = 500) {
  let targetElement = document.documentElement;

  if (xpath) {
    const result = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.ANY_TYPE,
      null
    );
    const node = result.iterateNext();

    if (!node) {
      window.scrollBy({ top: delta, behavior: 'smooth' });
      return true;
    }

    if (node) {
      if (node.nodeType === Node.ATTRIBUTE_NODE) {
        targetElement = node.ownerElement;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        targetElement = node;
      }
    }
  }

  if (targetElement === document.documentElement) {
    window.scrollBy({ top: delta, behavior: 'smooth' });
  } else {
    targetElement.scrollTop += delta;
  }

  return true;
}

function isScrollBottom(xpath = null) {
  let target = document.documentElement;

  if (xpath) {
    const result = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.ANY_TYPE,
      null
    );
    const node = result.iterateNext();

    if (node) {
      if (node.nodeType === Node.ATTRIBUTE_NODE) {
        target = node.ownerElement;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        target = node;
      }
    } else {
      return false;
    }
  }

  const threshold = 5;
  return target.scrollTop + target.clientHeight + threshold >= target.scrollHeight;
}

function filter_video_event(filter, value) {
  if (filter === 'type') {
    const el = document.querySelector(`#${value}`);
    if (el) el.click();
    else console.error('[DEBUG] 找不到元素:', `#${value}`);
  } else if (filter === 'sort') {
    const sortBtn = document.querySelector('.search-filter-sort');
    if (sortBtn) sortBtn.click();

    const allItems = document.querySelectorAll('.search-filter-option');
    const selectedElement = Array.from(allItems).find(element =>
      element.textContent.trim() === value
    );
    if (selectedElement) {
      console.log('[DEBUG] 点击元素:', selectedElement);
      selectedElement.click();
    } else {
      console.log('[DEBUG] 未找到元素');
    }
  }
}

async function crawler_video_list(scroll_count = 100, crawler_count = 20) {
  const video_links = [];
  let prev_count = 0;
  let no_new_count = 0;
  const max_no_new = 5;

  for (let i = 0; i < scroll_count; i++) {
    wheelScroll(null, 500);

    await new Promise(resolve => setTimeout(resolve, 1500));

    const batch_video_links = getVideoLinksBySelector();
    if (batch_video_links && batch_video_links.length > 0) {
      video_links.push(...batch_video_links);
    }

    const unique_video_links = [...new Set(video_links)];
    console.log('[DEBUG] 滚动次数:', i + 1, '本次获取:', batch_video_links?.length || 0, '去重后总数:', unique_video_links.length);

    if (unique_video_links.length >= crawler_count) {
      console.log('[DEBUG] 达到' + crawler_count + '个视频，停止滚动');
      const result = unique_video_links.slice(0, crawler_count);
      console.log('[DEBUG] 最终视频列表:', result);
      return {
        "code": 0,
        "data": result,
        "message": "success",
        "count": result.length
      };
    }

    if (unique_video_links.length === prev_count) {
      no_new_count++;
      console.log('[DEBUG] 未获取到新视频，连续次数:', no_new_count);
      if (no_new_count >= max_no_new) {
        console.log('[DEBUG] 连续' + max_no_new + '次未获取到新视频，停止滚动');
        break;
      }
    } else {
      no_new_count = 0;
    }
    prev_count = unique_video_links.length;

    if (isScrollBottom()) {
      console.log('[DEBUG] 已滚动到底部，停止滚动');
      break;
    }
  }

  const unique_video_links = [...new Set(video_links)];
  console.log('[DEBUG] 最终视频列表:', unique_video_links);
  return {
    "code": 0,
    "data": unique_video_links,
    "message": "success",
    "count": unique_video_links.length
  };
}

function extractDataFromVideoPage() {
  console.log('[DEBUG] ========== 开始从视频详情页提取数据 ==========');
  console.log('[DEBUG] 当前页面URL:', window.location.href);
  
  const allElements = document.querySelectorAll('*');
  let awemeInfo = null;
  let reactElementsCount = 0;
  
  for (const el of allElements) {
    const keys = Object.keys(el);
    const reactKey = keys.find(k => k.startsWith('__reactFiber'));
    if (reactKey) {
      reactElementsCount++;
      const fiber = el[reactKey];
      let current = fiber;
      let depth = 0;
      
      while (current && !awemeInfo && depth < 50) {
        if (current?.memoizedProps?.awemeInfo) {
          awemeInfo = current.memoizedProps.awemeInfo;
          console.log('[DEBUG] 在 memoizedProps 找到 awemeInfo, 深度:', depth);
          break;
        }
        if (current?.pendingProps?.awemeInfo) {
          awemeInfo = current.pendingProps.awemeInfo;
          console.log('[DEBUG] 在 pendingProps 找到 awemeInfo, 深度:', depth);
          break;
        }
        current = current.return;
        depth++;
      }
      
      if (awemeInfo) break;
    }
  }
  
  console.log('[DEBUG] 检查了', allElements.length, '个元素, 其中', reactElementsCount, '个有 React Fiber');
  
  if (!awemeInfo) {
    console.error('[DEBUG] ========== 未找到 awemeInfo! ==========');
    return null;
  }
  
  console.log('[DEBUG] awemeInfo.awemeId:', awemeInfo.awemeId);
  console.log('[DEBUG] awemeInfo.desc:', awemeInfo.desc?.substring(0, 50));
  console.log('[DEBUG] awemeInfo.authorInfo:', awemeInfo.authorInfo);
  console.log('[DEBUG] awemeInfo.stats:', awemeInfo.stats);
  
  const authorInfo = awemeInfo.authorInfo || {};
  const stats = awemeInfo.stats || {};
  
  const result = {
    videoLink: 'https://www.douyin.com/video/' + awemeInfo.awemeId,
    videoTitle: awemeInfo.desc || '',
    likeCount: stats.diggCount || 0,
    commentCount: stats.commentCount || 0,
    shareCount: stats.shareCount || 0,
    collectCount: stats.collectCount || 0,
    authorNickname: authorInfo.nickname || '',
    authorLink: authorInfo.secUid ? 'https://www.douyin.com/user/' + authorInfo.secUid : '',
    authorAvatar: authorInfo.avatarThumb?.urlList?.[0] || '',
    followerCount: authorInfo.followerCount || 0,
    totalFavorited: authorInfo.totalFavorited || 0
  };
  
  console.log('[DEBUG] ========== 提取完成, 结果: ==========');
  console.log('[DEBUG]', JSON.stringify(result, null, 2));
  return result;
}

console.log('[DEBUG] crawler.js 已加载');