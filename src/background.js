import "./tools/xhs_comment_crawler/service-worker.js"
import DBHelper from "/src/tools/demo/indexeddb/dbhelper.js"


// 初始化包含多个表的数据库
const dbHelper = new DBHelper('toolsDB', 2, [
    {
        name: 'xhs_comments',
        keyPath: 'comment_id',
        autoIncrement: true,
        indexes: [
            { name: 'comment_id', keyPath: 'comment_id', options: { unique: true } },
            { name: 'crawl_type', keyPath: 'crawl_type', options: { unique: false } },
            { name: 'note_id', keyPath: 'note_id', options: { unique: false } },
            { name: 'keyword', keyPath: 'keyword', options: { unique: false } },
        ]
    },
    {
        name: 'dy_comments',
        keyPath: 'comment_id',
        autoIncrement: false,
        indexes: [
            { name: 'comment_id', keyPath: 'comment_id', options: { unique: true } },
            { name: 'crawl_type', keyPath: 'crawl_type', options: { unique: false } },
            { name: 'video_id', keyPath: 'video_id', options: { unique: false } },
            { name: 'keyword', keyPath: 'keyword', options: { unique: false } },
        ]
    }
]);

// 使用示例
(async () => {
    try {
        const db = await dbHelper.init();
        
        // 添加数据到products表
        // await db.add('products', { 
        //     productId: 'p006',
        //     name: 'Laptop',
        //     price: 999,
        //     category: 'electronics'
        // });

        // await db.upsert('products', {
        //     productId: 'p001',
        //     name: 'Ben',
        //     price: 999999,
        //     category: 'test'
        // });
        
        // 查询products表
        // const product = await db.get('products', 'p001');
        // console.log('查询到的产品:', product);
    } catch (error) {
        console.error('操作失败:', error.message);
    }
})();





