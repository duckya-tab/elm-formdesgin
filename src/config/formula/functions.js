export default [
    {
        key: 'arithmetic',
        label: '算术函数',
        children: [
            { key: 'ADD', label: 'ADD(a, b)', template: 'ADD(${a}, ${b})', description: '求和' },
            { key: 'SUB', label: 'SUB(a, b)', template: 'SUB(${a}, ${b})', description: '求差' },
            { key: 'SUM', label: 'SUM(args...)', template: 'SUM(${a}, ${b})', description: '累计求和' },
            { key: 'ROUND', label: 'ROUND(value, digits)', template: 'ROUND(${value}, ${digits})', description: '四舍五入' },
        ],
    },
    {
        key: 'logical',
        label: '逻辑函数',
        children: [
            { key: 'IF', label: 'IF(cond, a, b)', template: 'IF(${cond}, ${a}, ${b})', description: '条件判断' },
        ],
    },
    {
        key: 'text',
        label: '文本函数',
        children: [
            { key: 'CONCAT', label: 'CONCAT(args...)', template: 'CONCAT(${a}, ${b})', description: '文本拼接' },
        ],
    },
    {
        key: 'date',
        label: '时间函数',
        children: [
            { key: 'NOW', label: 'NOW()', template: 'NOW()', description: '当前时间' },
        ],
    },
];
