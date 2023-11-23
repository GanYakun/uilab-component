/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2023-11-20 15:23:53
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-11-23 11:11:26
 * @FilePath: /Uilab-Application/lib/Uilab-Comp/smart-comp/Anotations/smartTable.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import Utils from '../Process/utils'
import Odata from '../../utils/odata/odata'

interface SmartFieldConfigType {
    fieldType: string
}

let SmartFieldConfig: SmartFieldConfigType = {
    fieldType: '',//字段类型
}


const getConfig = async (params) => {
    const { entitySet } = params
    return SmartFieldConfig
}

export {
    getConfig
}