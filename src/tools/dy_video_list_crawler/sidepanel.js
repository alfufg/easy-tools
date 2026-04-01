document.addEventListener('DOMContentLoaded', () => {

  const DEFAULT_VIDEO_CNT = 20;
  const SCROLL_CNT = 999;

  document.querySelector('#btn-back').addEventListener('click', () => {
    window.history.back();
  });

  layui.use(['form'], function() {
    const form = layui.form;
    form.render();

    document.querySelector('#douyin-keyword-search').addEventListener('click', () => {
      const keyword = document.querySelector('#search-input').value;
      if (!keyword) {
        layer.alert('请输入关键词');
        return;
      }
      chrome.tabs.create({ url: 'https://www.douyin.com/search/' + encodeURIComponent(keyword) + '?type=video' });
    });
  });

  function updateProgress(message) {
    const progressEl = document.querySelector('#progress-info');
    if (progressEl) {
      progressEl.textContent = message;
    }
    console.log('[流程跟踪] ' + message);
  }

  document.querySelector('#btn-start-crawler').addEventListener('click', async () => {
    const keyword = document.querySelector('#search-input').value;
    const sortType = document.querySelector('select[name="video-sort"]').value;
    const videoType = document.querySelector('select[name="video-type"]').value;
    const videoCnt = parseInt(document.querySelector('input[name="video-cnt"]').value) || DEFAULT_VIDEO_CNT;

    const hasVideoList = document.querySelector('input[name="data-video-list"]').checked;
    const hasVideoData = document.querySelector('input[name="data-video-data"]').checked;
    const hasAuthorData = document.querySelector('input[name="data-author-data"]').checked;

    if (!keyword) {
      layer.msg('请输入关键词', { icon: 2 });
      return;
    }

    if (!hasVideoList && !hasVideoData && !hasAuthorData) {
      layer.msg('请至少选择一种数据类型', { icon: 2 });
      return;
    }

    console.log('[流程跟踪] 开始执行, 关键词:', keyword, '数量:', videoCnt);
    updateProgress('正在打开抖音搜索页面...');

    try {
      const searchTab = await new Promise((resolve) => {
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

      console.log('[流程跟踪] 搜索页标签已创建');
      updateProgress('等待页面加载...');

      await new Promise(resolve => setTimeout(resolve, 3000));

      console.log('[流程跟踪] 注入脚本');
      await chrome.scripting.executeScript({
        target: { tabId: searchTab.id },
        files: ['src/tools/dy_video_list_crawler/crawler.js'],
        world: 'MAIN'
      });

      if (videoType && videoType !== '') {
        await chrome.scripting.executeScript({
          target: { tabId: searchTab.id },
          args: ['type', videoType],
          func: (filter, value) => filter_video_event(filter, value),
          world: 'MAIN'
        });
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (sortType && sortType !== '综合') {
        await chrome.scripting.executeScript({
          target: { tabId: searchTab.id },
          args: ['sort', sortType],
          func: (filter, value) => filter_video_event(filter, value),
          world: 'MAIN'
        });
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      updateProgress('正在获取视频链接列表...');

      const videoResults = await chrome.scripting.executeScript({
        target: { tabId: searchTab.id },
        args: [SCROLL_CNT, videoCnt],
        func: (scroll, cnt) => crawler_video_list(scroll, cnt),
        world: 'MAIN'
      });

      const videoLinks = videoResults[0]?.result?.data || [];
      console.log('[流程跟踪] 视频链接数量:', videoLinks.length);

      if (videoLinks.length === 0) {
        layer.msg('未找到任何视频', { icon: 2 });
        chrome.tabs.remove(searchTab.id);
        return;
      }

      updateProgress(`获取到 ${videoLinks.length} 个视频链接，开始进入详情页...`);

      const detailTab = searchTab;
      const allData = [];

      for (const [index, videoLink] of videoLinks.entries()) {
        updateProgress(`正在处理第 ${index + 1}/${videoLinks.length} 个视频...`);

        await new Promise((resolve) => {
          chrome.tabs.update(detailTab.id, { url: videoLink }, (tab) => {
            chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
              if (tabId === tab.id && changeInfo.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(listener);
                resolve();
              }
            });
          });
        });

        await new Promise(resolve => setTimeout(resolve, 2000));

        await chrome.scripting.executeScript({
          target: { tabId: detailTab.id },
          files: ['src/tools/dy_video_list_crawler/crawler.js'],
          world: 'MAIN'
        });

        console.log('[流程跟踪] 第', index + 1, '个视频，正在提取数据，链接:', videoLink);

        const dataResult = await chrome.scripting.executeScript({
          target: { tabId: detailTab.id },
          func: () => extractDataFromVideoPage(),
          world: 'MAIN'
        });

        console.log('[流程跟踪] 第', index + 1, '个视频，dataResult:', JSON.stringify(dataResult, null, 2));

        const data = dataResult[0]?.result;
        
        console.log('[流程跟踪] 第', index + 1, '个视频，提取到的原始数据:', JSON.stringify(data, null, 2));
        
        if (data) {
          const row = { id: index + 1 };

          if (hasVideoList) {
            row.videoTitle = data.videoTitle || '';
            row.videoLink = data.videoLink || '';
          }

          if (hasVideoData) {
            row.likeCount = data.likeCount || 0;
            row.commentCount = data.commentCount || 0;
            row.shareCount = data.shareCount || 0;
            row.collectCount = data.collectCount || 0;
          }

          if (hasAuthorData) {
            row.authorNickname = data.authorNickname || '';
            row.authorAvatar = data.authorAvatar || '';
            row.authorLink = data.authorLink || '';
            row.followerCount = data.followerCount || 0;
            row.totalFavorited = data.totalFavorited || 0;
          }

          allData.push(row);
          console.log('[流程跟踪] 第', index + 1, '个视频，处理后数据:', JSON.stringify(row, null, 2));
        } else {
          console.error('[流程跟踪] 第', index + 1, '个视频，数据为空!');
        }
      }

      chrome.tabs.remove(detailTab.id);

      exportToExcel(allData, keyword, hasVideoList, hasVideoData, hasAuthorData);

      updateProgress(`导出完成！共 ${allData.length} 条数据`);
      layer.msg('导出完成', { icon: 1 });

    } catch (error) {
      console.error('[流程跟踪] 执行失败:', error);
      layer.msg(`执行失败: ${error.message}`, { icon: 2 });
      updateProgress(`执行失败: ${error.message}`);
    }
  });

  function exportToExcel(data, keyword, hasVideoList, hasVideoData, hasAuthorData) {
    const headers = ['ID'];
    const keys = ['id'];

    if (hasVideoList) {
      headers.push('视频标题', '视频链接');
      keys.push('videoTitle', 'videoLink');
    }

    if (hasVideoData) {
      headers.push('点赞数', '评论数', '分享数', '收藏数');
      keys.push('likeCount', 'commentCount', 'shareCount', 'collectCount');
    }

    if (hasAuthorData) {
      headers.push('达人昵称', '头像链接', '达人主页链接', '粉丝数', '获赞数');
      keys.push('authorNickname', 'authorAvatar', 'authorLink', 'followerCount', 'totalFavorited');
    }

    const rows = data.map(item => keys.map(key => item[key] || ''));

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '视频数据');

    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    saveAs(
      new Blob([wbout], { type: 'application/octet-stream' }),
      `抖音视频数据_${keyword}_${moment().format('YYYYMMDDHHmmss')}.xlsx`
    );
  }

});