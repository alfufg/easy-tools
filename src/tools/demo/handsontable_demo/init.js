let hot; // 将hot声明提升到全局作用域

document.addEventListener('DOMContentLoaded', function() {
    const container = document.getElementById('hot-container');
    hot = new Handsontable(container, {
        data: [
            ['', 'A1', 'B1', 'C1', 100, '2023-01-01'],  // 新增空值作为序号占位
            ['', 'A2', 'B2', 'C2', 200, '2023-02-15']
        ],
        colHeaders: ['序号', '姓名', '城市', '部门', '销售额', '日期'],  // 更新列标题
        columns: [
            { 
                type: 'numeric',
                title: '序号',
                readOnly: true,
                allowInvalid: false,
                invalidCellClassName: 'htInvalid',
                filter: false,  // 禁用筛选
                renderer: function(instance, td, row, col, prop, value) {
                    td.style.textAlign = 'center';
                    td.style.fontWeight = '500';
                    Handsontable.dom.empty(td);
                    td.innerText = row + 1;
                    return td;
                }
            },
            { type: 'text' },     // 原第一列数据
            { type: 'text' },     // 原第二列数据
            { type: 'dropdown', source: ['市场部', '技术部', '财务部'] },
            { type: 'numeric', numericFormat: { pattern: '$0,0.00' }},
            { type: 'date', dateFormat: 'YYYY-MM-DD' }
        ],
        filters: true,    // 启用筛选
        dropdownMenu: true, // 显示筛选菜单
        contextMenu: true, // 右键菜单
        height: 800,  // 修改为固定像素值
        width: '100%',
        licenseKey: 'non-commercial-and-evaluation' // 免费授权
    });
});

// 导出功能需要添加hot存在性检查
function exportCSV() {
    if (!hot) {
        console.error('表格未初始化');
        return;
    }
    const exportPlugin = hot.getPlugin('exportFile');
    exportPlugin.downloadFile('csv', {
        filename: 'data-export',
        columnHeaders: true
    });
}

function exportExcel() {
    const exportPlugin = hot.getPlugin('exportFile');
    exportPlugin.downloadFile('xlsx', {
        filename: 'data-export',
        columnHeaders: true
    });
}