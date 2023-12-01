const Criticality = {
    '-1': 'dark-red',
    '0': 'grey',
    '1': 'red',
    '2': 'orange',
    '3': 'green',
    '4': 'blue',
}

const dataPointCriticality = {
    '1': 'red',
    '2': 'yellow',
    '3': '#107e3e',
    '4': '#A0D911',
    '5': 'blue',
}


// 项目中使用到的关键字
const typeList = {
    "UIPages.ObjectPage": [
        "UI.DataField",   // 
        "UI.FieldGroup",  // 以group数据展示
        "UI.DataPoint",   // 
        "UI.LineItem",    // 以表格的形式展示
    ]
}
export {
    Criticality,
    dataPointCriticality
}