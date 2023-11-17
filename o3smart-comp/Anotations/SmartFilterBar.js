/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2022-09-19 14:59:09
 * @LastEditors: error: error: git config user.name & please set dead value or install git && error: git config user.email & please set dead value or install git & please set dead value or install git
 * @LastEditTime: 2023-07-24 10:49:42
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
    getTermData,
    parseDataByPath,
    getTextValueByData,
    isCollection
} = Other
const {
    getLableByAnnotation,
} = Common

/**
 * 根据annotation解析所需要的数据结构配置项
 */
const SmartFilterBarConfig = {
    annoSelectionFields: null,
    collectionAavigationArr: []
}

/**
 * 获取需要的默认赛选的字段
 * @param {*} currentAnnotations 
 * @returns 
 */
const _getAnnoSelectionFields = (currentAnnotations, currentEntityTypeData, entitySet,tabs) => {
    let result = [], SelectionFields = []

    const anno = getTermData(currentAnnotations, 'UI.SelectionFields')
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

    //0.删除 UI.SelectionPresentationVariant UI.SelectOptionType PropertyName 包含的内容
    if(tabs){
        for(let a of tabs){
            if(a?.Selection?.PropertyNames.length){
                const {PropertyNames}=a.Selection
                SelectionFields=SelectionFields.filter((item)=>!PropertyNames.includes(item))
            }
        }
    }

    //1.添加SelectionFields 配置的关联对象的字段
    SelectionFields.map((text) => {
        const { currentAnnotations: anno } = parseDataByPath(entitySet, text)
        const label = getLableByAnnotation(anno)
        result.push({
            show: true,
            path: text,
            key: `key-${text}`,
            label: label ? label : text
        })
    })

    //2.处理当前entityType的property
    // if (currentEntityTypeData) {
    //     const { property } = currentEntityTypeData
    //     for (let a of property) {
    //         const { name } = a
    //         //获取对应字段的label
    //         const { currentAnnotations: anno } = parseDataByPath(entitySet, name)
    //         const bool = getTextValueByData('bool', getTermData(anno, 'UI.Hidden'))
    //         const label = getLableByAnnotation(anno)

    //         if (bool !== 'true') {
    //             result.push({
    //                 show: SelectionFields.findIndex((item) => item === name) !== -1,
    //                 path: name,
    //                 key: `key-${name}`,
    //                 label: label ? label : name
    //             })
    //         }
    //     }
    // }
    //console.log({ result, SelectionFields })

    return result
}

/**
 * 获取关联对象为Collection的对象，查询时用
 * @param {*} currentEntityTypeData 
 * @returns 
 */
const _getCollectionAavigation = (currentEntityTypeData) => {
    const result = []
    if (currentEntityTypeData) {
        const { navigationProperty } = currentEntityTypeData
        if (navigationProperty) {
            for (let a of navigationProperty) {
                const { name } = a
                if (isCollection(navigationProperty, name)) {
                    result.push(name)
                }
            }
        }
    }
    return result
}

/**
 * 解析入口
 */
const getConfig = (params) => {
    const { entitySet,tabs } = params
    const { currentAnnotations, currentEntityTypeData } = parseDataByPath(entitySet)
    SmartFilterBarConfig.annoSelectionFields = _getAnnoSelectionFields(currentAnnotations, currentEntityTypeData, entitySet,tabs)
    SmartFilterBarConfig.collectionAavigationArr = _getCollectionAavigation(currentEntityTypeData)
    return SmartFilterBarConfig
}

export {
    getConfig
}