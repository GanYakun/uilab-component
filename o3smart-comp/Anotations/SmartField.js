/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2022-09-19 14:59:09
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-08-31 12:02:07
 * @FilePath: /uilab-gbms/lib/o3smart-comp/Anotations/SmartTable.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { request } from '../../utils/odata/lib/odata';
import Odata from '../../utils/odata/odata';
import storage from '../../utils/storage/metadataStorage'
import {
    Common,
    Other,
    Ui,
    Core
} from '../Process/index';
const {
    getTermData,
    parseDataByPath,
    getAnnotationByTarget,
    getPrimaryKeys,
    getTextValueByData,
    getQuickViewEntitySet
} = Other
const {
    getFieldReadonlyTextAndCurrentValue,
    getObjectPageSectionsByFacets,
    getQueryContitionsByAnnotations,
    isHiddenByAnnotation
} = Ui
const {
    getLableByAnnotation,
    getValueListProperty
} = Common
const { isReadOnlyByAnnotations } = Core

/**
 * 根据annotation解析table所需要的数据结构配置项
 */
const SmartFieldConfig = {
    fieldType: null,//字段类型
    value: null,//返回值
    displayValue: null,//显示的值
    propertyType: null,//字段在数据库中的类型
    label: null,//label
    valueList: null,//valueList 配置项
    PrimaryKeys: null,//主键
    Computed: false,//是否不可编辑
    ParameterDefaultValue: null,//默认值
    nullable: false,//是否必填,
    quickViewConfigObj: {
        quickViewFields: null,
        sections: null
    },
    annoRequest: null,
    linkEntityTypes: [],
    isHidden: false
}

/**
 * 设置当前字段的类型
 * @param {*} currentAnnotations 
 * @param {*} currentPropertyType 当前字段，例：Edm.String、Edm.Int64、Edm.DateTimeOffset、Edm.Date
 * @returns 
 */
const _setFieldValue = (currentAnnotations, currentPropertyType, pathType, formRef, path) => {

    let result = {
        fieldType: 'Text'
    }

    //判断是否是长文本
    if (getTermData(currentAnnotations, 'UI.MultiLineText')) {
        result.fieldType = 'TextArea';
    }

    //是否 IsImageURL 远端图片地址
    if (getTermData(currentAnnotations, 'UI.IsImageURL')) {
        result.fieldType = 'ImageURL';
    }

    //是否 IsImage 数据库存储
    if (getTermData(currentAnnotations, 'UI.IsImage')) {
        result.fieldType = 'IsImage';
    }

    //下拉选择 通过annotation 设置对应的查询对象、显示字段信息
    if (getTermData(currentAnnotations, 'Common.ValueList') || getTermData(currentAnnotations, 'Common.ValueListMapping')) {
        let {
            isFixedValues,
            collectionPath,
            columns,
            lookUpTitle,
            currentExpand,
            currentSelect,
            outObject,
            Parameters,
            action,
            namespace,
            getValueListPropertyDisplay
        } = getValueListProperty(
            currentAnnotations,
        );
        result = {
            fieldType: isFixedValues ? 'Select' : 'LookUp',
            valueList: {
                getValueListPropertyDisplay,
                action,
                namespace,
                isFixedValues,
                collectionPath,
                columns,
                lookUpTitle,
                currentExpand,
                currentSelect,
                outObject,
                Parameters,
                request: _setRequest(collectionPath, currentExpand, currentSelect)
            }
        }
    }

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

    //处理action 参数的字段类型
    if (pathType) {
        switch (pathType) {
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
    }

    //设置隐藏
    const record = formRef?.current?.getFieldsValue()
    const { hiddenPath, isHidden } = isHiddenByAnnotation(currentAnnotations, record)
    //console.log({ formRef, record, hiddenPath, isHidden })
    //const { term, bool } = getTermData(currentAnnotations, 'UI.Hidden')
    if (isHidden) {
        result.fieldType = 'Hidden';
        const defaultValue = getParameterDefaultValue(currentAnnotations)
        const currentValue = formRef?.current?.getFieldValue(path)
        //console.log({ defaultValue, currentValue, formRef })
        //1.有默认值不清空表单数据 
        if (!defaultValue || (currentValue && defaultValue !== currentValue)) {
            formRef?.current?.setFieldValue(path, null)
        } 
    }

    return result
}

/**
 * 设置下拉框请求
 * @param {*} collectionPath //主对象
 * @param {*} currentExpand 
 * @param {*} currentSelect 
 * @returns 
 */
const _setRequest = (collectionPath, currentExpand, currentSelect) => {
    let option = {
        path: collectionPath,
        method: 'GET',
        parameters: {},
    };
    if (JSON.stringify(currentExpand) !== '{}') {
        option.parameters.$expand = currentExpand;
    }
    if (currentSelect.length) {
        option.parameters.$select = currentSelect.toString();
    }
    return async (params) => {
        if (params && params.option) {
            const { option: sendOption } = params
            const { $top, $skip, $count } = sendOption
            option.parameters = {
                ...option.parameters,
                $top,
                $skip,
                $count
            }
            if (sendOption && sendOption.$top) {
                option.parameters.$top = sendOption.$top
            } else {
                delete option.parameters.$top
            }
            if (sendOption && sendOption.$skip) {
                option.parameters.$skip = sendOption.$skip
            } else {
                delete option.parameters.$skip
            }
            if (sendOption && sendOption.$count) {
                option.parameters.$count = sendOption.$count
            } else {
                delete option.parameters.$count
            }
            if (sendOption && sendOption.$filter) {
                option.parameters.$filter = sendOption.$filter
            } else {
                delete option.parameters.$filter
            }
            if (sendOption && sendOption.$search) {
                option.parameters.$search = sendOption.$search
            } else {
                delete option.parameters.$search
            }
        }

        return await Odata.submit(option)
    };
}

/**
 * 获取字段默认值
 * @param {*} currentAnnotations 
 */
const getParameterDefaultValue = (currentAnnotations) => {
    let result
    const defaultValue = getTermData(currentAnnotations, 'UI.ParameterDefaultValue');
    if (defaultValue) {
        result = getTextValueByData(`string`, defaultValue);
        if (!result) {
            result = getTextValueByData(`bool`, defaultValue) === 'true' ? true : false;
        }
    }
    return result
}

/**
 * 判断是否必填
 * @param {*} currentAnnotations 
 */
const isNullable = (currentAnnotations, entitySet, path) => {
    let result = false

    //1.Common.FieldControlType/Mandatory
    const mandatory = getTermData(currentAnnotations, `Common.FieldControl`);
    if (mandatory && getTextValueByData(`enumMember`, mandatory) === 'Common.FieldControlType/Mandatory') {
        result = true
    }

    //2.主对象是否配置RequiredProperties
    const { currentAnnotations: entityAnnotations } = parseDataByPath(entitySet)
    for (let a of entityAnnotations) {
        const { term, record } = a
        if ((term === 'Org.OData.Capabilities.V1.InsertRestrictions' || term === 'Capabilities.InsertRestrictions') && record) {
            for (let b of record) {
                const { type, propertyValue } = b
                if ((type === 'Org.OData.Capabilities.V1.InsertRestrictionsType' || type === 'Capabilities.InsertRestrictionsType') && propertyValue) {
                    for (let c of propertyValue) {
                        const { property, collection } = c
                        if (property === 'RequiredProperties') {
                            for (let d of collection) {
                                const { propertyPath } = d
                                if (propertyPath && propertyPath.findIndex((item) => item.text === path) !== -1) {
                                    result = true
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    return result
}

const getQuickViewLinkKeys = (currentEntityTypeData) => {
    let linkKeysConfig = {
        linkKeys: [],
        linkEntityTypes: []
    }
    const { data } = storage.get(window.micrAppName)
    const { metadata } = data
    const { annotations, namespace } = metadata.dataServices.schema[0];
    if (currentEntityTypeData.navigationProperty) {
        for (let key of currentEntityTypeData.navigationProperty) {
            if (key) {
                const target = `${namespace}.${key.name}`
                const navigateAnnotation = getAnnotationByTarget(annotations, target)
                if (navigateAnnotation.length > 0 && getTermData(navigateAnnotation, "UI.QuickViewFacets")) {
                    if (key.referentialConstraint) {
                        linkKeysConfig.linkKeys.push(key.referentialConstraint[0].property)
                        linkKeysConfig.linkEntityTypes.push({ linkEntity: key.name, linkKey: key.referentialConstraint[0].property })
                    }
                }
            }
        }
    }

    return linkKeysConfig
}

const getQuickViewConfigObj = (linkEntityTypes, entitySet) => {
    let quickViewConfigObj = {
        quickViewFields: [],
        sections: []
    }

    const { data } = storage.get(window.micrAppName)
    const { metadata } = data
    const { annotations } = metadata.dataServices.schema[0];
    for (let key of linkEntityTypes) {
        const { currentEntitySetData } = parseDataByPath(entitySet)
        let currentRecord = null
        const target = 'com.dpbird.' + key.linkEntity
        const navigationAnnotation = getAnnotationByTarget(annotations, target)
        const QuickViewFacets = getTermData(navigationAnnotation, "UI.QuickViewFacets")
        const resultMap = getObjectPageSectionsByFacets(QuickViewFacets, navigationAnnotation, key.linkEntity, currentEntitySetData, currentRecord, false)
        if (resultMap) {
            quickViewConfigObj.quickViewFields.push({ fields: resultMap.fields, linkKey: key.linkKey })
            quickViewConfigObj.sections.push({ section: resultMap.sections, linkKey: key.linkKey })
        }
    }

    return quickViewConfigObj
}

const _setQuickViewRequest = (queryEntity, navigationPath, entitySet) => {
    return async (params) => {
        const { linkKey, linkEntity } = params

        //添加要查询的字段
        const fieldArr = []
        for (let key of SmartFieldConfig.quickViewConfigObj.quickViewFields) {
            if (key.linkKey == linkKey) {
                for (let key2 of key.fields) {
                    if (key2 !== null && !fieldArr.includes(key2)) {
                        fieldArr.push(key2)
                    }
                }
            }
        }

        const linkEntitySet = getQuickViewEntitySet(linkEntity, entitySet)
        const { currentSelect, currentExpand } = getQueryContitionsByAnnotations(
            fieldArr,
            linkEntitySet
        );

        //请求参数准备
        let option = {
            path: queryEntity ? `${queryEntity}/${navigationPath}/${linkEntity}` : `${navigationPath}/${linkEntity}`,
            method: 'GET',
            parameters: {
            },
        };

        if (currentSelect && currentSelect.length > 0) {
            option.parameters.$select = currentSelect.toString();
        }
        if (JSON.stringify(currentExpand) !== '{}') {
            option.parameters.$expand = currentExpand;
        }
        if (window['SAP-ContextId']) {
            option.headers = {
                'SAP-ContextId': window['SAP-ContextId'],
            }
        }

        option.parameters = { ...option.parameters }
        return await Odata.submit(option);
    }
}

const setNavigateQuertEntity = (record, primaryKeys, currentEntityTypeData, entitySet, queryEntity) => {

    let queryCondition = []
    let navigateQuertEntity = ''
    let queryConditionString = ''
    for (let key of primaryKeys) {
        queryCondition.push({ key: key, value: record[key] })
    }
    for (let key of queryCondition) {
        if (queryConditionString !== '') {
            queryConditionString = `${queryConditionString},`
        }
        queryConditionString = queryEntity ? `${queryConditionString}${key.key}='${key.value}'` : `${queryConditionString}${key.key}='${key.value}'`
    }
    navigateQuertEntity = queryEntity ? `${currentEntityTypeData.name}(${queryConditionString})` : `${entitySet}(${queryConditionString})`
    return navigateQuertEntity
}

const _setHidden = (fieldannotation, formRef) => {
    const record = formRef?.current?.getFieldsValue()
    const { hiddenPath, isHidden } = isHiddenByAnnotation(fieldannotation, record)
    console.log({ formRef, record, hiddenPath, isHidden })
    return isHidden
}

/**
 * 解析入口
 * @param {object} record //值对象
 * @param {string} entitySet //主对象
 * @param {string} path 
 */
const getConfig = (params) => {
    const { record, entitySet, path, pathType, actionName, nullable, queryEntity, isReadOnly, inCell, formRef } = params
    const { currentAnnotations, currentPropertyType, currentEntityTypeData, currentEntitySetName } = parseDataByPath(entitySet, path, actionName)
    SmartFieldConfig.currentEntityTypeData = currentEntityTypeData
    SmartFieldConfig.currentEntitySetName = currentEntitySetName
    const { fieldType, valueList } = _setFieldValue(currentAnnotations, currentPropertyType, pathType, formRef, path)
    const { linkKeys, linkEntityTypes } = getQuickViewLinkKeys(currentEntityTypeData)
    const { readonlyTextValue, readonlyFieldName, currentValue } = getFieldReadonlyTextAndCurrentValue(record, currentAnnotations, path, fieldType)
    SmartFieldConfig.fieldType = linkKeys.includes(path) && isReadOnly && inCell ? 'QuickViewString' : fieldType

    if (SmartFieldConfig.fieldType === 'QuickViewString') {
        const { quickViewFields, sections } = getQuickViewConfigObj(linkEntityTypes, entitySet)

        const quickViewConfigObj = { quickViewFields, sections }
        SmartFieldConfig.quickViewConfigObj = quickViewConfigObj
        let primaryKeys = getPrimaryKeys(currentEntityTypeData)
        let navigateQuertEntity = setNavigateQuertEntity(record, primaryKeys, currentEntityTypeData, entitySet, queryEntity)
        SmartFieldConfig.annoRequest = _setQuickViewRequest(queryEntity, navigateQuertEntity, entitySet)
        SmartFieldConfig.linkEntityTypes = linkEntityTypes
    }

    SmartFieldConfig.valueList = valueList
    SmartFieldConfig.label = getLableByAnnotation(currentAnnotations)
    SmartFieldConfig.displayValue = readonlyTextValue
    SmartFieldConfig.displayFieldName = readonlyFieldName
    SmartFieldConfig.value = currentValue
    SmartFieldConfig.PrimaryKeys = getPrimaryKeys(currentEntityTypeData)

    //当前字段是否不可编辑 1:配置了UI.Computed 2.对象主键 3.不是action的参数(record && SmartFieldConfig.PrimaryKeys.findIndex((keyItem) => path.search(keyItem) !== -1) !== -1) ||
    SmartFieldConfig.Computed = isReadOnlyByAnnotations(path, currentAnnotations, currentEntityTypeData, actionName, entitySet !== currentEntitySetName)

    //默认参数
    const ParameterDefaultValue = getParameterDefaultValue(currentAnnotations)
    if (ParameterDefaultValue) {
        SmartFieldConfig.value = ParameterDefaultValue
    }
    //是否必填
    SmartFieldConfig.nullable = nullable === 'true' || isNullable(currentAnnotations, entitySet, path)

    //调试用
    // if (path === 'IsLinkage') {
    //     console.log({
    //         path,
    //         entitySet,
    //         SmartFieldConfig,
    //         fieldType,
    //         currentAnnotations,
    //         currentPropertyType,
    //         currentEntitySetName,
    //         PrimaryKeys: SmartFieldConfig.PrimaryKeys,
    //         actionName,
    //         Computed: SmartFieldConfig.Computed
    //     })
    // }

    return SmartFieldConfig
}

export {
    getConfig
}