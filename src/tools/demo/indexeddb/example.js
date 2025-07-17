import DBHelper from 'dbhelper.js';
// 由于没有具体错误信息，假设路径和导入没问题，原样保留

// 示例用法
const dbHelper = await new DBHelper('demo', 1, 'user').init();

// 添加用户
// 添加用户
dbHelper.add({ name: '张三', email: 'zhangsan@example.com' });
dbHelper.add({ name: '李四', email: 'zhangsan@example.com' });
dbHelper.add({ name: '王五', email: 'zhangsan@example.com' });
dbHelper.add({ name: '赵六', email: 'zhangsan@example.com' });







