/**
 * 根据xpath获取元素内容
 * @param {*} xpath 
 * @returns 
 */
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
        result.push(node.textContent.trim());
    }
    
    return result.length === 0 ? null : result.length === 1 ? result[0] : result;
}

// 使用示例：
// 获取单个元素：const title = getContentByXpath('//h1');
// 获取多个元素：const links = getContentByXpath('//a/@href');

// const links = getContentByXpath('//a/@href');
// console.log(links);


/**
 * 智能滚动函数
 * @param {string} [xpath] - 可选参数，指定滚动区域的XPath
 * @param {number} [delta=100] - 滚动距离（默认100像素）
 */
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

    // 添加实际滚动逻辑
    if (targetElement === document.documentElement) {
        // 处理主文档滚动
        window.scrollBy({
            top: delta,
            behavior: 'smooth'
        });
    } else {
        // 处理自定义容器滚动
        targetElement.scrollTop += delta;
    }

    // 调试日志
    console.log('[DEBUG] 滚动目标:', targetElement);
    console.log('[DEBUG] 滚动量:', delta);
    return true;
}

/**
 * 判断是否滚动到底部
 * @param {string} [xpath] - 可选参数，指定检测区域的XPath
 * @returns {boolean} 是否到达底部
 */
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

  // 添加5px容差防止边界误差
  const threshold = 5;
  const isBottom = target.scrollTop + target.clientHeight + threshold >= target.scrollHeight;
  
  console.log(`[DEBUG] 滚动状态：${isBottom ? '已到底部' : '未到底部'}`);
  return isBottom;
}

/**
 * 统计指定XPath匹配的节点数量
 * @param {string} xpath - 需要统计的XPath表达式
 * @returns {number} 匹配的节点数量（找不到返回0）
 */
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


async function crawler_notes(scroll_count = 100, crawler_count = 30) {
    const note_links = []
    for (let i = 0; i < scroll_count; i++) {
        wheelScroll(null, 500);

        // 判断数量
        // const count = countXpathNodes('//div[@class="feeds-container"]//a[@class="cover mask ld"]');
        // console.log(`当前节点数量：${count}`);
        // if (count >= crawler_count) {
        //     console.log('达到'+crawler_count+'个节点，停止滚动');
        //     break;
        // }

        // 检查是否到达底部
        if (isScrollBottom()) {
            console.log('[DEBUG] 已滚动到底部，停止滚动');
            break;
        }

        const batch_note_links = getContentByXpath('//div[@class="feeds-container"]//a[@class="cover mask ld"]/@href');
        note_links.push(...batch_note_links);
        unique_note_links = [...new Set(note_links)];
        console.log('batch_note_links_count:', batch_note_links.length);
        console.log('unique_note_links_count:', unique_note_links.length); // 输出去重后的长度，用于调试和确认去重效果，可删除或注释掉
        
        if(unique_note_links.length >= crawler_count){
            console.log('[DEBUG] 达到'+crawler_count+'个节点，停止滚动');
            break;
        }

        await new Promise(resolve => setTimeout(resolve, 1000)); // 添加滚动间隔
    }
    console.log(unique_note_links);
    return {
        "code": 0,
        "data": unique_note_links,
        "message": "success",
        "count": unique_note_links.length
    }
}

// 调用示例（返回true且实际滚动）
// wheelScroll(null, 600);
// 修改后的自动滚动逻辑

// 小红书笔记列表筛选
function filter_note_event(filter, value){
  if (filter === 'type'){
    const el = document.querySelector(`#${value}`);
    if (el) el.click();
    else console.error('[DEBUG] 找不到元素:', `#${value}`);
  }else if (filter === 'sort'){
    document.querySelector(".filter").click()
    const allItems = document.querySelectorAll('.dropdown-items li span.text');
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

async function crawler_comments(scroll_count = 9999, crawler_count = 100, showMore=True, retryCnt = 3) {
    console.log('[DEBUG] 开始爬取评论');
    const all_comments = [];
    let retryCount = 0; // 计数器声明移至函数作用域
    
    for (let i = 0; i < scroll_count; i++) {
        wheelScroll('//div[contains(@class,"note-scroller")]', 500);

        // 展开子评论
        if (showMore) {
            const showMoreBtn = document.querySelectorAll('.show-more');
            showMoreBtn.forEach(async (btn) => {
                if (btn) {
                    btn.click();
                    console.log('[DEBUG] 展开子评论');
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            });
        }

        
        // 判断数量（添加容错处理）
        let count = countXpathNodes('//div[contains(@class,"note-scroller")]//span[contains(@class,"note-text")]') || 0;
        console.log(`[DEBUG] 当前节点数量：${count}`);
        
        // 获取并累积评论（优化去重性能）
        const oParentComment = $('div.comments-container>div.list-container>div.parent-comment');
        console.log(oParentComment)
        oParentComment.each((index, ele) => {
            const oCommentInnerContainer = $(ele).find('div.comment-inner-container');
            const nickname = oCommentInnerContainer.find('.right .author-wrapper .author>a').html();
            const avatar = oCommentInnerContainer.find('>.avatar img.avatar-item').attr('src');
            const comment = oCommentInnerContainer.find('.right span.note-text>span').html();
            const like_count = oCommentInnerContainer.find('.right .interactions .like span.count').html();
            const city = oCommentInnerContainer.find('.right .info .date>span').eq(1).html();
            const sub_comment_count = oCommentInnerContainer.find('.right .interactions .reply span.count').html();
            const date = oCommentInnerContainer.find('.right .info .date>span').eq(0).html();
            console.log(nickname)
            if (!all_comments.some(item => item.comment === comment)) {
                all_comments.push({
                    nickname: nickname, // 昵称
                    avatar: avatar, // 头像
                    comment: comment, // 评论内容
                    like_count: (!isNaN(like_count) && like_count !== '') ? like_count : '', // 点赞数
                    city: city, // 城市
                    comment_level: 'L1', // 评论级别
                    sub_comment_count: (!isNaN(sub_comment_count) && sub_comment_count !== '') ? sub_comment_count : '', // 回复数量
                    date: date // 评论时间
                });
                if (showMore) {
                    const aCommentItems = $(ele).find('.reply-container>div.list-container>div.comment-item')
                    aCommentItems.each((index2, ele2) => {
                        const oCommentInnerContainer2 = $(ele2).find('div.comment-inner-container');
                        const nickname2 = oCommentInnerContainer2.find('.right .author-wrapper .author>a').html();
                        const avatar2 = oCommentInnerContainer2.find('>.avatar img.avatar-item').attr('src');
                        const comment2 = oCommentInnerContainer2.find('.right span.note-text>span').html();
                        const like_count2 = oCommentInnerContainer2.find('.right .interactions .like span.count').html();
                        const city2 = oCommentInnerContainer2.find('.right .info .date>span').eq(1).html();
                        const sub_comment_count2 = oCommentInnerContainer2.find('.right .interactions .reply span.count').html();
                        const date2 = oCommentInnerContainer2.find('.right .info .date>span').eq(0).html();
                        if (!all_comments.some(item => item.comment === comment2)) {
                            all_comments.push({
                                nickname: nickname2, // 昵称
                                avatar: avatar2, // 头像
                                comment: comment2, // 评论内容
                                like_count: (!isNaN(like_count2) && like_count2 !== '') ? like_count2 : '', // 点赞数
                                city: city2, // 城市
                                comment_level: 'L2', // 评论级别
                                sub_comment_count: (!isNaN(sub_comment_count2) && sub_comment_count2 !== '') ? sub_comment_count2 : '', // 回复数量
                                date: date2 // 评论时间
                            });
                        }
                    })
                }
            }
        })
        console.log(all_comments)

        // const batchComments = getContentByXpath('//div[@class="list-container"]//span[contains(@class,"note-text")]') || [];
        // console.log(batchComments)
        // batchComments.forEach(comment => {
        //     console.log(comment)
        //     if (!all_comments.some(exist => exist.trim() === comment.trim())) {
        //         all_comments.push(comment);
        //     }
        // });

        if (all_comments.length >= crawler_count) {
            console.log('[DEBUG] 达到'+crawler_count+'个节点，停止滚动');
            break;
        }
        
        // 优化滚动间隔检测
        await new Promise(resolve => {
            const checkInterval = setInterval(() => {
                const newCount = countXpathNodes('//div[@class="note-scroller"]//span[@class="note-text"]');
                if (newCount > count) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 500);
            setTimeout(() => resolve(), 1000); // 最大等待3秒
        });

        // 检查是否到达底部
        if (isScrollBottom('//div[@class="note-scroller"]')) {
            retryCount++;
            console.log(`[DEBUG] 第${retryCount}次检测到底部`);
            if(retryCount >= retryCnt) {
                console.log('[DEBUG] 连续3次检测到底部，确认终止滚动');
                break;
            }
        } else {
            retryCount = 0; // 重置计数器
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


