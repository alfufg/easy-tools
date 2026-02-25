document.addEventListener('DOMContentLoaded', () => {

  const DOUYIN_VIDEO_CRAWL_CNT = 20;
  const DOUYIN_COMMENT_CRAWL_TOTAL_CNT = 500;
  const DOUYIN_VIDEO_COMMENT_CRAWL_CNT = 100;
  const SCROLL_CNT = 999;

  document.querySelector('#btn-back').addEventListener('click', () => {
    window.history.back();
  })

  document.querySelector('#open-douyin-home').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://www.douyin.com' });
  });

  document.querySelector('#douyin-keyword-search').addEventListener('click', () => {
    if (!layui.form.validate('#search-input')) {
      layer.alert('请输入关键词');
      return;
    }
    const keyword = document.querySelector('#search-input').value;
    chrome.tabs.create({ url: 'https://www.douyin.com/search/' + encodeURIComponent(keyword) + '?type=video' });
  });

  document.querySelector('#douyin_edit_sort').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const Selected = document.querySelector('select[name="douyin-video-sort"]').value;
    console.log('更改排序规则：', Selected)
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['src/tools/douyin_comment_crawler/demo.js']
      });

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        args: [Selected],
        function: (Selected) => {
          try {
            console.log('执行更改排序：', Selected)
            return filter_video_event('sort', Selected);
          } catch (error) {
            console.error('函数执行错误:', error);
            return { code: -1, message: error.message };
          }
        }
      });

      console.log('执行结果:', results[0].result);
    } catch (error) {
      console.error('脚本注入失败:', error);
    }
  });

  document.querySelector('#douyin_edit_type').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const Selected = document.querySelector('select[name="douyin-video-type"]').value;
    console.log('更改类型：', Selected)
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['src/tools/douyin_comment_crawler/demo.js']
      });

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        args: [Selected],
        function: (Selected) => {
          try {
            console.log('执行更改类型：', Selected)
            return filter_video_event('type', Selected);
          } catch (error) {
            console.error('函数执行错误:', error);
            return { code: -1, message: error.message };
          }
        }
      });

      console.log('执行结果:', results[0].result);
    } catch (error) {
      console.error('脚本注入失败:', error);
    }

  });

  document.querySelector('#douyin_video_crawler').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const video_cnt = document.querySelector('input[name="video_cnt"]').value || DOUYIN_VIDEO_CRAWL_CNT;
    console.log('点击爬取视频按钮', SCROLL_CNT, video_cnt, tab.id);
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['src/tools/douyin_comment_crawler/demo.js']
      });

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        args: [SCROLL_CNT, video_cnt],
        function: (scroll_cnt, video_cnt) => {
          try {
            return crawler_videos(scroll_cnt, video_cnt);
          } catch (error) {
            console.error('函数执行错误:', error);
            return { code: -1, message: error.message };
          }
        }
      });

      console.log('执行结果:', results[0].result);
    } catch (error) {
      console.error('脚本注入失败:', error);
    }
  });

  document.querySelector('#douyin_comment_crawler').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const comment_cnt = document.querySelector('input[name="comment_cnt"]').value || DOUYIN_COMMENT_CRAWL_TOTAL_CNT;
    const video_comment_cnt = document.querySelector('input[name="video_comment_cnt"]').value || DOUYIN_VIDEO_COMMENT_CRAWL_CNT;

    console.log('点击爬取评论按钮', tab.id, comment_cnt, video_comment_cnt);
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['src/tools/douyin_comment_crawler/demo.js']
      });

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        args: [SCROLL_CNT, video_comment_cnt],
        function: (scroll_cnt, video_comment_cnt) => {
          try {
            data = crawler_comments(scroll_cnt, video_comment_cnt);
            console.log('爬取结果：', data)
            return data;
          } catch (error) {
            console.error('函数执行错误:', error);
            return { code: -1, message: error.message };
          }
        }
      });

      console.log('执行结果:', results[0].result);
    } catch (error) {
      console.error('脚本注入失败:', error);
    }
  });

  document.querySelector('#douyin-keyword-start-crawler').addEventListener('click', async () => {
    try {
      const keyword = document.querySelector('#search-input').value;
      const sortType = document.querySelector('select[name="douyin-video-sort"]').value;
      const videoType = document.querySelector('select[name="douyin-video-type"]').value;
      const showMore = document.querySelector('input[name="show-more"]').checked;
      const videoCnt = document.querySelector('input[name="video_cnt"]').value || DOUYIN_VIDEO_CRAWL_CNT;
      const videoCommentCnt = document.querySelector('input[name="video_comment_cnt"]').value || DOUYIN_VIDEO_COMMENT_CRAWL_CNT;
      const commentCnt = document.querySelector('input[name="comment_cnt"]').value || DOUYIN_COMMENT_CRAWL_TOTAL_CNT;
      const retryCnt = 3;
      const info = {
        keyword: keyword,
        sortType: sortType,
        videoType: videoType,
        showMore: showMore,
        videoCnt: videoCnt,
        videoCommentCnt: videoCommentCnt,
        commentCnt: commentCnt,
        retryCnt: retryCnt,
      };
      console.log('[流程跟踪] 相关参数信息:', info);

      if (!keyword) {
        layer.msg('请输入关键词', { icon: 2 });
        return;
      }

      console.log('[流程跟踪] 创建新标签页');
      const newTab = await new Promise((resolve) => {
        chrome.tabs.create({
          url: `https://www.douyin.com/search/${encodeURIComponent(keyword)}?type=video`
        }, (tab) => {
          chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
            if (tabId === tab.id && changeInfo.status === 'complete') {
              chrome.tabs.onUpdated.removeListener(listener);
              resolve(tab);
            }
          });
        });
      });

      console.log('[流程跟踪] 注入基础脚本');
      await chrome.scripting.executeScript({
        target: { tabId: newTab.id },
        files: ['src/tools/douyin_comment_crawler/demo.js']
      });

      console.log('[流程跟踪] 等待3秒...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      const executeQueue = [
        {
          action: 'sort',
          value: sortType,
          func: (val) => filter_video_event('sort', val)
        },
        {
          action: 'type',
          value: videoType,
          func: (val) => filter_video_event('type', val)
        }
      ];

      for (const task of executeQueue) {
        if (task.value === 'all' || task.value === '综合') {
          console.log(`[流程跟踪] 跳过${task.action}变更，采用默认规则`);
          continue;
        }
        await chrome.scripting.executeScript({
          target: { tabId: newTab.id },
          args: [task.value],
          func: task.func
        });
        console.log(`[流程跟踪] 更新${task.action}规则:`, task.value);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log('[流程跟踪] 等待2秒...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      const videoResults = await chrome.scripting.executeScript({
        target: { tabId: newTab.id },
        args: [SCROLL_CNT, videoCnt],
        func: (scroll, cnt) => crawler_videos(scroll, cnt)
      });
      console.log('[流程跟踪] 爬取视频执行结果:', videoResults[0].result);

      console.log('[流程跟踪] 等待3秒...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      console.log('[流程控制] 开始顺序执行评论爬取');
      const allComments = await (async () => {
        const comments = [];
        const videoLinks = videoResults[0].result.data;

        for (const [index, link] of videoLinks.slice(0, videoCnt).entries()) {
          if (comments.length >= commentCnt) {
            console.log('[流程控制] 达到评论数量上限，终止爬取');
            break;
          }

          const tab = newTab;

          await new Promise(resolve => {
            chrome.tabs.update(tab.id, { url: link }, async (updatedTab) => {
              chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
                if (tabId === updatedTab.id && changeInfo.status === 'complete') {
                  chrome.tabs.onUpdated.removeListener(listener);
                  resolve();
                }
              });
            });
          });

          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['src/tools/douyin_comment_crawler/demo.js']
          });

          const commentResults = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            args: [SCROLL_CNT, videoCommentCnt, showMore, retryCnt],
            func: (scroll, cnt, showMore, retryCnt) => crawler_comments(scroll, cnt, showMore, retryCnt)
          });

          if (commentResults[0]?.result?.data?.length > 0) {
            comments.push(...commentResults[0].result.data);
          }

          console.log(`[流程跟踪] 第${index + 1}/${videoLinks.length}条视频处理完成, 共爬取${(commentResults[0]?.result?.data || []).length}条评论, 进度：${comments.length}/${commentCnt}`);
        }
        return comments.slice(0, commentCnt);
      })();

      const result = {
        code: 0,
        message: '爬取完成',
        data: allComments.slice(0, commentCnt),
        count: Math.min(allComments.length, commentCnt)
      };
      console.log('[流程跟踪] 爬取结果:', result);

      await new Promise(resolve => {
        saveContentToExcel(allComments, `抖音评论数据_${keyword}`);
        setTimeout(resolve, 1000);
        console.log('[流程跟踪] 保存文件完成');
      });
      console.log('[流程完成] 所有操作已顺序执行完毕');

    } catch (error) {
      console.error('全流程失败:', error);
      layer.msg(`执行失败: ${error.message}`, { icon: 2 });
    }
  });

  document.querySelector('#douyin-links-start-crawler').addEventListener('click', async () => {
    try {
      const videoCommentCnt = document.querySelector('#video-links-video-comment-cnt').value || DOUYIN_VIDEO_COMMENT_CRAWL_CNT;
      const commentCnt = document.querySelector('#video-links-comment-cnt').value || DOUYIN_COMMENT_CRAWL_TOTAL_CNT;
      const videoLinks = document.querySelector('#video-links').value.split('\n').map(link => link.trim())
        .filter(link => link)
        .filter(link => link.startsWith('https://www.douyin.com/') || link.startsWith('https://v.douyin.com/'));
      const showMore = document.querySelector('#video-links-show-more').checked;
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const retryCnt = 3;

      const info = {
        videoLinks: videoLinks,
        videoCommentCnt: videoCommentCnt,
        commentCnt: commentCnt,
        retryCnt: retryCnt,
        showMore: showMore,
      };
      console.log('[流程跟踪] 相关参数信息:', info);

      console.log('[流程跟踪] 开始爬取评论...')
      const allComments = [];

      for (const [index, link] of videoLinks.entries()) {

        if (allComments.length >= commentCnt) {
          console.log('[流程跟踪] 已达到评论需求数量，停止爬取。');
          break;
        }

        await new Promise((resolve) => {
          chrome.tabs.update(tab.id, { url: link }, (tab) => {
            chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
              if (tabId === tab.id && changeInfo.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(listener);
                resolve(tab);
              }
            });
          });
        });

        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['src/tools/douyin_comment_crawler/demo.js']
        })

        const commentResults = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          args: [SCROLL_CNT, videoCommentCnt, showMore, retryCnt],
          func: (scroll, cnt, showMore, retryCnt) => crawler_comments(scroll, cnt, showMore, retryCnt)
        });

        commentResults[0]?.result?.data?.length > 0 && allComments.push(...commentResults[0].result.data)
        console.log(`[流程跟踪] 第 ${index + 1} 条视频的评论爬取完成: ${commentResults[0].result.count} 条，`, '进度：', allComments.length, '/', commentCnt);
      }

      const result = {
        code: 0,
        message: '爬取完成',
        data: allComments.slice(0, commentCnt),
        count: Math.min(allComments.length, commentCnt)
      };
      console.log('[流程跟踪] 爬取结果:', result);

      saveContentToExcel(allComments, `抖音评论数据`);

    } catch (error) {
      console.error('[流程跟踪] 全流程失败:', error);
      layer.msg(`[流程跟踪] 执行失败: ${error.message}`, { icon: 2 });
    }
  });

  function saveContentToExcel(objData, filename) {
    const rawJson = objData.map((item, index) => {
      item.id = index + 1;
      return item;
    });

    const header = ["ID", "用户昵称", "用户头像", "评论内容", "点赞数", "城市", "评论级别", "回复数量", "评论时间"];
    const data = rawJson.map(item => [
      item.id,
      item.nickname,
      item.avatar,
      item.comment,
      item.like_count,
      item.city,
      item.comment_level,
      item.sub_comment_count,
      item.date
    ]);
    const formattedData = [header, ...data];

    const worksheet = XLSX.utils.aoa_to_sheet(formattedData);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "抖音评论数据");

    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    saveAs(
      new Blob([wbout], { type: 'application/octet-stream' }),
      `${filename}_${moment().format('YYYYMMDDHHmmss')}.xlsx`
    );
  }

  function saveContentToFile(content, filename) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    const timestamp = new Date()
      .toLocaleString('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
      .replace(/[^\d]/g, '')
      .slice(0, 12);

    a.download = `${filename}_${timestamp}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

});
