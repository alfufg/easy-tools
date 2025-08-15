document.addEventListener('DOMContentLoaded', () => {
  console.log("dy_video_download/download.js loaded");

  document.querySelector('#btn-back').addEventListener('click', () => {
    window.history.back();
  })

  document.querySelector('#dy-start-download').addEventListener('click', async () => {
    console.log("dy_start_download clicked");

    // 第一步：验证表单
    if (!layui.form.validate('#video-urls')) return;
    
    const urls = document.querySelector('#video-urls').value.split('\n')
        .map(url => url.trim())
        .filter(url => url)
        .filter(url => url.startsWith('https://www.douyin.com/'));
    
    if (urls.length === 0) {
        layui.layer.msg('请输入有效的抖音视频链接', { icon: 2 });
        return;
    }
    console.log("urls:", urls);

    for (const url of urls) {
      // 打开新的标签页
      const tab = await chrome.tabs.create({ url: url, active: true });

      // 注入脚本
      console.log("[DEBUG] injecting script")
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['src/tools/dy_video_download/douyin-dl.js'],
        world: 'MAIN',
      });
           
      // 等待页面加载
      await new Promise(resolve => 
        chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
            if (tabId === tab.id && info.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(listener);
                resolve();
            }
        })
      );

      // 等待3秒后执行后面的代码
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Chrome扩展背景页中的实现
      async function downloadFromExtension(videoUrl) {
        // 扩展中可使用chrome.downloads API
        chrome.downloads.download({
          url: videoUrl,
          headers: [
            { name: 'User-Agent', value: 'Mozilla/5.0 ...' },
            { name: 'Referer', value: 'https://www.douyin.com/' }
          ],
          saveAs: true
        }, (downloadId) => {
          if (chrome.runtime.lastError) {
            console.error('下载失败:', chrome.runtime.lastError);
          } else {
            console.log('下载任务创建成功，ID:', downloadId);
          }
        });
      }
      const url2 = 'https://v26-cold.douyinvod.com/5431fa6ad6b34752e1d81e9750629802/684bccdf/video/tos/cn/tos-cn-ve-15/oASd1eAOeAIdq2ohQG7QjUCu0IBaLBK4f5rE4h/?a=1128&br=1617&bt=1617&btag=c0010e000a8000&cd=0%7C0%7C0%7C0&ch=0&cquery=100y&cr=0&cs=0&cv=1&dr=0&ds=3&dy_q=1749794293&dy_va_biz_cert=&feature_id=fea919893f650a8c49286568590446ef&ft=MgtpHQQqUnXfmoZmo0OW_QYaUqiXRMoJRVJERQAMIbPD-Ipz&l=20250613135813BCCBD20BA059EE81A1AD&mime_type=video_mp4&qs=0&rc=ZTU4aTc4NGdmNDw2aGZnaUBpM3g4dnI5cnB2MzMzNGkzM0A0L2AzYTE2Nl4xYC8vLjA1YSNrbGFjMmRrcWJhLS1kLWFzcw%3D%3D'
      await downloadFromExtension(url2);
    }





    
 







  })

});