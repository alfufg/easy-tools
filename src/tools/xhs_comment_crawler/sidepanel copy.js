document.addEventListener('DOMContentLoaded', () => {

    const XHS_NOTE_CRAWL_CNT = 30; // 小红书爬取的笔记数量
    const XHS_COMMENT_CRAWL_TATOL_CNT = 500; // 小红书每次爬取的评论数量
    const XHS_NOTE_COMMENT_CRAWL_CNT = 60; // 小红书单笔记爬取评论数量
    const SCROLL_CNT = 100; // 滚动次数


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
        // const comment_cnt = document.querySelector('input[name="comment_cnt"]').value || XHS_COMMENT_CRAWL_TATOL_CNT;    // 爬取的评论数量
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
        const comment_cnt = document.querySelector('input[name="comment_cnt"]').value || XHS_COMMENT_CRAWL_TATOL_CNT;    // 爬取的评论数量
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

    

});

