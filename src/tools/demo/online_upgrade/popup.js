// 获取版本信息元素
const currentVersionSpan = document.getElementById('current-version');
const serverVersionSpan = document.getElementById('server-version');
const statusDiv = document.getElementById('status');
const updateSection = document.getElementById('update-section');
const updateUrl = chrome.runtime.getManifest().update_url; // 获取 update_url 配置

// 从manifest获取当前版本
const currentVersion = chrome.runtime.getManifest().version;
currentVersionSpan.textContent = currentVersion;

// 定义 checkServerVersion 函数，用于从 update_url 获取 xml 中的版本信息
async function checkServerVersion() {
    try {
        // 发起网络请求获取 xml 文件
        const response = await fetch(`${updateUrl}?_=${Date.now()}`);
        if (!response.ok) {
            throw new Error(`网络请求失败，状态码: ${response.status}`);
        }
        const xmlText = await response.text();
        // 解析 xml 文件
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        // 查找 updatecheck 节点中的 version 属性
        const updateCheckNode = xmlDoc.querySelector('updatecheck');
        if (!updateCheckNode) {
            throw new Error('未找到 updatecheck 节点');
        }
        const version = updateCheckNode.getAttribute('version');
        if (!version) {
            throw new Error('未找到 version 属性');
        }
        return { version };
    } catch (error) {
        console.error('获取服务器版本信息失败:', error);
        throw error;
    }
}

// 检查版本按钮点击事件
// 在DOM加载完成后自动执行版本检查
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const serverData = await checkServerVersion();
    serverVersionSpan.textContent = serverData.version;

    if (serverData.version > currentVersion) {
      statusDiv.className = 'status update-available';
      statusDiv.textContent = '发现新版本！';
      updateSection.style.display = 'block';
    } else {
      statusDiv.className = 'status up-to-date';
      statusDiv.textContent = '当前已是最新版本';
      updateSection.style.display = 'none';
    }
  } catch (error) {
    console.error('自动版本检查失败:', error);
    statusDiv.textContent = '自动检查失败，请手动重试';
  }
});


// 更新按钮点击事件
document.getElementById('update-btn').addEventListener('click', () => {
  chrome.downloads.download({
    url: 'https://tools.toutiaoeasy.cn/extension/easytools/easytools.crx',
    filename: 'easytools_update.crx'
  }, (downloadId) => {
    chrome.downloads.onChanged.addListener((delta) => {
      if (delta.id === downloadId && delta.state?.current === 'complete') {
        // 下载完成后提示用户刷新扩展
        if (confirm('更新包下载完成，点击确定重新加载扩展')) {
          chrome.runtime.reload();
        }
      }
    });
  });
});