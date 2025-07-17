document.addEventListener('DOMContentLoaded', () => {
    console.log("recorder.js loaded");
    let mediaRecorder;
    let recordedChunks = [];
    
    // 提取视频ID的正则表达式
    const getVideoId = (url) => {
        const match = url.match(/(?:modal_id=|video\/)(\d+)/);
        return match ? match[1] : Date.now().toString();
    };

    // 点击开始录制按钮
    // 新增权限管理模块
    let hasPermission = false;
    let globalStream = null;
    
    // 独立权限请求方法
    async function requestRecordingPermission() {
        try {
            const handle = await chrome.windows.getCurrent();
            globalStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    mediaSource: "tab",
                    chromeMediaSource: "tab",
                    chromeMediaSourceId: handle.id
                },
                audio: true
            });
            hasPermission = true;
            return true;
        } catch (error) {
            console.error('权限获取失败:', error);
            hasPermission = false;
            return false;
        }
    }

    // 生成文件名
    function generateFileName(url, suffix = '', ext = 'webm', currentIndex='0') {
        const videoId = getVideoId(url);
        const date = new Date();
        const dateString = [
            date.getFullYear().toString().slice(-2),
            (date.getMonth() + 1).toString().padStart(2, '0'),
            date.getDate().toString().padStart(2, '0')
        ].join('');
        return `${currentIndex}_${videoId}_${dateString}${suffix ? '_' + suffix : ''}.${ext}`;
    }
    
    // 修改后的点击事件处理
    document.querySelector('#dy-start-recording').addEventListener('click', async () => {
        // 第一步：验证表单
        if (!layui.form.validate('#video-urls')) return;
        
        const urls = document.querySelector('#video-urls').value.split('\n')
            .map(url => url.trim())
            .filter(url => url)
            .filter(url => url.startsWith('https://www.douyin.com/'));

        // 第二步：统一获取权限
        if (!await requestRecordingPermission()) {
            alert('请先授权屏幕录制权限！');
            return;
        }

        // 第三步：获取类型选项
        const shot = document.querySelector('input[name="shot"]').checked;
        const record = document.querySelector('input[name="record"]').checked;
        const source = document.querySelector('input[name="source"]').checked;

        console.log('[DEBUG] 获取类型:',  "shot: ", shot, ", record:", record, ", source:", source );

        // 第四步：处理所有URL
        for (const [index, url] of urls.entries()) {
            const currentIndex = index + 1;
            const tab = await chrome.tabs.create({ url, active: true });
            
            // 等待页面加载
            await new Promise(resolve => 
                chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
                    if (tabId === tab.id && info.status === 'complete') {
                        chrome.tabs.onUpdated.removeListener(listener);
                        resolve();
                    }
                })
            );

            if (shot) {
                await createScreenshot(tab, url, currentIndex);
            }

            if (source) {
                downloadSourceVideo(tab, url, currentIndex);
                sourceUrlsText(tab, url, currentIndex);
            }

            // 开始录制
            await startRecording(tab);
            
            // 等待当前录制完成
            await new Promise(resolve => {
                mediaRecorder.onstop = () => {
                    console.log("[DEBUG] 保存视频并关闭标签页");
                    // 添加页面关闭逻辑
                    chrome.tabs.remove(tab.id);                    
                    const blob = new Blob(recordedChunks, { type: 'video/webm' });
                    const fileName = generateFileName(url, 'record','webm', currentIndex); // 添加时间戳
                    const objectURL = URL.createObjectURL(blob);  // 修复变量名冲突
                    const a = document.createElement('a');
                    a.href = objectURL;
                    a.download = fileName;
                    a.click();
                    URL.revokeObjectURL(objectURL);
                    
                    resolve();  // 移动resolve到所有保存逻辑完成后
                };
            });
            
            // 重置录制状态（保留全局权限）
            recordedChunks = [];
            mediaRecorder = null;
            chrome.tabs.remove(tab.id);
        }

        // 第三步：统一释放权限
        if (globalStream) {
            globalStream.getTracks().forEach(track => track.stop());
            globalStream = null;
        }
        hasPermission = false;
        console.log('[DEBUG] 所有录制完成，已释放权限');
    });

    // 修改startRecording方法使用全局stream
    const startRecording = async (tab) => {
        if (!hasPermission) return;
        
        mediaRecorder = new MediaRecorder(globalStream);
        
        // 重新定义处理函数
        handleStreamInactive = () => {
            if (mediaRecorder?.state === 'recording') {
                console.log('[DEBUG] 检测到媒体流停止');
                mediaRecorder.stop();
            };
        };
        
        globalStream.addEventListener('inactive', handleStreamInactive);
        
        // 修改URL变更监听（添加清理逻辑）
        const urlChangeHandler = (tabId, changeInfo) => {
            if (tabId === tab.id && changeInfo.url) {
                console.log('[DEBUG] 检测到URL变更:', changeInfo.url);
                if (mediaRecorder && mediaRecorder.state === 'recording') {
                    setTimeout(() => {
                        mediaRecorder.stop();
                        chrome.tabs.onUpdated.removeListener(urlChangeHandler);
                    }, 500);
                }
            }
        };
        chrome.tabs.onUpdated.addListener(urlChangeHandler);
        
        mediaRecorder.ondataavailable = (e) => {
            console.log('[DEBUG] 收到媒体数据块:', e.data.size);
            recordedChunks.push(e.data);
        };
        
        mediaRecorder.onstart = () => {
            console.log('[DEBUG] 录制开始，状态:', mediaRecorder.state);
        };
        
        mediaRecorder.start(1000);
        console.log('[DEBUG] 录制启动命令已发送');
    };

    // 修改下载源视频函数中的文件名生成部分
    const downloadSourceVideo = async(tab, url, currentIndex) => {
        try {
            console.log("[DEBUG] 开始下载源视频");
            const [result] = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    // 精确获取视频源
                    const video = document.evaluate(
                        '//xg-video-container/video/source[contains(@src, "douyin.com/aweme")]', // 通过src特征过滤
                        document,
                        null,
                        XPathResult.FIRST_ORDERED_NODE_TYPE,
                        null
                    ).singleNodeValue;
                    
                    if (!video?.src) {
                        console.error('未找到有效的视频源');
                        return null;
                    }
                    return video.src;
                }
            });
            
    
            if (result?.result) {
                const videoUrl = result.result;
                console.log("[DEBUG] 源视频地址:", videoUrl);
                
                // 添加跨域处理
                const response = await fetch(videoUrl, { mode: 'cors' });
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                
                // 使用Blob处理下载
                const blob = await response.blob();
                const objectURL = URL.createObjectURL(blob);
                
                const fileName = generateFileName(url, 'source', 'mp4', currentIndex);
                const a = document.createElement('a');
                a.href = objectURL;
                a.download = fileName;
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                
                // 添加资源清理
                setTimeout(() => {
                    URL.revokeObjectURL(objectURL);
                    a.remove();
                }, 2000);
                
                console.log("[DEBUG] 下载已触发:", fileName);
            }
        } catch (error) {
            console.error('下载源视频失败:', videoUrl, error);
        }
    }

    const sourceUrlsText = async(tab, url, currentIndex) => {
        try {
            console.log("[DEBUG] 开始获取视频源地址");
            const [result] = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    // 获取所有匹配的source节点
                    const snapshot = document.evaluate(
                        '//xg-video-container/video/source',
                        document,
                        null,
                        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
                        null
                    );
                    
                    const urls = [];
                    for (let i = 0; i < snapshot.snapshotLength; i++) {
                        const node = snapshot.snapshotItem(i);
                        if (node?.src) {
                            urls.push(node.src);
                        }
                    }
                    return urls;
                }
            });
    
            if (result?.result?.length > 0) {
                // 生成带时间戳的文件名
                const fileName = generateFileName(url, 'source_urls', 'txt', currentIndex);
                
                // 创建文本文件并下载
                const blob = new Blob([result.result.join('\n\n')], { type: 'text/plain' });
                const file_url = URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                a.href = file_url;
                a.download = fileName;
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                
                // 清理资源
                setTimeout(() => {
                    URL.revokeObjectURL(url);
                    a.remove();
                }, 2000);
            } else {
                console.warn('未找到有效的视频源地址');
            }
        } catch (error) {
            console.error('保存源地址失败:', error);
        }
    }

    const createScreenshot = async(tab, url, currentIndex) => {
        console.log("[DEBUG] 开始截图", tab.id, url, currentIndex);
        try {
            // 确保标签页激活
            await chrome.tabs.update(tab.id, { active: true });
            await new Promise(resolve => setTimeout(resolve, 3000));  // 等待页面激活
            
            const screenshotDataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { 
                format: 'png',
                quality: 100  // 添加质量参数
            });
            
            // 使用Blob处理文件保存
            const blob = await fetch(screenshotDataUrl).then(r => r.blob());
            const fileName = generateFileName(url, 'screenshot', 'png', currentIndex);
            const objectURL = URL.createObjectURL(blob);
            
            // 创建隐藏的下载链接
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = objectURL;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            
            // 清理资源
            setTimeout(() => {
                URL.revokeObjectURL(objectURL);
                a.remove();
            }, 1000);
            
        } catch (error) {
            console.error('[DEBUG] 截图失败:', error);
            throw error;  // 将错误抛出给上层处理
        }
    }

    
    // 新增授权释放逻辑
    if (globalStream) {
        globalStream.getTracks().forEach(track => track.stop());
        globalStream = null;
    }
    hasPermission = false;
    console.log('[DEBUG] 所有录制完成，已释放权限');
});
