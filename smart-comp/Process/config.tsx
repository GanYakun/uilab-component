/*
* @Author: lx.jin 308561217@qq.com
* @Date: 2023-12-02 17:10:42
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-12-22 14:29:46
* @FilePath: /Uilab-Application/lib/Uilab-Comp/smart-comp/Process/config.tsx
* @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
*/

import { CloseCircleOutlined, WarningOutlined, CheckCircleOutlined, InfoCircleOutlined } from "@ant-design/icons"
import defaultImage from '../../../../public/defaultImage.png'
import defaultAvator from '../../../../public/defaultAvator.png'

const Criticality = {
    '-1': {
        color: 'dark-red',
        icon: <CloseCircleOutlined />
    },
    '0': {
        color: 'grey',
    },
    '1': {
        color: '#b00',
        icon: <CloseCircleOutlined />
    },//红色
    '2': {
        color: '#FFA500',
        icon: <WarningOutlined />
    },
    '3': {
        color: 'rgb(16, 126, 62)',
        icon: <CheckCircleOutlined />
    },
    '4': {
        color: '#0a6ed1',
        icon: <InfoCircleOutlined />
    },//蓝色
}

const dataPointCriticality = {
    '1': '#b00',//红色
    '2': '#FFD700',//黄色
    '3': '#107e3e',
    '4': '#107e3e',//绿色
    '5': '#0a6ed1',//蓝色
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

//default image
const defaultImageUrl = "https://gw.alipayobjects.com/zos/antfincdn/K%24NnlsB%26hz/pageHeader.svg"
const imageFallback = defaultImage

export {
    Criticality,
    dataPointCriticality,
    defaultImageUrl,
    imageFallback,
    defaultAvator
}