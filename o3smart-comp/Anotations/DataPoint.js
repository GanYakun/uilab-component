/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2022-09-19 14:59:09
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2022-12-12 18:50:55
 * @FilePath: /uilab-gbms/lib/o3smart-comp/Anotations/SmartTable.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {
    Common,
    Other,
    Core,
    Capabilities,
    Ui,
} from '../Process/index';
const {
    parseDataByPath } = Other
const {
    getFieldReadonlyTextAndCurrentValue
} = Ui

/**
 * 根据annotation解析所需要的数据结构配置项
 */
let DataPointConfig = {
    value: null,//返回值
    displayValue: null,//显示的值
}

/**
 * 解析入口
 */
const getConfig = (params) => {
    const { record, entitySet, path } = params
    const { currentAnnotations } = parseDataByPath(entitySet, path)
    const {
        readonlyTextValue,
        currentValue
    } = getFieldReadonlyTextAndCurrentValue(record, currentAnnotations, path)
    DataPointConfig.displayValue = readonlyTextValue
    DataPointConfig.value = currentValue
    return DataPointConfig
}

export {
    getConfig
}