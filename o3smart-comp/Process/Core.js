/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2022-08-30 10:50:57
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-04-10 13:39:05
 * @FilePath: /uilab-gbms/lib/o3smart-comp/Process/Common.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import Other from './Other'
const { getTextValueByData, getTermData } = Other

/**
 * 获取所有Immutable属性 注意：需要过滤掉主对象的primaryKey 
 * Core.Immutable
 * @param {*} currentEntityTypeData 
 * @param {*} currentEntityTypeName 
 * @param {*} annotations 
 * @param {*} mainObjectPrimaryKeys 主对象的主键数据
 * @returns 
 */
const getAllImmutableProperties = (
    currentEntityTypeData,
    currentEntityTypeName,
    annotations,
    mainObjectPrimaryKeys = [],
) => {
    let keys = [];
    currentEntityTypeData.property.some((property) => {
        annotations.some((annotation) => {
            if (currentEntityTypeName + '/' + property.name == annotation.target) {
                annotation.annotation.some((annotationItem) => {
                    if (annotationItem.term == 'Core.Immutable') {
                        keys.push(property);
                        return false;
                    }
                });
            }
        });
    });

    //过滤掉主对象的主键
    if (mainObjectPrimaryKeys) {
        keys = keys.filter((item) => {
            const { name } = item;
            return mainObjectPrimaryKeys.findIndex((d) => d === name) === -1;
        });
    }

    return keys;
};

/**
 * 判断字段是否是只读字段
 * Core.Computed Core.Immutable
 * @param {*} fieldValue 
 * @param {*} currentAnnotations 
 * @param {*} currentEntityTypeData 
 * @returns 
 */
const isReadOnlyByAnnotations = (fieldValue, currentAnnotations, currentEntityTypeData, actionName, isNavigation) => {

    let result = false, Immutable, isComputed;



    //1.term 是否包含：Core.Computed，Core.Immutable (Immutable在提交表单中时不能为只读的)
    isComputed = getTextValueByData('bool', getTermData(currentAnnotations, 'Core.Computed'));
    let ImmutableValue = getTermData(currentAnnotations, 'Core.Immutable')
    if (ImmutableValue) {
        const { bool } = ImmutableValue
        if (!bool || getTextValueByData('bool', ImmutableValue)) {
            Immutable = true
        }
    }
    //let Immutable = getTermData(currentAnnotations, 'Core.Immutable') || getTextValueByData('bool', getTermData(currentAnnotations, 'Core.Immutable'));
    if (isComputed || (Immutable && !actionName)) {
        result = true;
    }

    //2.是否是对象primaryKey,且非action的params isNavigation是否为关联对象
    if (!result && !actionName && currentEntityTypeData) {
        const { key: keyArr } = currentEntityTypeData;
        if (keyArr) {
            for (let a of keyArr) {
                const { propertyRef } = a;
                for (let b of propertyRef) {
                    const { name } = b
                    if (fieldValue.search(name) !== -1) {
                        result = true;
                    }
                }
            }
        }
    }

    //3.当前字段的entitySet 是否支持更新 Capabilities.UpdateRestrictions
    const UpdateRestrictions = getTermData(currentAnnotations, 'Capabilities.UpdateRestrictions')
    if (UpdateRestrictions) {
        const { record } = UpdateRestrictions
        for (let a of record) {
            const { type, propertyValue } = a
            for (let a of record) {
                const { type, propertyValue } = a
                if (type === "Capabilities.UpdateRestrictionsType") {
                    for (let b of propertyValue) {
                        const { property } = b
                        if (property === 'Updatable') {
                            const bool = getTextValueByData('bool', b)
                            if (bool === 'false') {
                                result = true;
                            }
                        }
                    }
                }
            }
        }
    }
    // if (fieldValue === 'priority') {
    //     console.log({
    //         fieldValue, currentAnnotations, currentEntityTypeData, actionName, isNavigation, result, ImmutableValue
    //     })
    // }
    return result
};

export default {
    getAllImmutableProperties,
    isReadOnlyByAnnotations
}