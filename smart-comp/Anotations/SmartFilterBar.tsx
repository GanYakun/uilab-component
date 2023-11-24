/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2022-09-19 14:59:09
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-11-24 19:09:16
 * @FilePath: /uilab-gbms/lib/o3smart-comp/Anotations/SmartTable.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import Utils from '../Process/utils'
import Odata from '../../utils/odata/odata'


/**
 * @description: 解析UI.SelectionFields 字段
 * @param {*} currentAnnotations
 * @param {*} entitySet
 * @param {*} tabs
 * @return {*}
 */
const _getAnnoSelectionFields = async (entitySet, currentAnnotations) => {
    let result: any[] = [], SelectionFields: any[] = []

    const anno = Utils.getTermAnnotations(currentAnnotations, 'UI.SelectionFields')
    if (anno && anno.length > 0) {
        const { collection } = anno[0]
        for (let a of collection) {
            const { propertyPath } = a
            for (let b of propertyPath) {
                const { text } = b
                SelectionFields.push(text)
            }
        }
    }

    //添加SelectionFields 配置的关联对象的字段
    await Promise.all(
        SelectionFields.map(async (text) => {
            const { currentAnnotations: anno } = await Utils.getEntitySetConfig(entitySet, text)
            const label = Utils.getLableByAnnotation(anno)
            result.push({
                show: true,
                path: text,
                label: label
            })
        })
    )
    
    return result
}
const getConfig = async (params) => {
    const { entitySet } = params
    const { currentAnnotations } = await Utils.getEntitySetConfig(entitySet)
    const annoSelectionFields = await _getAnnoSelectionFields(entitySet, currentAnnotations)
    return {
        annoSelectionFields
    }
}

export {
    getConfig
}