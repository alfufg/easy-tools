const ALLOWED_ORIGINS = [
  'https://www.douyin.com'
];

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'executeFunction') {
      chrome.scripting.executeScript({
          target: {tabId: request.tabId},
          files: ['src/tools/dy_video_list_crawler/crawler.js']
      }).then(() => {
          chrome.scripting.executeScript({
              target: {tabId: request.tabId},
              function: () => {
                  return (function(){
                      const safeFunctions = {
                          filter_video_event: window.filter_video_event,
                          crawler_video_list: window.crawler_video_list,
                          extractVideoDataFromDetailPage: window.extractVideoDataFromDetailPage,
                          extractAuthorDataFromProfilePage: window.extractAuthorDataFromProfilePage
                      };
                      return safeFunctions[request.functionName]?.();
                  })();
              }
          });
      });
  }
});