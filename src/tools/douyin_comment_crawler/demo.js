function getContentByXpath(xpath) {
  const result = [];
  const snapshot = document.evaluate(
    xpath,
    document,
    null,
    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
    null
  );

  for (let i = 0; i < snapshot.snapshotLength; i++) {
    const node = snapshot.snapshotItem(i);
    if (node.nodeType === Node.ATTRIBUTE_NODE) {
      result.push(node.nodeValue);
    } else {
      result.push(node.textContent.trim());
    }
  }

  return result.length === 0 ? null : result.length === 1 ? result[0] : result;
}

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

function wheelScroll(xpath = null, delta = 100) {
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
      console.warn('[DEBUG] 未找到滚动容器，使用默认滚动');
      window.scrollBy({ top: delta, behavior: 'smooth' });
      return true;
    }

    if (node) {
      if (node.nodeType === Node.ATTRIBUTE_NODE) {
        targetElement = node.ownerElement;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        targetElement = node;
      } else {
        console.error('[DEBUG] 不支持的节点类型:', node.nodeType);
        return false;
      }
    } else {
      console.error('[DEBUG] 未找到XPath元素:', xpath);
      return false;
    }
  }

  if (targetElement === document.documentElement) {
    window.scrollBy({
      top: delta,
      behavior: 'smooth'
    });
  } else {
    targetElement.scrollTop += delta;
  }

  console.log('[DEBUG] 滚动目标:', targetElement);
  console.log('[DEBUG] 滚动量:', delta);
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
      } else {
        console.error('[DEBUG] 无法检测非元素节点');
        return false;
      }
    } else {
      console.error('[DEBUG] 未找到指定滚动容器');
      return false;
    }
  }

  const threshold = 5;
  const isBottom = target.scrollTop + target.clientHeight + threshold >= target.scrollHeight;

  console.log(`[DEBUG] 滚动状态：${isBottom ? '已到底部' : '未到底部'}`);
  return isBottom;
}

function countXpathNodes(xpath) {
  const snapshot = document.evaluate(
    xpath,
    document,
    null,
    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
    null
  );
  return snapshot.snapshotLength;
}

async function crawler_videos(scroll_count = 100, crawler_count = 30) {
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

async function crawler_comments(scroll_count = 9999, crawler_count = 100, showMore = true, retryCnt = 3) {
  console.log('[DEBUG] 开始爬取抖音评论');
  const all_comments = [];
  let prevCount = 0;
  let noNewCount = 0;
  let bottomCount = 0;

  for (let i = 0; i < scroll_count; i++) {
    wheelScroll('//div[contains(@class,"route-scroll-container")]', 500);

    await new Promise(resolve => setTimeout(resolve, 1000));

    if (showMore) {
      const showMoreBtn = document.querySelectorAll('.comment-reply-expand-btn');
      for (const btn of showMoreBtn) {
        if (btn) {
          btn.click();
          console.log('[DEBUG] 展开子评论');
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
    }

    const oCommentItems = document.querySelectorAll('[data-e2e="comment-item"]');
    console.log(`[DEBUG] 第${i + 1}次滚动，获取到评论节点数量: ${oCommentItems.length}`);
    
    oCommentItems.forEach((ele) => {
      const infoWrap = ele.querySelector('.comment-item-info-wrap');
      const nickname = infoWrap?.querySelector('a')?.textContent?.trim() || '';
      const avatar = ele.querySelector('.comment-item-avatar img')?.src || '';
      
      const infoParent = infoWrap?.parentElement;
      const children = infoParent ? Array.from(infoParent.children) : [];
      const infoIndex = children.indexOf(infoWrap);
      const comment = children[infoIndex + 1]?.textContent?.trim() || '';
      const dateLocation = children[infoIndex + 2]?.textContent?.trim() || '';
      
      const statsContainer = ele.querySelector('.comment-item-stats-container');
      const like_count = statsContainer?.querySelector('p span')?.textContent?.trim() || '0';
      
      const date = dateLocation.split('·')[0]?.trim() || '';
      const city = dateLocation.split('·')[1]?.trim() || '';
      const sub_comment_count = ele.querySelector('.comment-reply-expand-btn span')?.textContent?.trim() || '';

      if (comment && !all_comments.some(item => item.comment === comment)) {
        all_comments.push({
          nickname: nickname,
          avatar: avatar,
          comment: comment,
          like_count: like_count,
          city: city,
          comment_level: 'L1',
          sub_comment_count: sub_comment_count,
          date: date
        });

        if (showMore) {
          const subComments = ele.querySelectorAll('.sub-comment-item, [class*="ReplyItem"]');
          subComments.forEach((subEle) => {
            const subInfoWrap = subEle.querySelector('.comment-item-info-wrap');
            const nickname2 = subInfoWrap?.querySelector('a')?.textContent?.trim() || '';
            const avatar2 = subEle.querySelector('.comment-item-avatar img')?.src || '';
            
            const subInfoParent = subInfoWrap?.parentElement;
            const subChildren = subInfoParent ? Array.from(subInfoParent.children) : [];
            const subInfoIndex = subChildren.indexOf(subInfoWrap);
            const comment2 = subChildren[subInfoIndex + 1]?.textContent?.trim() || '';
            const dateLocation2 = subChildren[subInfoIndex + 2]?.textContent?.trim() || '';
            
            const subStatsContainer = subEle.querySelector('.comment-item-stats-container');
            const like_count2 = subStatsContainer?.querySelector('p span')?.textContent?.trim() || '0';
            
            const date2 = dateLocation2.split('·')[0]?.trim() || '';
            const city2 = dateLocation2.split('·')[1]?.trim() || '';

            if (comment2 && !all_comments.some(item => item.comment === comment2)) {
              all_comments.push({
                nickname: nickname2,
                avatar: avatar2,
                comment: comment2,
                like_count: like_count2,
                city: city2,
                comment_level: 'L2',
                sub_comment_count: '',
                date: date2
              });
            }
          });
        }
      }
    });
    
    console.log(`[DEBUG] 当前已收集评论数: ${all_comments.length}`);

    if (all_comments.length >= crawler_count) {
      console.log('[DEBUG] 达到' + crawler_count + '个评论，停止滚动');
      break;
    }

    if (all_comments.length === prevCount) {
      noNewCount++;
      console.log(`[DEBUG] 未获取到新评论，连续次数: ${noNewCount}`);
      if (noNewCount >= retryCnt) {
        console.log('[DEBUG] 连续' + retryCnt + '次未获取到新评论，停止滚动');
        break;
      }
    } else {
      noNewCount = 0;
    }
    prevCount = all_comments.length;

    const scrollContainer = document.querySelector('.route-scroll-container');
    if (scrollContainer) {
      const isBottom = scrollContainer.scrollTop + scrollContainer.clientHeight + 10 >= scrollContainer.scrollHeight;
      if (isBottom) {
        bottomCount++;
        console.log(`[DEBUG] 第${bottomCount}次检测到底部`);
        if (bottomCount >= retryCnt) {
          console.log('[DEBUG] 连续' + retryCnt + '次检测到底部，停止滚动');
          break;
        }
      } else {
        bottomCount = 0;
      }
    }
  }

  console.log("[DEBUG] 总计爬取评论: ", all_comments.length);
  return {
    "code": 0,
    "data": all_comments,
    "message": "success",
    "count": all_comments.length
  }
}
