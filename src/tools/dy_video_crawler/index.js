layui.use(function(){
    var $ = layui.$;
    var layer = layui.layer;
    var form = layui.form;
    // JSON 转 Excel
    function saveContentToExcel(objData, filename) {
        // 原始 JSON 数据
        const rawJson = objData.map((item, index) => {
            item.id = index + 1;
            return item;
        });

        // 1. 处理数据：筛选字段 + 自定义表头
        const header = [
            "星图ID",
            "视频ID",
            // "video_id",
            "视频名称",
            // "视频封面",
            "视频链接",
            "播放量",
            "点赞量",
            "评论量",
            "完播率",
            "互动率",
            "视频时长",
            "发布时间"
        ]; // 自定义表头
        const data = rawJson.map(item => [
            `"${item.author_xt_id}"`,       // 对应 "星图ID"
            `"${item.item_id}"`,       // 对应 "视频ID"
            // item.video_id,       // 对应 "video_id"
            item.title,    // 对应 "视频名称"
            // item.cover_uri,    // 对应 "视频封面"
            item.url,    // 对应 "视频链接"
            item.watch_cnt,    // 对应 "播放量"
            item.like_cnt,    // 对应 "点赞量"
            item.comment_cnt,   // 对应 "评论量"
            `${item.finish_rate * 100}%`, // 对应 "完播率"
            `${item.interact_rate * 100}%`, // 对应 "互动率"
            `${item.duration}s`,   // 对应 "视频时长"
            moment(item.create_time * 1000).format('YYYY/MM/DD HH:mm:ss')   // 对应 "发布日期"
        ]);
        // 合并表头和数据（形成二维数组）
        const formattedData = [header, ...data];

        // 2. 转换为工作表
        const worksheet = XLSX.utils.aoa_to_sheet(formattedData);

        // 3. 导出
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "星图视频数据");
        // XLSX.writeFile(workbook, `${filename}_${moment().format('YYYYMMDDHHmmss')}.xlsx`);

        // 生成二进制文件内容
        const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        // 创建 Blob 并触发下载
        saveAs(
            new Blob([wbout], { type: 'application/octet-stream' }),
            `${filename}_${moment().format('YYYYMMDDHHmmss')}.xlsx`
        );
    }
    // 获取指定域名的cookie函数
    function getCookiesFromDomain(domain) {
        // 使用chrome.cookies API获取指定域名的所有cookie
        chrome.cookies.getAll({domain: domain.replace(/^https?:\/\//, '')}, function(cookies) {
            if (cookies && cookies.length > 0) {
                // 将cookie数组转换为字符串格式
                var cookieString = cookies.map(function(cookie) {
                    return cookie.name + '=' + cookie.value;
                }).join('; ');

                // 将获取到的cookie填入textarea
                document.querySelector('textarea[name="current_account"]').value = cookieString;

                // 显示成功消息
                layer.msg('成功获取Cookie: ' + cookies.length + ' 个', {icon: 1});
                console.log('获取到的Cookie:', cookieString);
            } else {
                // 如果没有找到cookie，显示提示信息
                layer.msg('未找到该域名的Cookie，请确保已经登录星图平台', {icon: 2});
                console.log('未找到该域名的Cookie');
            }
        });
    }
    getCookiesFromDomain('.xingtu.cn');
    $('#btn-back').on('click', function(){
        window.history.back();
    })
    $('#getCookie').on('click', function(){
        getCookiesFromDomain('.xingtu.cn');
    })
    form.on('submit(formSubmit)', function(data){
        console.log(data)
        var field = data.field;
        // 1. 按换行符分割（兼容所有系统）
        const lines = field.daren_link.split(/\r?\n/)
        // 2. 过滤空行和纯空格行
        const validData = lines.filter((line) => {
          const trimmed = line.trim()
          return trimmed !== '' // 只保留非空内容
        })
        // 显示 loading
        var loadIndex = layer.load(1, {
            shade: [0.1, '#fff'] // 0.1 表示透明度，'#fff' 表示遮罩颜色
        });
        $.ajax({
            url: 'https://ds.toutiaoeasy.cn/xt/get_user_homepage_videos_batch',
            type: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            data: JSON.stringify({
                cookies: field.current_account,
                author_list: validData,
                page: 1,
                page_size: 10
            }),
            success: function(res) {
                console.log('请求成功:', res);
                // 关闭 loading
                layer.close(loadIndex);
                const oData = res.data
                layer.msg(`提交成功，获取到${res.total}条视频数据`, {icon: 1});
                saveContentToExcel(oData, '星图视频数据')
                form.val('form1', {
                    'daren_link': ''
                });
            },
            error: function(xhr, status, error) {
                console.log('请求失败:', error);
                // 关闭 loading
                layer.close(loadIndex);
                layer.msg('请求失败', {icon: 2});
            }
        })
        return false;
    });
});