/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2023-12-02 17:10:42
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-12-04 16:06:34
 * @FilePath: /Uilab-Application/lib/Uilab-Comp/smart-comp/Process/config.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
const Criticality = {
    '-1': 'dark-red',
    '0': 'grey',
    '1': 'red',
    '2': '＃FFA500',
    '3': 'rgb(16, 126, 62)',
    '4': '#0854a0',
}

const dataPointCriticality = {
    '1': 'red',
    '2': '#FFD700',
    '3': '#107e3e',
    '4': '#A0D911',
    '5': '#0854a0',
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