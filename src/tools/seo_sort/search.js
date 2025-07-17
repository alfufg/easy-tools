const getBaiduSort = async (keyword, url) => {
    const searchUrl = `https://www.baidu.com/s?wd=${encodeURIComponent(keyword)}`;
    
    // 添加return并改为await语法
    try {
        const response = await fetch(searchUrl);
        if (!response.ok) {
            throw new Error('网络响应失败');
        }
        const html = await response.text();
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const contentLeft = doc.getElementById('content_left');
        if (contentLeft) {
            const targetElements = Array.from(contentLeft.getElementsByClassName('c-container'))
                .filter(element => {
                    const muValue = element.getAttribute('mu');
                    return muValue && muValue.includes(url);
                });
            
            return targetElements.length > 0 ? targetElements[0].id : 0;
        }
        return 0;
    } catch (error) {
        console.error('请求发生错误:', error);
        return -1; // 错误时返回-1
    }
};

const getSogouSort = async (keyword, url) => {
    const searchUrl = `https://www.sogou.com/tx?query=${encodeURIComponent(keyword)}`;
    
    // 添加return并改为await语法
    try {
        const response = await fetch(searchUrl);
        if (!response.ok) {
            throw new Error('网络响应失败');
        }
        const html = await response.text();
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const contentLeft = doc.getElementById('main');
        if (contentLeft) {
            const targetElements = Array.from(contentLeft.getElementsByClassName('r-sech ext_query r-sech-test_02 result_list click-better-sugg'))
                .filter(element => {
                    const muValue = element.getAttribute('data-url');
                    return muValue && muValue.includes(url);
                });
            
            return targetElements.length > 0 ? parseInt(targetElements[0].getAttribute("data-rank")) + 1 : 0;
        }
        return 0;
    } catch (error) {
        console.error('请求发生错误:', error);
        return -1; // 错误时返回-1
    }
};

const getBingSort = async (keyword, url) => {
    const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(keyword)}`;
    
    // 添加return并改为await语法
    try {
        const response = await fetch(searchUrl);
        if (!response.ok) {
            throw new Error('网络响应失败');
        }
        const html = await response.text();
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const contentLeft = doc.getElementById('b_results');
        if (contentLeft) {
            const targetElements = Array.from(contentLeft.getElementsByClassName('b_algo'))
                .map((element, index) => {
                    const linkElement = element.querySelector('.b_tpcn')?.querySelector('.b_attribution');
                    const hrefValue = linkElement?.textContent;
                    return {
                        element,
                        position: index + 1, // 排位从1开始
                        matches: hrefValue && hrefValue.includes(url)
                    };
                })
                .filter(item => item.matches);
    
            // 获取第一个匹配结果的排位
            const firstMatchPosition = targetElements[0]?.position || 0;
            // console.log('bing搜索结果排位:', firstMatchPosition);
            
    
            // 或者获取所有匹配结果的排位数组
            // const allPositions = targetElements.map(item => item.position);
            // console.log('bing所有匹配排位:', allPositions);

            return firstMatchPosition;
        }
        return 0;
    } catch (error) {
        console.error('请求发生错误:', error);
        return -1; // 错误时返回-1
    }
};

const get360Sort = async (keyword, url) => {
    const searchUrl = `https://www.so.com/s?q=${encodeURIComponent(keyword)}`;
    
    // 添加return并改为await语法
    try {
        const response = await fetch(searchUrl);
        if (!response.ok) {
            throw new Error('网络响应失败');
        }
        const html = await response.text();
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const contentLeft = doc.querySelector('.result');
        if (contentLeft) {
            const targetElements = Array.from(contentLeft.getElementsByClassName('.res-list'))
                .filter(element => {
                    console.log('line81: ', element)
                    const muValue = element.querySelector('.res-title')?.querySelector('a')?.getAttribute('data-mdurl') || '';
                    console.log('360-82:', muValue)
                    return muValue && muValue.includes(url);
                });
            console.log('360-85', targetElements[0])
            // return targetElements.length > 0 ? targetElements[0].id : 0;
        }
        return 0;
    } catch (error) {
        console.error('请求发生错误:', error);
        return -1; // 错误时返回-1
    }
};

document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('#star-search').addEventListener('click', async () => {
        const keyword = document.querySelector('#seo-keyword').value;
        const url = document.querySelector('#seo-url').value;
        const selectedPlatforms = Array.from(document.querySelectorAll('input[name="platform[]"]:checked'))
            .map(checkbox => checkbox.value);
        if (!keyword || !url || !selectedPlatforms) {
            layer.alert('请输入完整的信息');
            return;
        }
        console.log(keyword, url, selectedPlatforms);
        const baidu_sort = await getBaiduSort(keyword, url);
        console.log("百度搜索排位:",baidu_sort)
        const bing_sort = await getBingSort(keyword, url);
        console.log("必应搜索排位:",bing_sort)
        const so360_sort = await get360Sort(keyword, url);
        console.log("360搜索排位:",so360_sort)
        const sogou_sort = await getSogouSort(keyword, url);
        console.log("搜狗搜索排位:",sogou_sort)



        // 将查询结果写入到sort_result
        document.querySelector('#sort_result').innerHTML = `
            百度搜索排位: ${baidu_sort}
            必应搜索排位: ${bing_sort}       
            搜狗搜索排位: ${sogou_sort}
            360搜索排位: ${so360_sort}
        `
    });
});

