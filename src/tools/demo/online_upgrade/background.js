chrome.action.onClicked.addListener(async () => {
  try {
    const currentVersion = chrome.runtime.getManifest().version;
    console.log('当前版本:', currentVersion);

    // 从 manifest.json 中获取 update_url
    const manifest = chrome.runtime.getManifest();
    const updateUrl = manifest.update_url;
    console.log('update_url:', updateUrl);

    // 定义 checkServerVersion 函数，用于从 update_url 获取 xml 中的版本信息
    async function checkServerVersion() {
        try {
            // 发起网络请求获取 xml 文件
            const response = await fetch(updateUrl);
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
    
    // 调用函数获取服务器数据
    const serverData = await checkServerVersion();    
    if (serverData.version > currentVersion) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'easytools.png',
        title: '发现新版本',
        message: `最新版本${serverData.version}已发布，点击更新`
      });
    }
  } catch (error) {
    console.error('自动版本检查失败:', error);
  }
});