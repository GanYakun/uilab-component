/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2022-09-19 14:59:09
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-12-22 13:56:19
 * @FilePath: /uilab-gbms/lib/o3smart-comp/Anotations/SmartTable.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import Utils from '../Process/utils'

/**
 * @description: 解析UI.SelectionFields 字段
 * @param {*} currentAnnotations
 * @param {*} entitySet
 * @param {*} tabs
 * @return {*}
 */
const _getAnnoSelectionFields = (entitySet: any, currentAnnotations: any[]) => {
    let result: any[] = [], SelectionFields: any[] = []
    const anno = Utils.getTermAnnotations(currentAnnotations, 'UI.SelectionFields')
    if (anno) {
        const { collection } = anno
        for (let a of collection) {
            const { propertyPath } = a
            for (let b of propertyPath) {
                const { text } = b
                SelectionFields.push(text)
            }
        }
    }

    //添加SelectionFields 配置的关联对象的字段
    SelectionFields.map((text) => {
        const { currentAnnotations: anno } = Utils.getEntitySetConfig(entitySet, text)
        const label = Utils.getLabelByAnnotation(anno)
        result.push({
            show: true,
            path: text,
            label: label ? label : text
        })
    })

    return result
}

export const getConfig = async (params: { entitySet: string }) => {
    const { entitySet } = params
    const { currentAnnotations } = Utils.getEntitySetConfig(entitySet)
    const annoSelectionFields = _getAnnoSelectionFields(entitySet, currentAnnotations)
    console.log('SmartFiterBar-log',{
        annoSelectionFields
    })

    return {
        annoSelectionFields
    }
}
