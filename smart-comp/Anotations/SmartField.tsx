/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2023-11-20 15:23:53
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-11-23 17:41:30
 * @FilePath: /Uilab-Application/lib/Uilab-Comp/smart-comp/Anotations/smartTable.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import Utils from '../Process/utils'
import Odata from '../../utils/odata/odata'

/**
 * 设置当前字段的类型
 * @param {*} currentAnnotations 
 * @param {*} currentPropertyType 当前字段，例：Edm.String、Edm.Int64、Edm.DateTimeOffset、Edm.Date
 * @returns 
 */
const _setFieldValue = (currentAnnotations, currentPropertyType, isReadOnly) => {

    let result = {
        fieldType: 'Text'
    }

    //只读返回
    if (isReadOnly) {
        return {
            fieldType: 'ReadOnly'
        }
    }

    //判断是否是长文本
    if (Utils.getTermAnnotations(currentAnnotations, 'UI.MultiLineText').length > 0) {
        result.fieldType = 'TextArea';
    }

    //是否 IsImageURL 远端图片地址
    if (Utils.getTermAnnotations(currentAnnotations, 'UI.IsImageURL').length > 0) {
        result.fieldType = 'ImageURL';
    }

    //是否 IsImage 数据库存储
    if (Utils.getTermAnnotations(currentAnnotations, 'UI.IsImage').length > 0) {
        console.log({ a: Utils.getTermAnnotations(currentAnnotations, 'UI.IsImage') })
        result.fieldType = 'IsImage';
    }

    //下拉选择 通过annotation 设置对应的查询对象、显示字段信息
    // if (Utils.getTermAnnotations(currentAnnotations, 'Common.ValueList') || Utils.getTermAnnotations(currentAnnotations, 'Common.ValueListMapping')) {
    //     let {
    //         isFixedValues,
    //         collectionPath,
    //         columns,
    //         lookUpTitle,
    //         currentExpand,
    //         currentSelect,
    //         outObject,
    //         Parameters,
    //         action,
    //         namespace,
    //         getValueListPropertyDisplay
    //     } = getValueListProperty(
    //         currentAnnotations,
    //     );
    //     result = {
    //         fieldType: isFixedValues ? 'Select' : 'LookUp',
    //         valueList: {
    //             getValueListPropertyDisplay,
    //             action,
    //             namespace,
    //             isFixedValues,
    //             collectionPath,
    //             columns,
    //             lookUpTitle,
    //             currentExpand,
    //             currentSelect,
    //             outObject,
    //             Parameters,
    //             request: _setRequest(collectionPath, currentExpand, currentSelect)
    //         }
    //     }
    // }

    //处理数据结构中的字段类型，优先级最高 
    switch (currentPropertyType) {
        case 'Edm.DateTimeOffset':
            result.fieldType = 'DateTime'
            break;
        case 'Edm.Date':
            result.fieldType = 'Date'
            break;
        case 'Edm.Boolean':
            result.fieldType = 'IsBoolean'
            break;
        case 'Edm.Decimal':
            result.fieldType = 'Number'
            break;
        case 'Edm.Int64':
            result.fieldType = 'Number'
            break;
        case 'Edm.Double':
            result.fieldType = 'Number'
            break;
        default:
            break;
    }

    return result
}

const getConfig = async (params) => {
    const { record, entitySet, path, isReadOnly } = params
    const { currentAnnotations, currentEntityTypeData, currentPropertyType } = await Utils.getEntitySetConfig(entitySet, path)
    const { fieldType } = _setFieldValue(currentAnnotations, currentPropertyType, isReadOnly)
    const { displayValue, currentValue } = Utils.getFieldReadonlyTextAndCurrentValue(record, path, currentAnnotations)
    //console.log({ record, entitySet, path, isReadOnly, SmartFieldConfig, currentAnnotations, currentEntityTypeData, currentPropertyType })

    return {
        fieldType,
        displayValue,
        currentValue
    }
}

export {
    getConfig
}