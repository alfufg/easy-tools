const ALLOWED_ORIGINS = [
  'https://www.baidu.com',
  'https://www.xiaohongshu.com',
  'https://www.douyin.com'
];

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'executeFunction') {
      chrome.scripting.executeScript({
          target: {tabId: request.tabId},
          files: ['demo.js']
      }).then(() => {
          chrome.scripting.executeScript({
              target: {tabId: request.tabId},
              function: () => {
                  return (function(){
                      const safeFunctions = {
                          filter_video_event: window.filter_video_event,
                          crawler_comments: window.crawler_comments,
                          crawler_videos: window.crawler_videos
                      };
                      return safeFunctions[request.functionName]?.();
                  })();
              }
          });
      });
  }
});

let targetTabId;

chrome.action.onClicked.addListener((tab) => {
  targetTabId = tab.id;
  chrome.debugger.attach({ tabId: targetTabId }, '1.3', () => {
    chrome.debugger.sendCommand(
      { tabId: targetTabId },
      'Network.enable'
    );
  });
});

chrome.debugger.onEvent.addListener((source, method, params) => {
  if (method === 'Network.responseReceived' && 
      params.response.url.includes('comment/list')) {
    
    chrome.debugger.sendCommand(
      { tabId: source.tabId },
      'Network.getResponseBody',
      { requestId: params.requestId },
      (response) => {
        const data = JSON.parse(response.body);
        console.log('抖音评论响应:', data);
      }
    );
  }
});

chrome.debugger.onDetach.addListener(() => {
  chrome.debugger.detach({ tabId: targetTabId });
});
