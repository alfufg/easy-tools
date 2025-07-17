document.addEventListener('DOMContentLoaded', () => {

    const XHS_NOTE_CRAWL_CNT = 20; // 小红书爬取的笔记数量
    const XHS_COMMENT_CRAWL_TOTAL_CNT = 500; // 小红书每次爬取的评论数量
    const XHS_NOTE_COMMENT_CRAWL_CNT = 100; // 小红书单笔记爬取评论数量
    const SCROLL_CNT = 999; // 滚动次数


    // 打开小红书主页
    document.querySelector('#open-xhs-home').addEventListener('click', () => {
        chrome.tabs.create({ url: 'https://www.xiaohongshu.com' });
    });

    // 小红书关键词搜索
    document.querySelector('#xhs-keyword-search').addEventListener('click', () => {       
        if (!layui.form.validate('#search-input')) {
            layer.alert('请输入关键词');
            return;
        }
        const keyword = document.querySelector('#search-input').value;
        chrome.tabs.create({ url: 'https://www.xiaohongshu.com/search_result?keyword='+keyword+'&source=web_explore_feed' });
    });

    // 小红书更改笔记排序方式
    document.querySelector('#xhs_edit_sort').addEventListener('click', async() => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const Selected = document.querySelector('select[name="xhs-note-sort"]').value;
        console.log('更改排序规则：', Selected)
        try {
            // 先注入脚本文件
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['src/tools/xhs_comment_crawler/demo.js']
            });
            
            // 再执行目标函数
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                args: [Selected],
                function: (Selected) => {
                    try {
                        console.log('执行更改排序：', Selected)
                        return filter_note_event('sort', Selected);
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

    // 小红书更改笔记类型
    document.querySelector('#xhs_edit_type').addEventListener('click', async() => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const Selected = document.querySelector('select[name="xhs-note-type"]').value;
        console.log('更改类型：', Selected)
        try {
            // 先注入脚本文件
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['src/tools/xhs_comment_crawler/demo.js']
            });
            
            // 再执行目标函数
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                args: [Selected],
                function: (Selected) => {
                    try {
                        console.log('执行更改类型：', Selected)
                        return filter_note_event('type', Selected);
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

    // 小红书爬取笔记
    document.querySelector('#xhs_note_crawler').addEventListener('click', async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true }); 
        const note_cnt = document.querySelector('input[name="note_cnt"]').value || XHS_NOTE_CRAWL_CNT;    // 爬取的笔记数量
        // const comment_cnt = document.querySelector('input[name="comment_cnt"]').value || XHS_COMMENT_CRAWL_TOTAL_CNT;    // 爬取的评论数量
        // const note_comment_cnt = document.querySelector('input[name="note_comment_cnt"]').value || XHS_NOTE_COMMENT_CRAWL_CNT;    // 单笔记爬取的评论数量
        console.log('点击爬取帖子按钮', SCROLL_CNT, note_cnt, tab.id);
        try {
            // 先注入脚本文件
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['src/tools/xhs_comment_crawler/demo.js']
            });
            
            // 再执行目标函数
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                args: [SCROLL_CNT, note_cnt],
                function: (scroll_cnt, note_cnt) => {
                    try {
                        return crawler_notes(scroll_cnt, note_cnt);
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

    // 小红书爬取评论
    document.querySelector('#xhs_comment_crawler').addEventListener('click', async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        // const note_cnt = document.querySelector('input[name="note_cnt"]').value || XHS_NOTE_CRAWL_CNT;    // 爬取的笔记数量
        const comment_cnt = document.querySelector('input[name="comment_cnt"]').value || XHS_COMMENT_CRAWL_TOTAL_CNT;    // 爬取的评论数量
        const note_comment_cnt = document.querySelector('input[name="note_comment_cnt"]').value || XHS_NOTE_COMMENT_CRAWL_CNT;    // 单笔记爬取的评论数量
     
        console.log('点击爬取评论按钮', tab.id, comment_cnt, note_comment_cnt);
        try {
            // 先注入脚本文件
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['src/tools/xhs_comment_crawler/demo.js']
            });
            
            // 再执行目标函数
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                args: [SCROLL_CNT, note_comment_cnt],
                function: (scroll_cnt, note_comment_cnt) => {
                    try {
                        data = crawler_comments(scroll_cnt, note_comment_cnt);
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



    
    /**
     * 监听小红书评论接口
     * comment/page?note_id
     */
    document.querySelector('#xhs_comment_listener').addEventListener('click', async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        console.log('点击监听评论按钮', tab.id);
    })

    /** 
     * 监听关键词搜索
     * 
     */

    document.querySelector('#xhs-keyword-start-crawler').addEventListener('click', async () => {    
        try {
            // 获取表单参数
            const keyword = document.querySelector('#search-input').value;
            const sortType = document.querySelector('select[name="xhs-note-sort"]').value;
            const noteType = document.querySelector('select[name="xhs-note-type"]').value;
            const showMore = document.querySelector('input[name="show-more"]').checked;
            const noteCnt = document.querySelector('input[name="note_cnt"]').value || XHS_NOTE_CRAWL_CNT;
            const noteCommentCnt = document.querySelector('input[name="note_comment_cnt"]').value || XHS_NOTE_COMMENT_CRAWL_CNT;
            const commentCnt = document.querySelector('input[name="comment_cnt"]').value || XHS_COMMENT_CRAWL_TOTAL_CNT;
            const retryCnt = 3; // 重试次数
            const info = {
                keyword: keyword,
                sortType: sortType,
                noteType: noteType,
                showMore: showMore,
                noteCnt: noteCnt,
                noteCommentCnt: noteCommentCnt,
                commentCnt: commentCnt,
                retryCnt: retryCnt,
            };
            console.log('[流程跟踪] 相关参数信息:', info);


            if (!keyword) {
                layer.msg('请输入关键词', { icon: 2 });
                return;
            }

            // 1. 创建并等待新标签页
            console.log('[流程跟踪] 创建新标签页');
            const newTab = await new Promise((resolve) => {
                chrome.tabs.create({ 
                    url: `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(keyword)}&source=web_explore_feed`
                }, (tab) => {
                    chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
                        if (tabId === tab.id && changeInfo.status === 'complete') {
                            chrome.tabs.onUpdated.removeListener(listener);
                            resolve(tab);
                        }
                    });
                });
            });

            // 2. 注入基础脚本
            console.log('[流程跟踪] 注入基础脚本');
            await chrome.scripting.executeScript({
                target: { tabId: newTab.id },
                files: ['src/tools/xhs_comment_crawler/demo.js']
            });

            console.log('[流程跟踪] 等待3秒...');
            await new Promise(resolve => setTimeout(resolve, 3000));

            // 3. 排序和类型过滤（新增执行队列）
            const executeQueue = [
                {
                    action: 'sort',
                    value: sortType,
                    func: (val) => filter_note_event('sort', val)
                },
                {
                    action: 'type', 
                    value: noteType,
                    func: (val) => filter_note_event('type', val)
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
                await new Promise(resolve => setTimeout(resolve, 1000)); // 增加操作间隔
            }

            console.log('[流程跟踪] 等待2秒...');
            await new Promise(resolve => setTimeout(resolve, 2000));



            // 4. 开始爬取（使用新标签页ID）
            const noteResults = await chrome.scripting.executeScript({
                target: { tabId: newTab.id },
                args: [SCROLL_CNT, noteCnt],
                func: (scroll, cnt) => crawler_notes(scroll, cnt)
            });           
            console.log('[流程跟踪] 爬取笔记执行结果:', noteResults[0].result);

            console.log('[流程跟踪] 等待3秒...');
            await new Promise(resolve => setTimeout(resolve, 3000));

            // 5. 严格顺序执行评论爬取
            console.log('[流程控制] 开始顺序执行评论爬取');
            const allComments = await (async () => {
                const comments = [];
                const noteLinks = noteResults[0].result.data.map(link => `https://www.xiaohongshu.com${link}`);
                
                for (const [index, link] of noteLinks.slice(0, noteCnt).entries()) {
                    if (comments.length >= commentCnt) {
                        console.log('[流程控制] 达到评论数量上限，终止爬取');
                        break;
                    }

                    const tab = newTab; // 使用新标签页ID
                    
                    await new Promise(resolve => {
                        chrome.tabs.update(tab.id, {url: link}, async (updatedTab) => {
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
                        files: ['src/tools/xhs_comment_crawler/demo.js']
                    });
                    
                    const commentResults = await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        args: [SCROLL_CNT, noteCommentCnt, showMore, retryCnt],
                        func: (scroll, cnt, showMore, retryCnt) => crawler_comments(scroll, cnt, showMore, retryCnt)
                    });
                    
                    if (commentResults[0]?.result?.data?.length > 0) {
                        // comments.push(...commentResults[0].result.data.slice(1));
                        comments.push(...commentResults[0].result.data);
                    }
                    
                    console.log(`[流程跟踪] 第${index + 1}/${noteLinks.length}条笔记处理完成, 共爬取${(commentResults[0]?.result?.data?.slice(1) || []).length}条评论, 进度：${comments.length}/${commentCnt}`);
                }
                return comments.slice(0, commentCnt);
            })();

            const result = {
                code: 0,
                message: '爬取完成',
                data: allComments.slice(0, commentCnt), // 返回前 commentCnt 条评论
                count: Math.min(allComments.length, commentCnt) // 返回实际爬取的评论数量
            };
            console.log('[流程跟踪] 爬取结果:', result);

            // 6. 确保最终保存操作
            await new Promise(resolve => {
                // saveContentToFile(
                //     allComments.slice(0, commentCnt).join('\n'),
                //     `xhs_keywords_comments_${keyword}`
                // );
                saveContentToExcel(allComments, `小红书评论数据_${keyword}`);
                setTimeout(resolve, 1000); // 确保异步保存完成
                console.log('[流程跟踪] 保存文件完成');
            });
            console.log('[流程完成] 所有操作已顺序执行完毕');
    
        } catch (error) {
            console.error('全流程失败:', error);
            layer.msg(`执行失败: ${error.message}`, { icon: 2 });
        }
    });

    // 小红书爬取指定链接评论
    document.querySelector('#xhs-links-start-crawler').addEventListener('click', async () => {    
        try {
            // 获取表单参数
            const noteCommentCnt = document.querySelector('#note-links-note-comment-cnt').value || XHS_NOTE_COMMENT_CRAWL_CNT;
            const commentCnt = document.querySelector('#note-links-comment-cnt').value || XHS_COMMENT_CRAWL_TOTAL_CNT;
            const noteLinks = document.querySelector('#note-links').value.split('\n').map(link => link.trim())
            .filter(link => link) // 过滤空行
            .filter(link => link.startsWith('https://www.xiaohongshu.com/') || link.startsWith('http://xhslink.com/'));
            const showMore = document.querySelector('#note-links-show-more').checked;
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const retryCnt = 3; // 重试次数

            const info = {
                noteLinks: noteLinks,
                noteCommentCnt: noteCommentCnt,
                commentCnt: commentCnt,
                retryCnt: retryCnt,
                showMore: showMore,
            };
            console.log('[流程跟踪] 相关参数信息:', info);


            // 1. 爬取评论（使用新标签页ID）
            console.log('[流程跟踪] 开始爬取评论...')
            const allComments = []; // 存储所有评论

            for (const [index, link] of noteLinks.entries()) {

                if (allComments.length >= commentCnt) {
                    console.log('[流程跟踪] 已达到评论需求数量，停止爬取。');
                    break; 
                }

                // 打开新标签页并等待加载完成
                await new Promise((resolve) => {
                    chrome.tabs.update(tab.id, {url: link}, (tab) => {
                            chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
                                if (tabId === tab.id && changeInfo.status === 'complete') {
                                    chrome.tabs.onUpdated.removeListener(listener);
                                    resolve(tab);
                                }
                            });
                        });
                });

                // 注入脚本
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['src/tools/xhs_comment_crawler/demo.js']    
                })

                // 爬取评论
                const commentResults = await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    args: [SCROLL_CNT, noteCommentCnt, showMore, retryCnt],
                    func: (scroll, cnt, showMore, retryCnt) => crawler_comments(scroll, cnt, showMore, retryCnt)
                });

                // if (commentResults[0].result && commentResults[0].result.data.length > 0) {
                //     allComments.push(...commentResults[0].result.data.slice(1)); // 收集除第一条外的所有评论
                // }
                // commentResults[0]?.result?.data?.length > 0 && allComments.push(...commentResults[0].result.data.slice(1))
                commentResults[0]?.result?.data?.length > 0 && allComments.push(...commentResults[0].result.data)
                console.log(`[流程跟踪] 第 ${index + 1} 条笔记的评论爬取完成: ${commentResults[0].result.count} 条，`, '进度：', allComments.length, '/', commentCnt);
            }

            const result = {
                code: 0,
                message: '爬取完成',
                data: allComments.slice(0, commentCnt), // 返回前 commentCnt 条评论
                count: Math.min(allComments.length, commentCnt) // 返回实际爬取的评论数量
            };
            console.log('[流程跟踪] 爬取结果:', result);

            // 保存到本地文件
            // 保存评论数据到文件
            // saveContentToFile(
            //     allComments.slice(0, commentCnt).join('\n'),
            //     'xhs_links_comments'
            // );
            saveContentToExcel(allComments, `小红书评论数据`);
 
    
        } catch (error) {
            console.error('[流程跟踪] 全流程失败:', error);
            layer.msg(`[流程跟踪] 执行失败: ${error.message}`, { icon: 2 });
        }
    });

    // JSON 转 Excel
    function saveContentToExcel(objData, filename) {
        // 原始 JSON 数据
        const rawJson = objData.map((item, index) => {
            item.id = index + 1;
            return item;
        });

        // 1. 处理数据：筛选字段 + 自定义表头
        const header = ["ID", "用户昵称", "用户头像", "评论内容", "点赞数", "城市", "评论级别", "回复数量", "评论时间"]; // 自定义表头
        const data = rawJson.map(item => [
            item.id,       // 对应 "ID"
            item.nickname, // 对应 "用户昵称"
            item.avatar, // 对应 "用户头像"
            item.comment, // 对应 "评论内容"
            item.like_count, // 对应 "点赞数"
            item.city, // 对应 "城市"
            item.comment_level, // 对应 "评论级别"
            item.sub_comment_count, // 对应 "回复数量"
            item.date // 对应 "评论时间"
        ]);
        // 合并表头和数据（形成二维数组）
        const formattedData = [header, ...data];

        // 2. 转换为工作表
        const worksheet = XLSX.utils.aoa_to_sheet(formattedData);

        // 3. 导出
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "小红书评论数据");
        // XLSX.writeFile(workbook, `${filename}_${moment().format('YYYYMMDDHHmmss')}.xlsx`);

        // 生成二进制文件内容
        const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        // 创建 Blob 并触发下载
        saveAs(
            new Blob([wbout], { type: 'application/octet-stream' }),
            `${filename}_${moment().format('YYYYMMDDHHmmss')}.xlsx`
        );
    }

    // 新增文件保存函数TXT
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


