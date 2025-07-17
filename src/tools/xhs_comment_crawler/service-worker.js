const ALLOWED_ORIGINS = [
  'https://www.baidu.com',
  'https://www.xiaohongshu.com',
  'https://www.douyin.com'
];

// Allows users to open the side panel by clicking on the action toolbar icon
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// 监听 tab 更新事件
// chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
//   if (!tab.url) return;
//   const url = new URL(tab.url);
//   // console.log('tab updated', tabId, url.origin);

//   // V3 标准下需要使用 getOptions 检查当前配置
//   const currentOptions = await chrome.sidePanel.getOptions({ tabId });
//   // console.log('currentOptions', currentOptions);
  
//   if (ALLOWED_ORIGINS.includes(url.origin))  {
//       if (!currentOptions.enabled) {  // 仅在未启用时设置
//           console.log('enable sidepanel');
//           await chrome.sidePanel.setOptions({
//             tabId,
//             path: 'src/popup/index.html',
//             enabled: true
//           });
//           // 发送启用通知
//           // chrome.notifications.create({
//           //   type: 'basic',
//           //   title: '侧边栏已启用',
//           //   message: '当前站点支持扩展功能',
//           //   iconUrl: chrome.runtime.getURL('src/icon48.png')  // 修正图标路径
//           // }).catch(error => console.error('通知错误:', error));
//       }
//   } else {
//       if (currentOptions.enabled) {  // 仅在启用状态下才禁用
//           console.log('disable sidepanel');
//           await chrome.sidePanel.setOptions({
//             tabId,
//             // enabled: false,
//             // path: 'about:blank'  // 禁用时使用空白页面
//           });

//           // 发送禁用通知
//           // chrome.notifications.create({
//           //   type: 'basic',
//           //   title: '侧边栏已禁用',
//           //   message: '当前站点不支持扩展功能',
//           //   iconUrl: chrome.runtime.getURL('src/icon48.png')  // 修正图标路径
//           // }).catch(error => console.error('通知错误:', error));
//       }  
//   }
// });

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'executeFunction') {
      chrome.scripting.executeScript({
          target: {tabId: request.tabId},
          files: ['demo.js']
      }).then(() => {
          chrome.scripting.executeScript({
              target: {tabId: request.tabId},
              function: () => {
                  // 安全调用方式
                  return (function(){
                      const safeFunctions = {
                          filter_note_event: window.filter_note_event,
                          crawler_comments: window.crawler_comments
                      };
                      return safeFunctions[request.functionName]?.();
                  })();
              }
          });
      });
  }
});

/**
 * 监听API请求
 * 基础方案：使用 chrome.webRequest + fetch
 * 适用场景：仅需读取API返回值，不修改响应内容
 * 原理：通过监听请求完成事件，重新发起fetch获取数据
 * 优点：无需特殊权限，兼容性好
 * 缺点：需二次请求，可能受CORS限制
 * */
// chrome.webRequest.onCompleted.addListener(
//   async (details) => {
//     if (details.url.includes('comment/page?note_id') && details.initiator?.startsWith('https://www.xiaohongshu.com')) {
//       try {
//         // 添加请求标识判断
//         if (self.processedRequests?.has(details.requestId)) return;
        
//         // 初始化已处理请求集合
//         if (!self.processedRequests) self.processedRequests = new Set();
//         self.processedRequests.add(details.requestId);

//         // 重新请求获取完整响应
//         const response = await fetch(details.url);
//         const data = await response.json();
//         console.log('API返回值:', data);
        
//         // 存储或发送到content script
//         chrome.storage.local.set({ apiData: data });
//         chrome.tabs.query({ active: true }, (tabs) => {
//           chrome.tabs.sendMessage(tabs[0].id, { type: 'API_DATA', data });
//         });

//         // 处理完成后移除标识
//         self.processedRequests.delete(details.requestId);
//       } catch (e) {
//         console.error('获取数据失败:', e);
//       }
//     }
//   },
//   { urls: ["https://edith.xiaohongshu.com/*"] }
// );

/**
 * 监听API请求
 * 高级方案：使用 chrome.debugger
 * 适用场景：需要直接获取原始响应体，或修改返回值
 * 原理：通过Chrome调试协议拦截网络请求
 * 优点：能获取完整响应体，支持修改数据
 * 缺点：会显示调试提示，需处理跨域检测
 */
let targetTabId;

// 开启调试模式
chrome.action.onClicked.addListener((tab) => {
  targetTabId = tab.id;
  chrome.debugger.attach({ tabId: targetTabId }, '1.3', () => {
    chrome.debugger.sendCommand(
      { tabId: targetTabId },
      'Network.enable'
    );
  });
});

// 监听网络响应
chrome.debugger.onEvent.addListener((source, method, params) => {
  if (method === 'Network.responseReceived' && 
      params.response.url.includes('comment/page?note_id')) {
    
    // 获取响应体
    chrome.debugger.sendCommand(
      { tabId: source.tabId },
      'Network.getResponseBody',
      { requestId: params.requestId },
      (response) => {
        const data = JSON.parse(response.body);
        console.log('完整响应:', data);
        
        // 修改数据示例（需先暂停请求）
        // chrome.debugger.sendCommand(
        //   { tabId: source.tabId },
        //   'Network.continueRequest',
        //   { requestId: params.requestId, postData: JSON.stringify({ ...data, modified: true }) }
        // );
      }
    );
  }
});

// 关闭调试
chrome.debugger.onDetach.addListener(() => {
  chrome.debugger.detach({ tabId: targetTabId });
});


