/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2022-08-30 10:50:57
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-09-26 13:13:40
 * @FilePath: /uilab-gbms/lib/o3smart-comp/Process/Common.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import Other from './Other'
import Ui from './Ui'
import storage from '../../utils/storage/metadataStorage'
const {
    getTextValueByData,
    getEntitySetData,
    getAnnotationByTarget,
    parseDataByPath,
    getTermData
} = Other

/**
 * 通过annotation获取字段的显示label 
 * Common.Label
 * @param {*} annotations 当前对象的所有annotations
 * @returns 
 */
const getLableByAnnotation = (annotations) => {
    let result;
    annotations && annotations.map((item) => {
        if (item.term === 'Common.Label') {
            result = getTextValueByData('string', item);
        }
    });
    return result;
};

/**
 * 获取当前字段对应的展示字段信息 
 * Common.Text
 * @param {*} annotations 当前对象的annotations
 * @returns 
 */
const getDisplayTextByAnnotation = (annotations) => {
    let result;
    annotations && annotations.map((item) => {
        if (!result && item.term === 'Common.Text') {
            result = getTextValueByData('path', item);
        }
    });
    return result;
};

/**
 * 获取当前对象的默认排序 
 * Common.SortOrder
 * @param {array} annotations 当前对象的annotations
 * @returns 
 */
const getEntitySetDefaultOrderBy = (annotations) => {
    let result;
    for (let a of annotations) {
        const { term, record } = a;
        if (term === 'Common.SortOrder') {
            for (let b of record) {
                const { propertyValue } = b;
                for (let c of propertyValue) {
                    const { property } = c;
                    if (getTextValueByData('bool', c) === 'true') {
                        if (property.search('-') !== -1) {
                            if (!result) {
                                property = property.replace('-', '');
                                result = `${property} desc`;
                            } else {
                                result = `${property} asc`;
                            }
                        }
                    }
                }
            }
        }
    }
    return result;
};

/**
 * 解析valueList,获取解析后的结果
 * 支持：ValueListParameterIn、ValueListParameterInOut、ValueListParameterOut、ValueListParameterDisplayOnly
 * 不支持：两个out字段
 * Common.ValueList 
 * @param {array} currentAnnotations
 * @param {object} entityContainer
 * @param {string} namespace
 * @param {array} entityType
 * @param {array} annotations
 * @param {string} fieldType
 * @returns
 */
const getValueListProperty = (
    currentAnnotations,
) => {
    const { data } = storage.get(window.micrAppName)
    const { metadata } = data
    const { entityContainer, annotations, action, namespace } = metadata.dataServices.schema[0];
    let result = {
        collectionPath: null,
        isFixedValues: false,
        columns: [],
        lookUpTitle: null,
        Parameters: [],
        action,
        namespace
    };

    //解析返回  LocalDataProperty、ValueListProperty
    const _getProperty = (propertyValue) => {
        let LocalDataProperty, ValueListProperty;
        for (let a of propertyValue) {
            const { property } = a;
            if (property === 'ValueListProperty') {
                ValueListProperty = getTextValueByData('string', a);
            }
            if (property === 'LocalDataProperty') {
                LocalDataProperty = getTextValueByData('propertyPath', a);
            }
        }
        return {
            LocalDataProperty,
            ValueListProperty,
        };
    };

    //设置返回outObject
    const _setParameters = (type, LocalDataProperty, ValueListProperty) => {
        if (result.Parameters) {
            switch (type) {
                case `Common.ValueListParameterInOut`:
                    result.Parameters.push({
                        type: 'ValueListParameterInOut',
                        LocalDataProperty,
                        ValueListProperty
                    })
                    break;
                case `Common.ValueListParameterOut`:
                    result.Parameters.push({
                        type: 'ValueListParameterOut',
                        LocalDataProperty,
                        ValueListProperty
                    })
                    break;
                case `Common.ValueListParameterIn`:
                    result.Parameters.push({
                        type: 'ValueListParameterIn',
                        LocalDataProperty,
                        ValueListProperty
                    })
                    break;
                case `Common.ValueListParameterDisplayOnly`:
                    result.Parameters.push({
                        type: 'ValueListParameterDisplayOnly',
                        ValueListProperty
                    })
                    break;
                default:
                    break;
            }
        }
    };

    //判断是否是下拉框类型
    const ValueListWithFixedValues = getTermData(currentAnnotations, 'Common.ValueListWithFixedValues')
    if (ValueListWithFixedValues) {
        result.isFixedValues = getTextValueByData('bool', ValueListWithFixedValues) === 'true';
    }

    //解析ValueList
    const ValueList = getTermData(currentAnnotations, 'Common.ValueList') || getTermData(currentAnnotations, 'Common.ValueListMapping')
    if (ValueList) {
        //console.log({ ValueList })
        const { record } = ValueList
        for (let a of record) {
            const { type, propertyValue } = a;
            if (type === 'Common.ValueListType' || type === 'Common.ValueListMappingType') {
                for (let b of propertyValue) {
                    const { property, collection } = b;

                    //lookup title
                    if (property === 'Label') {
                        result.lookUpTitle = getTextValueByData('string', b);
                    }

                    //查询主对象
                    if (property === 'CollectionPath') {
                        result.collectionPath = getTextValueByData('string', b);
                    }

                    //解析参数
                    if (property === 'Parameters') {
                        for (let c of collection) {
                            const { record } = c;
                            if (record) {
                                for (let d of record) {
                                    const { type, propertyValue } = d;
                                    const { LocalDataProperty, ValueListProperty } = _getProperty(propertyValue);
                                    if (ValueListProperty && type !== 'Common.ValueListParameterIn') {
                                        const { currentAnnotations } = parseDataByPath(result.collectionPath, ValueListProperty)
                                        const label = getLableByAnnotation(currentAnnotations)
                                        if (result.columns.findIndex((columnItem) => columnItem.path === ValueListProperty) === -1) {
                                            result.columns.push({ path: ValueListProperty, label, type: 'UI.DataField' });
                                        }
                                    }
                                    _setParameters(type, LocalDataProperty, ValueListProperty);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    //设置显示字段
    result.getValueListPropertyDisplay = (ValueListProperty, collectionPath) => {
        let result
        const { entityContainer } = metadata.dataServices.schema[0];
        const { entitySetData: currentEntitySetData } = getEntitySetData(entityContainer, collectionPath)
        if (currentEntitySetData) {
            const { entityType: currentEntityTypeName } = currentEntitySetData
            if (ValueListProperty) {
                const anno = getAnnotationByTarget(
                    annotations,
                    `${currentEntityTypeName}/${ValueListProperty}`,
                );
                const displayText = getDisplayTextByAnnotation(anno);
                if (displayText) {
                    result = displayText
                }
            }
        }
        //console.log({ result })
        return result
    }

    //获取查询条件
    const { getQueryContitionsByAnnotations } = Ui
    const arr = []
    result.columns.map((item) => arr.push(item.path))
    const { currentExpand, currentSelect } = getQueryContitionsByAnnotations(
        arr,
        result.collectionPath
    );
    result.currentExpand = currentExpand;
    result.currentSelect = currentSelect;
    //console.log({ arr, currentExpand, currentSelect, result })

    return result;
};

/**
 * 解析SemanticObject SemanticObjectMapping
 * Common.SemanticObject
 * @param {*} currentAnnotations 
 * @param {*} currentRecord 
 * @returns 
 */
const getSemanticObjectData = (currentAnnotations, currentRecord) => {

    const result = {}

    //解析SemanticObjectMappingType，并设置返回值
    const _getSemanticObjectProperty = (annotation) => {
        const { collection } = annotation
        let _result = {}
        for (let a of collection) {
            const { record } = a
            for (let b of record) {
                const { type, propertyValue } = b
                if (type === 'Common.SemanticObjectMappingType') {
                    let LocalPropertyValue, SemanticObjectPropertyValue
                    for (let c of propertyValue) {
                        const { property } = c
                        switch (property) {
                            case "LocalProperty":
                                LocalPropertyValue = getTextValueByData('propertyPath', c)
                                break;
                            case "SemanticObjectProperty":
                                SemanticObjectPropertyValue = getTextValueByData('string', c)
                                break;
                            default:
                                break;
                        }
                    }
                    if (currentRecord && currentRecord[LocalPropertyValue]) {
                        _result[SemanticObjectPropertyValue] = currentRecord[LocalPropertyValue]
                    }
                }
            }
        }
        return _result
    }

    for (let a of currentAnnotations) {
        const { term } = a
        switch (term) {
            case "Common.SemanticObject":
                result.SemanticObject = getTextValueByData('string', a)
                break;
            case "Common.SemanticObjectMapping":
                result.SemanticObjectProperty = _getSemanticObjectProperty(a)
                break;
            default:
                break;
        }
    }
    return result
}

/**
 * Common.MediaUploadLink
 * @param {*} annotations 
 * @returns 
 */
const getMediaUploadLink = (annotations) => {
    let result
    if (annotations) {
        for (let a of annotations) {
            const { term, string } = a
            if (term === 'Common.MediaUploadLink' || term === 'Common.mediaUploadLink') {
                result = string
            }
        }
    }
    return result
}

/**
 * Common.FilterDefaultValue
 */
const getFilterDefaultValue = (obj) => {
    let result
    if (obj) {
        const { target, annotation } = obj
        if (annotation && annotation instanceof Array) {
            for (let a of annotation) {
                const { term, bool } = a
                if (term === 'Common.FilterDefaultValue' && target) {
                    const arr = target.split('/')
                    result = `${arr[1]} eq ${bool === 'true'}`
                }
            }
        }
    }
    return result
}

export default {
    getLableByAnnotation,
    getDisplayTextByAnnotation,
    getEntitySetDefaultOrderBy,
    getValueListProperty,
    getSemanticObjectData,
    getMediaUploadLink,
    getFilterDefaultValue
}