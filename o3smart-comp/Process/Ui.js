/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2022-08-30 10:50:44
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-10-07 12:23:30
 * @FilePath: /uilab-gbms/lib/o3smart-comp/Process/UI.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import storage from '../../utils/storage/metadataStorage'
import moment from 'moment'
import Other from './Other'
import Common from './Common'
import { ConsoleSqlOutlined } from '@ant-design/icons'
import lodash from 'lodash'

const {
    getTextValueByData,
    getTermData,
    getAnnotationByTarget,
    getEntitySetByCurrentEntitySetNavigationPropertyBinding,
    parseDataByPath,
    getPrimaryKeys,
    getAnnotationByAnnotationPath,
    generateKey,
    isCollection
} = Other

const {
    getLableByAnnotation,
    getDisplayTextByAnnotation,
    getMediaUploadLink
} = Common

/**
 * 判断按钮是否显示
 * 通过：UI.Hidden、UI.UpdateHidden、UI.DeleteHidden
 * @param {*} annotation 当前对象的annotations
 * @param {*} action 按钮的类型 枚举了对应使用的term
 * @param {*} record 
 * @returns 
 */
const isBtnHidden = (annotation, action, record) => {
    let result = true,
        option = {
            hidden: {
                currentTerm: 'UI.Hidden',
            },
            update: {
                currentTerm: 'UI.UpdateHidden',
            },
        };

    if (annotation && action && option[action] && record) {
        const { currentTerm } = option[action];
        for (let a of annotation) {
            const { term } = a;
            if (term === currentTerm && a.if) {
                for (let b of a.if) {
                    const { eq } = b;
                    for (let c of eq) {
                        const path = getTextValueByData('path', c);
                        const string = getTextValueByData('string', c);
                        if (record[path] !== string) {
                            result = false;
                        }
                    }
                }
            }
        }
    }

    return result;
};

/**
 * 解析Identification
 * UI.Identification
 * @param {object} currentAnnotations
 * @returns
 */
const getIdentificationByAnnotations = (currentAnnotations, currentRecord) => {
    const result = []
    const annotation = getTermData(currentAnnotations, 'UI.Identification');
    if (annotation) {
        const { collection } = annotation
        for (let a of collection) {
            const { record } = a
            for (let b of record) {
                const obj = getDataFieldByRecord(b)
                const { annotation: fieldannotation } = b
                if (fieldannotation) {
                    //是否隐藏
                    const { hiddenPath, isHidden } = isHiddenByAnnotation(fieldannotation, currentRecord)
                    //console.log({ hiddenPath, isHidden, currentRecord, fieldannotation })
                    obj.hiddenPath = hiddenPath
                    obj.isHidden = isHidden
                    for (let c of fieldannotation) {
                        const { term, path, string } = c
                        if (term === 'Common.MediaUploadLink' && string) {
                            obj.MediaUploadLink = string
                        }
                    }
                }
                result.push(obj)
            }
        }
    }
    return result
}

/**
 * 解析DataField
 * UI.DataFieldForIntentBasedNavigation、UI.DataFieldForAction
 * @param {object} record
 * @returns
 */
const getDataFieldByRecord = (record) => {
    const { type, propertyValue, annotation } = record
    let result = { annotation }

    const _getProperty = (propertyValue) => {
        let _result = {}
        for (let a of propertyValue) {
            const { property } = a
            switch (property) {
                case 'Label':
                    _result.Label = getTextValueByData('string', a)
                    break;
                case 'SemanticObject':
                    _result.SemanticObject = getTextValueByData('string', a)
                    break;
                case 'Action':
                    _result.Action = getTextValueByData('string', a)
                    break;
                default:
                    break;
            }
        }
        return _result
    }

    switch (type) {
        case 'UI.DataFieldForIntentBasedNavigation':
            result = {
                ..._getProperty(propertyValue),
                DataFieldType: 'DataFieldForIntentBasedNavigation'
            }
            break;
        case 'UI.DataFieldForAction':
            result = {
                ..._getProperty(propertyValue),
                DataFieldType: 'DataFieldForAction'
            }
            break;
        default:
            break;
    }
    return result
}

/**
 * 获取显示字段
 * Common.Text UI.TextArrangement
 * @param {array} currentAnnotations
 * @returns {object}
 */
const getCommonTextByAnnotatons = (currentAnnotations) => {
    const result = {
        pathText: null,
        enumMemberText: null,
    };

    if (currentAnnotations) {
        //解析当前字段的类型，通过term=Common.Text，判断最终显示的方式。未设定使用TextOnly
        for (let a of currentAnnotations) {
            const { term, annotation } = a;
            if (term === 'Common.Text') {
                result.pathText = getTextValueByData('path', a);
                if (annotation) {
                    for (let b of annotation) {
                        const { term } = b;
                        if (term === 'UI.TextArrangement') {
                            result.enumMemberText = getTextValueByData('enumMember', b);
                        }
                    }
                }
            }
        }
    }

    return result;
};

/**
 * 获取只读状态显示的内容
 * UI.TextArrangementType/TextFirst UI.TextArrangementType/TextLast UI.TextArrangementType/TextOnly
 * @param {object} record
 * @param {array} currentAnnotations
 * @param {string} fieldValue
 * @param {array} annotations
 * @param {string} namespace
 * @param {string} fieldType
 * @param {string} displayProperty 兼容lookup
 * @returns {object}readonlyTextValue:只读显示的文本
 */
const getFieldReadonlyTextAndCurrentValue = (
    record,
    currentAnnotations,
    fieldValue,
    fieldType,
    displayProperty
) => {
    let readonlyTextValue, readonlyFieldName, currentValue;

    //是否配置Common.Text
    let { pathText, enumMemberText } = getCommonTextByAnnotatons(currentAnnotations);

    //获取readonlyText
    const _getReadonlyText = (value1, value2) => {
        if (!value1) return value2;
        switch (enumMemberText) {
            case 'UI.TextArrangementType/TextFirst':
                return `${value1} ( ${value2} )`;
            case 'UI.TextArrangementType/TextLast':
                return `${value2} ( ${value1} )`;
            case 'UI.TextArrangementType/TextOnly':
                return `${value1}`;
        }
        return value1;
    };

    //获取对应字段在record中的值 通过目标数组
    const _getRecordDataByTargetArr = (record, targetArr) => {
        let data = record
        for (let i of targetArr) {
            if (data) {
                if (data instanceof Array) {
                    const arr = []
                    for (let item of data) {
                        item[i] && arr.push(item[i])
                    }
                    data = arr
                } else {
                    data = data[i]
                }
            } else {
                data = null
            }
        }
        return data
    }

    //lookup类型返回
    if (displayProperty) {
        const value1 = record[displayProperty];
        const value2 = record[fieldValue];
        readonlyTextValue = _getReadonlyText(value1, value2);
        currentValue = value2;
        return { readonlyTextValue, currentValue };
    }

    //判断是否为object,普通字符串直接返回
    if (record instanceof Object && fieldValue) {
        if (fieldValue.search('/') === -1) {
            if (pathText) {
                if (pathText.search('/') === -1) {
                    readonlyFieldName = pathText
                    const value1 = record[pathText];
                    const value2 = record[fieldValue];
                    const unitValue = UnitData && record[UnitData.path]
                    readonlyTextValue = _getReadonlyText(value1, value2, unitValue);
                    currentValue = value2;
                } else {
                    const arr = pathText.split('/');
                    const value1 = _getRecordDataByTargetArr(record, arr)
                    readonlyFieldName = value1
                    const value2 = record[fieldValue];

                    const unitValue = UnitData && record[arr[0]] && record[arr[0]][UnitData.path]
                    readonlyTextValue = _getReadonlyText(value1, value2, unitValue);
                    currentValue = value2;
                }
            } else {
                readonlyFieldName = fieldValue
                readonlyTextValue = record[fieldValue];
                currentValue = record[fieldValue];
            }
        } else {
            let arr = fieldValue.split('/');
            let arr1 = fieldValue.split('/')
            if (pathText) {
                arr = lodash.dropRight(arr, 1).concat(pathText.split('/'))
            }
            const value1 = _getRecordDataByTargetArr(record, arr)
            const value2 = _getRecordDataByTargetArr(record, arr1)
            //处理字段是列表
            if (value1 instanceof Array) {
                const arr = []
                value1.map((item, index) => {
                    arr.push(_getReadonlyText(item, value2[index]))
                })
                readonlyTextValue = arr
            } else {
                readonlyTextValue = _getReadonlyText(value1, value2);
            }

            currentValue = value2;
        }
    } else {
        readonlyFieldName = record
        readonlyTextValue = record;
        currentValue = record;
    }

    //是否配置单位Org.OData.Measures.V1.Unit
    const UnitData = getTermData(currentAnnotations, 'Org.OData.Measures.V1.Unit') || getTermData(currentAnnotations, 'Measures.Unit');
    if (UnitData) {
        const { path } = UnitData
        if (fieldValue.search('/') === -1) {
            if (path.search('/') === -1) {
                readonlyTextValue = `${readonlyTextValue ? readonlyTextValue : '-'} ${record[path] ? record[path] : '-'}`
            } else {
                const pathArr = path.split('/')
                let floatObj = record
                const find = (index) => {
                    if (index === pathArr.length - 1) {
                        return floatObj && floatObj[pathArr[index]]
                    }
                    floatObj = floatObj && floatObj[pathArr[index]]
                    return find(index + 1)
                }
                let unitValue = find(0)
                if (unitValue) {
                    readonlyTextValue = `${readonlyTextValue ? readonlyTextValue : '-'} ${unitValue ? unitValue : '-'}`
                }
            }
        } else {
            const arr = fieldValue.split('/')
            let floatObj = record
            const find = (index) => {
                if (index === arr.length - 1) {
                    return floatObj && floatObj[path]
                }
                floatObj = floatObj[arr[index]]
                return find(index + 1)
            }
            let unitValue = find(0)
            if (unitValue) {
                readonlyTextValue = `${readonlyTextValue ? readonlyTextValue : '-'} ${unitValue ? unitValue : '-'}`
            }
        }
    }


    //日期类型需要格式化
    if (currentValue) {
        if (fieldType === 'DateTime') {
            currentValue = moment(currentValue, 'YYYY-MM-DD HH:mm:ss').utcOffset(-480 + 1440);
            readonlyTextValue = moment(currentValue).format('YYYY-MM-DD HH:mm:ss')
        } else if (fieldType === 'Date') {
            currentValue = moment(currentValue, 'YYYY-MM-DD').utcOffset(-480 + 1440);
            readonlyTextValue = moment(currentValue).format('YYYY-MM-DD')
        }
    }

    //图片
    if (record && fieldType === 'IsImage') {
        currentValue = record['ImageDataResource'] && record['ImageDataResource']['@odata.id']
    }

    return { readonlyTextValue, readonlyFieldName, currentValue };
};

/**
 * 获取查看条件，1.expand条件  2.主对象的select条件
 * @param {array} fieldArr
 * @param {array} annotations
 * @param {object}  entityContainer
 * @param {string}  entitySetName
 * @returns {object} currentExpand,currentSelect
 */
const getQueryContitionsByAnnotations = (
    fieldArr,
    entitySetName
) => {
    //fieldArr=fieldArr.filter((item)=>item!=='MainProductAssoc/Good/MaterialCode/idValue')
    const { data } = storage.get(window.micrAppName)
    const { metadata } = data
    const { entityContainer, annotations, entityType, namespace } = metadata.dataServices.schema[0];

    let currentExpand = {},
        currentSelect = []//最外层需要的$select

    //添加$select
    const _setSelect = (value, unitData) => {
        if (currentSelect.findIndex((item) => item === value) === -1) {
            currentSelect.push(value)
        }
        //处理单位请求，备注是第一层的字段
        if (unitData && unitData.index === 0 && unitData.value) {
            const { path } = unitData.value
            // 是否是多段式
            if (path.search('/') === -1) {
                currentSelect.push(path)
            }
        }
    }

    //判断当前字段是否配置了Common.Text
    const _nbff = (arr, field) => {
        let parseData = [], index = 0, unitData, isImageData, selectData, primaryKey
        const find = (entitySetName, navigationPropertyName, entityTypeName) => {
            const { entitySet } = entityContainer
            entitySet.map((item) => {
                const { name, navigationPropertyBinding, entityType } = item
                if (name === entitySetName) {
                    //数组的最后一个元素为字段信息，是否配置Common.Text
                    if (index === arr.length - 1) {

                        //两种entityType 都要去找 1.字段上的 2.entitySet上的
                        let fieldAnnotations1, fieldAnnotations2, fieldAnnotations
                        fieldAnnotations1 = getAnnotationByTarget(annotations, `${entityType}/${arr[index]}`);
                        fieldAnnotations2 = getAnnotationByTarget(annotations, `${namespace}.${entityTypeName}/${arr[index]}`);
                        fieldAnnotations = fieldAnnotations1.concat(fieldAnnotations2)

                        const { pathText } = getCommonTextByAnnotatons(fieldAnnotations);
                        const { currentEntityTypeData } = parseDataByPath(name)

                        // if (field === 'ToPartyRelationship/SendParty/partyId') {
                        //     console.log({ pathText, fieldAnnotations, entityType })
                        // }

                        //是否配置Text
                        if (pathText) {
                            if (pathText.search('/') !== -1) {
                                const textArr = pathText.split('/')
                                //配置了Text 关联对象也要配置在主对象entitySet的navigationPropertyBinding
                                if (navigationPropertyBinding && navigationPropertyBinding.findIndex((item) => item.path === textArr[0]) !== -1) {
                                    parseData = parseData.concat(textArr)
                                } else {
                                    console.error(`entitySet:${entitySetName} 中 navigationPropertyBinding 没有定义===> ${textArr[0]}`)
                                }
                            } else {
                                parseData.push(pathText)
                                index === 0 && _setSelect(pathText)
                            }
                        } else {
                            parseData.push(arr[index])
                            arr.length === 1 && _setSelect(arr[index])
                            //数据主键
                            primaryKey = getPrimaryKeys(currentEntityTypeData)
                        }

                        //处理Unit
                        const unit = getTermData(fieldAnnotations, 'Org.OData.Measures.V1.Unit') || getTermData(fieldAnnotations, 'Measures.Unit')
                        if (unit && unit.path) {
                            unitData = {
                                index,
                                value: unit
                            };
                        }
                        //处理isImage
                        isImageData = {
                            index,
                            value: getTermData(fieldAnnotations, 'UI.IsImage')
                        };
                        //selectData
                        selectData = {
                            index,
                            value: arr[index]
                        }

                        return
                    }

                    //检查是否没有配置对应
                    if (index !== arr.length - 1 && !navigationPropertyBinding) {
                        console.error(`Edm entitySet 配置错误： ${navigationPropertyName} => 没有配置在主对象 ${entitySetName} 对应的navigationPropertyBinding中`)
                    }

                    //递归查找关联对象，直到最后一层
                    navigationPropertyBinding && navigationPropertyBinding.map((d) => {
                        const { path, target } = d
                        if (path === navigationPropertyName) {
                            index++
                            parseData.push(path)
                            find(target, arr[index], arr[index - 1])
                        } else {
                            //console.error(`Edm entitySet 配置错误： ${navigationPropertyName} => 没有配置在主对象 ${entitySetName} 对应的navigationPropertyBinding中  ${arr}`)
                        }
                    })
                }
            })
        }
        //查找关联对象
        find(entitySetName, arr[index], arr[index])
        return {
            parseData,
            unitData,
            isImageData,
            selectData,
            primaryKey
        }
    }

    //4.拼装expand select
    const getMultistage = (arr, unitData, isImageData, selectData, primaryKey) => {
        let floatObj = currentExpand;
        function create(index) {
            //处理单位
            if (unitData && unitData.index !== 0) {
                const { value } = unitData
                if (value && index === unitData.index) {
                    const { path } = value
                    if (path.search('/') === -1) {
                        floatObj['$select'] += `,${path}`
                    }
                }
            } else {
                //处理第一层的多段式 单位联合显示
                if (unitData && unitData.value) {
                    const { path } = unitData.value
                    if (path.search('/') !== -1) {
                        arr = path.split('/')
                    }
                }
            }

            //处理isImage
            let ignore = false
            if (isImageData) {
                const { value } = isImageData
                if (value && value.bool === 'true') {
                    ignore = true
                }
            }

            //最后一个字段返回不处理
            if (index > arr.length - 2) {
                return
            }

            if (!floatObj[arr[index]]) {
                if (index === 0) {
                    floatObj[arr[index]] = {}
                    if (arr.length === 2 && !ignore && !floatObj[arr[index]]['$select']) {
                        floatObj[arr[index]]['$select'] = arr[index + 1]
                    }
                } else {
                    if (!floatObj.$expand) {
                        floatObj.$expand = {
                            ...floatObj.$expand,
                            [arr[index]]: index === arr.length - 2 ? {
                                $select: primaryKey && index === arr.length - 2 ? primaryKey.toString() : null//设置查询带上主键，最后一个对象
                            } : {}
                        }
                    } else {
                        floatObj.$expand = {
                            ...floatObj.$expand,
                            [arr[index]]: {
                                ...floatObj.$expand[arr[index]]
                            }
                        }
                    }
                    if (index === arr.length - 2 && !ignore) {
                        if (!floatObj.$expand[arr[index]]['$select']) {
                            floatObj.$expand[arr[index]]['$select'] = arr[index + 1]
                        } else {
                            floatObj.$expand[arr[index]]['$select'] += `,${arr[index + 1]}`
                        }
                    }
                }
            } else {
                //处理$select
                if (index === 0) {
                    if (arr.length === 2 && !ignore) {
                        if (!floatObj[arr[index]]['$select']) {
                            floatObj[arr[index]]['$select'] = arr[index + 1]
                        } else {
                            floatObj[arr[index]]['$select'] += `,${arr[index + 1]}`
                        }
                    }
                } else if (index === arr.length - 2 && !ignore) {
                    if (!floatObj.$expand[arr[index]]['$select']) {
                        floatObj.$expand[arr[index]]['$select'] = arr[index + 1]
                    } else {
                        floatObj.$expand[arr[index]]['$select'] += `,${arr[index + 1]}`
                    }
                }
            }

            //selectData
            if (selectData) {
                const { value } = selectData
                if (value && index === selectData.index) {
                    if (floatObj['$select']) {
                        floatObj['$select'] += `,${value}`
                    } else {
                        floatObj['$select'] = `${value}`
                    }
                }
            }

            floatObj = index === 0 ? floatObj[arr[index]] : floatObj.$expand[[arr[index]]]
            create(index + 1)
        }
        create(0)
    }

    //判断是否是现实关联对象的字段 通过是否存在 ‘/’ 
    fieldArr.map((item) => {
        if (item) {
            if (item.search('/') !== -1) {
                let arr = item.split('/')
                const { parseData, unitData, isImageData, selectData, primaryKey } = _nbff(arr, item)
                // if (item === 'ToPartyRelationship/SendParty/partyId') {
                //     console.log({ parseData, unitData, isImageData, selectData, primaryKey, arr, fieldArr })
                // }
                if (parseData.length === 0) {
                    console.error(`annotation配置错误： ${item} => 没有配置主对象（${entitySetName}）对应的navigationPropertyBinding`)
                }
                getMultistage(parseData, unitData, isImageData, selectData, primaryKey)
            } else {
                const { parseData, unitData, isImageData } = _nbff([item], item)
                getMultistage(parseData, unitData, isImageData,)
                _setSelect(item, unitData)
            }
        }
    })
    return {
        currentExpand,
        currentSelect,
    };
};

/**
 * 解析objectPage headerInfo 注：目前只实现Title、Description
 * UI.HeaderInfo
 * @param {*} headerInfo 
 * @param {*} currentRecord 请求的数据
 * @param {*} entitySet
 * @returns 
 */
const getHeaderInfoOptions = (headerInfo, currentRecord, entitySet) => {
    let result = {
        TypeName: null,
        TypeNamePlural: null,
        ImageUrl: null,
        TypeImageUrl: null,
        Initials: null,
        Title: null,
        Description: null,
    };

    //获取对应path显示的值
    const _getPathValue = (path) => {
        const { currentAnnotations } = parseDataByPath(entitySet, path)
        const { readonlyTextValue, currentValue } = getFieldReadonlyTextAndCurrentValue(currentRecord, currentAnnotations, path)
        return readonlyTextValue ? readonlyTextValue : currentValue
    }

    //解析record
    const _getValueByRecord = (record) => {
        const result = {
            type: null,
            path: null,
            value: null,
            string: null
        };
        if (record) {
            for (let a of record) {
                const { type, propertyValue } = a;
                if (type === 'UI.DataField') {
                    result.type = 'DataField';
                }
                for (let b of propertyValue) {
                    const { property } = b;
                    if (property === 'Value') {
                        const path = getTextValueByData('path', b);
                        result.path = path
                        result.value = _getPathValue(path)
                        result.string = getTextValueByData('string', b)
                    }
                }
            }
        }

        return result;
    };

    if (headerInfo) {
        const { record } = headerInfo;
        for (let a of record) {
            const { propertyValue, type } = a;
            if (type === 'UI.HeaderInfoType') {
                for (let b of propertyValue) {
                    const { property, record } = b;
                    const path = getTextValueByData('path', b);
                    const string = getTextValueByData('string', b)
                    switch (property) {
                        case 'Title':
                            result.Title = _getValueByRecord(record);
                            break
                        case 'Description':
                            result.Description = _getValueByRecord(record);
                            break
                        case 'ImageUrl':
                            if (path) {
                                result.ImageUrl = { path, value: _getPathValue(path) }
                            } else if (string) {
                                result.ImageUrl = { string }
                            }
                            break
                    }
                }
            }
        }
    }
    return result;
};

/**
 * 得到关键级别颜色
 * @param criticalityEnum
 * @returns {string}
 */
const getColorFromCriticalityType = (criticalityEnum) => {
    var color;

    switch (criticalityEnum) {
        case 'UI.CriticalityType/Negative':
        case 'UI.CriticalityType/VeryNegative':
            color = '#dc0d0e'; //red
            break;

        case 'UI.CriticalityType/Critical':
            color = '#de890d'; //orange
            break;

        case 'UI.CriticalityType/Positive':
        case 'UI.CriticalityType/VeryPositive':
            color = '#3fa45b'; //green
            break;

        case 'UI.CriticalityType/Information':
            color = 'rgb(88, 153, 218)'; //blue
            break;

        case 'UI.CriticalityType/Neutral':
        default:
            color = '';
    }

    return color;
};

/**
 * 得到目标已整理过的annotation
 * @param annotations
 */
const getTargetAnnotationProcessed = (
    currentAnnotations,
    target,
    currentEntityTypeName,
    currentEntitySetData,
) => {

    let result, targetNavigation, targetQualifier, targetEntitySet = currentEntitySetData && currentEntitySetData.name;
    const { data } = storage.get(window.micrAppName)
    const { metadata } = data
    const { annotations, namespace } = metadata.dataServices.schema[0];

    //解析target
    if (target.search('@') !== -1) {
        const arr = target.split('@')
        targetNavigation = arr[0]
        //兼容配置了‘/’
        if (targetNavigation.search('/') !== -1) {
            targetNavigation = targetNavigation.split('/')[0]
        }
        targetEntitySet = getEntitySetByCurrentEntitySetNavigationPropertyBinding(
            currentEntitySetData,
            targetNavigation,
        );
    }
    if (target.search('#') !== -1) {
        const arr = target.split('#')
        targetQualifier = arr[arr.length - 1]
    }

    //Table类型
    if (target && target.search('UI.LineItem') !== -1) {
        result = {
            value: {
                targetEntitySet,
                targetPath: targetNavigation,
                targetQualifier
            },
            type: 'table',
        };
    }

    //Form类型
    if (target && target.search('@UI.FieldGroup') !== -1) {

        let fieldArr = [], annotationIsFieldGroup, formEntityPrimaryKeys;
        annotationIsFieldGroup = currentAnnotations.filter((item) => item.term === 'UI.FieldGroup')

        //解析fieldGroup
        const _parseFieldGroup = (fieldGroupAnnotations, navigationName) => {
            fieldGroupAnnotations.some((item) => {
                const { qualifier, record } = item;
                //是否配置targetQualifier 没有配置取没有配置qualifier的FieldGroup
                if (targetQualifier && targetQualifier === qualifier || !targetQualifier && !qualifier) {
                    let records = record[0].propertyValue[0].collection[0].record;
                    records.some((item2) => {
                        let single = {
                            type: item2.type,
                            label: '',
                            record: {},
                            hiddenPath: null
                        };

                        if (item2.type == 'UI.DataField') {
                            const { annotation } = item2
                            //设置是否隐藏
                            if (annotation && !single.hiddenPath) {
                                const { term, path } = annotation[0]
                                if (term === 'UI.Hidden') {
                                    single.hiddenPath = path
                                }
                            }

                            let path;
                            item2.propertyValue.some((item3) => {
                                if (item3.property == 'Label') {
                                    single.label = item3.string;
                                } else if (item3.property == 'Value') {
                                    item3.path = getTextValueByData('path', item3);
                                    path = item3.path;
                                    if (navigationName) item3.path = `${navigationName}/${item3.path}`
                                    single.record = item3;
                                }
                            });
                            if (path && !single.label) {
                                let anno = getAnnotationByTarget(annotations, `${currentEntityTypeName}/${path}`);
                                single.label = getLableByAnnotation(anno);
                            }
                            fieldArr.push(single);
                        } else if (item2.type == 'UI.DataFieldForAnnotation') {
                            let label = '';
                            item2.propertyValue.some((item3) => {
                                if (item3.property == 'Label') {
                                    label = item3.string;
                                } else if (item3.property == 'Target') {
                                    let subResults = getTargetAnnotationProcessed(
                                        currentAnnotations,
                                        item3.annotationPath,
                                        currentEntityTypeName,
                                    );
                                    if (subResults && subResults.length) {
                                        subResults.some((subResultItem) => {
                                            subResultItem.dataFieldForAnnotation = true;
                                            subResultItem.label = label;
                                            result.push(subResultItem);
                                        });
                                    }
                                }
                            });
                        }
                    });
                }
            });
        }

        //判断是否显示为关联对象
        if (targetNavigation) {
            const navigationEntitySet = getEntitySetByCurrentEntitySetNavigationPropertyBinding(currentEntitySetData, targetNavigation)
            let { currentAnnotations: navigationAnotations, currentEntityTypeData } = parseDataByPath(navigationEntitySet)
            formEntityPrimaryKeys = getPrimaryKeys(currentEntityTypeData)
            navigationAnotations = navigationAnotations.filter((item) => item.term === 'UI.FieldGroup')
            _parseFieldGroup(navigationAnotations, targetNavigation)
        } else {
            _parseFieldGroup(annotationIsFieldGroup)
        }

        result = {
            value: fieldArr,
            targetEntitySet,
            formEntityPrimaryKeys,
            type: 'form',
        };
    }

    //Chart 类型
    if (target && target.search('@UI.Chart') !== -1) {
        const chartAnnotation = getAnnotationByAnnotationPath(target, currentAnnotations, currentEntitySetData);

        result = {
            value: {
                isSet: targetNavigation ? true : false,//是否集合请求
                target: target,
                targetEntitySet,
                chartAnnotation: chartAnnotation.record[0],
                targetNavigation
            },
            type: 'chart',
        };
    }

    //DataPoint类型
    if (target && target.search('@UI.DataPoint') !== -1) {
        let dataPointProperty
        //获取DataPoint当前字段的类型
        const _getDataPointProperty = (currentAnnotations, currentQualifier) => {
            let result = {
                Title: null,
                Value: null,
                TargetValue: null,
                Visualization: null,
                ValueFormat: null
            }

            if (currentAnnotations) {
                for (let a of currentAnnotations) {
                    const { term, qualifier, record } = a
                    if (term === 'UI.DataPoint') {
                        if (currentQualifier && currentQualifier === qualifier) {
                            for (let b of record) {
                                const { type, propertyValue } = b
                                if (type === 'UI.DataPointType') {
                                    for (let c of propertyValue) {
                                        const { property } = c
                                        switch (property) {
                                            case 'Title':
                                                result.Title = getTextValueByData('string', c)
                                                break;
                                            case 'Value':
                                                result.Value = getTextValueByData('path', c)
                                                break;
                                            case 'TargetValue':
                                                result.TargetValue = getTextValueByData('decimal', c)
                                                break;
                                            // case 'MaximuValue':
                                            //     result.TargetValue = getTextValueByData('decimal', c)
                                            //     break;
                                            case 'Visualization':
                                                result.Visualization = getTextValueByData('enumMember', c)
                                                break;
                                            case 'ValueFormat':
                                                //没实现
                                                //result.ValueFormat = getTextValueByData('string', c)
                                                break;
                                            default:
                                                break;
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

        //判断是否显示为关联对象
        if (targetNavigation) {
            const navigationEntitySet = getEntitySetByCurrentEntitySetNavigationPropertyBinding(currentEntitySetData, targetNavigation)
            let { currentAnnotations: navigationAnotations } = parseDataByPath(navigationEntitySet)
            dataPointProperty = _getDataPointProperty(navigationAnotations, targetQualifier)
        } else {
            dataPointProperty = _getDataPointProperty(currentAnnotations, targetQualifier)
        }

        result = {
            value: dataPointProperty,
            type: 'dataPoint',
        };
    }

    //@UI.PresentationVariant
    if (target && target.search('@UI.PresentationVariant') !== -1) {
        const anno = getAnnotationByTarget(annotations)
        const PresentationVariantObj = getTermData(anno, 'UI.PresentationVariant', targetQualifier)
        const PresentationVariant = getPresentationVariantByAnnotations(PresentationVariantObj);
        const chartAnnotation = getAnnotationByAnnotationPath(target, currentAnnotations, currentEntitySetData);
        const { Visualizations, orderby } = PresentationVariant

        if (Visualizations) {
            const { term, qualifier } = Visualizations
            switch (term) {
                case '@UI.Chart':
                    result = {
                        value: {
                            isSet: targetNavigation ? true : false,//是否集合请求
                            target: target,
                            targetEntitySet,
                            chartAnnotation: chartAnnotation.record[0],
                            targetNavigation,
                            targetQualifier: qualifier
                        },
                        type: 'chart',
                    };
                    break;
                case '@UI.LineItem':
                    result = {
                        value: {
                            targetEntitySet,
                            targetPath: targetNavigation,
                            targetQualifier: qualifier,
                            targetOrderby: orderby
                        },
                        type: 'table',
                    };
                    break;
                default:
                    break;
            }
        }
    }

    return result;
};

//解析objectPage=>section
const getObjectPageSectionsByFacets = (
    facets,
    currentAnnotations,
    currentEntityTypeName,
    currentEntitySetData,
    currentRecord,
    inSection
) => {
    const resultMap = {
        sections: [],
        fields: [],
        chartFields: [],
        hiddenPathArr: []
    };

    //解析ReferenceFacet
    const _getReferenceFacet = (propertyValue) => {
        let result = {};
        for (let f of propertyValue) {
            const { property } = f;
            if (property === 'ID') {
                result.id = getTextValueByData('string', f);
            } else {
                result.id = generateKey()
            }
            if (property === 'Label') {
                result.label = getTextValueByData('string', f);
            }
            if (property === 'Target') {
                result.target = getTextValueByData(`annotationPath`, f);
                const targetData = getTargetAnnotationProcessed(
                    currentAnnotations,
                    result.target,
                    currentEntityTypeName,
                    currentEntitySetData,
                );
                result.targetData = targetData;

                //返回主对象需要请求的fields
                if (targetData) {
                    switch (targetData.type) {
                        case 'form':
                            targetData.value.map((item) => {
                                const { record, hiddenPath } = item
                                record && resultMap.fields.push(item.record.path);
                                hiddenPath && resultMap.fields.push(hiddenPath);
                            })
                            break;
                        case 'dataPoint':
                            resultMap.fields.push(targetData.value.Value);
                            break;
                        case 'chart':
                            let chartValue = [];
                            chartValue.push(targetData.value)
                            for (let g of chartValue) {
                                const { chartAnnotation, target, targetEntitySet, targetNavigation } = g
                                let entitySet = targetEntitySet;
                                for (let key of chartAnnotation.propertyValue) {
                                    if (key.property === 'MeasureAttributes' && inSection == false) {
                                        let collectionArr = key.collection[0].record[0].propertyValue
                                        for (let m1 of collectionArr) {
                                            const propertyValue = m1
                                            if (propertyValue.property === 'DataPoint') {
                                                if (propertyValue.annotationPath.search('#') !== -1) {
                                                    const arr = propertyValue.annotationPath.split('#')
                                                    const { currentAnnotations } = parseDataByPath(entitySet)
                                                    const dataPointProperty = getDataPointProperty(currentAnnotations, arr[arr.length - 1])
                                                    if (dataPointProperty.TargetValue.isTargetPath) {
                                                        let chartString = {}
                                                        if (target.indexOf('/') !== -1) {
                                                            chartString = targetNavigation + '/' + dataPointProperty.TargetValue.targetValue
                                                        } else {
                                                            chartString = dataPointProperty.TargetValue.targetValue
                                                        }
                                                        if (!resultMap.chartFields.includes(chartString)) {
                                                            resultMap.chartFields.push(chartString)
                                                        }
                                                    }
                                                    if (dataPointProperty.MaximumValue.isMaximumPath) {
                                                        let chartString = {}
                                                        if (target.indexOf('/') !== -1) {
                                                            chartString = targetNavigation + '/' + dataPointProperty.MaximumValue.maximumValue
                                                        } else {
                                                            chartString = dataPointProperty.MaximumValue.maximumValue
                                                        }
                                                        if (!resultMap.chartFields.includes(chartString)) {
                                                            resultMap.chartFields.push(chartString)
                                                        }
                                                    }
                                                    if (dataPointProperty.Criticality) {
                                                        let chartString = {}
                                                        if (target.indexOf('/') !== -1) {
                                                            chartString = targetNavigation + '/' + dataPointProperty.Criticality
                                                        } else {
                                                            chartString = dataPointProperty.Criticality
                                                        }
                                                        if (!resultMap.chartFields.includes(chartString)) {
                                                            resultMap.chartFields.push(chartString)
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    if (key.property === 'Dimensions' || key.property === 'Measures' && inSection == false) {
                                        for (let m of key.collection) {
                                            const propertyPath = m.propertyPath
                                            for (let n of propertyPath) {
                                                let chartString = {}
                                                if (target.indexOf('/') !== -1) {
                                                    chartString = targetNavigation + '/' + n.text
                                                } else {
                                                    chartString = n.text
                                                }
                                                if (!resultMap.chartFields.includes(chartString)) {
                                                    resultMap.chartFields.push(chartString)
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        default:
                            break;
                    }
                }
            }
            if (property === 'Annotation') {
            }
        }
        return result;
    };

    //解析CollectionFacet
    const _getCollectionFacet = (propertyValue) => {
        let id,
            label,
            childfacets = [];
        for (let c of propertyValue) {
            const { property, collection } = c;
            if (property === 'ID') {
                id = getTextValueByData('string', c);
            }
            if (property === 'Label') {
                label = getTextValueByData('string', c);
            }
            if (property === 'Facets') {
                for (let d of collection) {
                    const { record } = d;
                    for (let e of record) {
                        const { type, propertyValue } = e;
                        if (type === 'UI.ReferenceFacet') {
                            const ReferenceFacetData = _getReferenceFacet(propertyValue);
                            childfacets.push(ReferenceFacetData);
                        }
                        if (type === 'UI.CollectionFacet') {
                            const CollectionFacetData = _getCollectionFacet(propertyValue);
                            childfacets.push(CollectionFacetData);
                        }
                    }
                }
            }
        }
        return { id, label, childfacets };
    };

    //开始解析facets
    if (facets) {
        const { collection } = facets;
        if (collection) {
            for (let a of collection) {
                const { record } = a;
                if (record) {
                    for (let b of record) {
                        const { type, propertyValue, annotation } = b;
                        //判断是否隐藏
                        const { isHidden, hiddenPath } = isHiddenByAnnotation(annotation, currentRecord)
                        //console.log({ isHidden, hiddenPath, currentRecord })
                        if (hiddenPath) {
                            resultMap.hiddenPathArr.findIndex((item) => item === hiddenPath) === -1 && resultMap.hiddenPathArr.push(hiddenPath)
                        }
                        if (type === 'UI.CollectionFacet') {
                            const CollectionFacetData = _getCollectionFacet(propertyValue);
                            resultMap.sections.push({ ...CollectionFacetData, hiddenPath, isHidden });
                        }
                        if (type === 'UI.ReferenceFacet') {
                            const ReferenceFacetData = _getReferenceFacet(propertyValue);
                            resultMap.sections.push({ ...ReferenceFacetData, hiddenPath, isHidden });
                        }
                    }
                }
            }
        }
    }

    return resultMap;
};

/**
 * SelectionVariant 根据Annotations
 * UI.SelectionVariant 
 * @param {*} obj 
 * @returns 
 */
const getSelectionVariantByAnnotations = (obj, currentEntityTypeData) => {
    const result = {
        filter: null,
        PropertyNames: []
    };
    const { property, record } = obj;
    if (property === 'SelectionVariant') {
        for (let a of record) {
            const { propertyValue, type } = a;
            if (type === 'UI.SelectionVariantType') {
                for (let b of propertyValue) {
                    const { property, collection } = b;
                    if (property === 'SelectOptions') {
                        let filterItem
                        for (let c of collection) {
                            const { record } = c;
                            if (record) {
                                for (let d of record) {
                                    const { propertyValue, type } = d;
                                    let PropertyName
                                    if (type === 'UI.SelectOptionType') {
                                        for (let e of propertyValue) {
                                            const { property, collection } = e;
                                            if (property === 'PropertyName') {
                                                PropertyName = getTextValueByData('propertyPath', e);
                                                result.PropertyNames.push(PropertyName)
                                            }
                                            if (property === 'Ranges' && collection) {
                                                for (let f of collection) {
                                                    const { record } = f;
                                                    //是否有多项 多项为or
                                                    if (record) {
                                                        let $filter;
                                                        for (let g of record) {
                                                            let Option, Low, condition, lambda = {};
                                                            const { propertyValue } = g;
                                                            //if (type === 'UI.SelectionRangeType') {
                                                            for (let h of propertyValue) {
                                                                const { property } = h;
                                                                if (property === 'Option') {
                                                                    Option = getTextValueByData('enumMember', h);
                                                                }
                                                                if (property === 'Low') {
                                                                    Low = h[null] ? null : getTextValueByData('string', h);
                                                                }
                                                                // if (property === 'Sign') {
                                                                //     Sign = getTextValueByData('enumMember', h);
                                                                // }
                                                            }
                                                            //}

                                                            //查询 eq ne gt lt
                                                            switch (Option) {
                                                                case 'UI.SelectionRangeOptionType/EQ':
                                                                    condition = 'eq'
                                                                    break;
                                                                case 'UI.SelectionRangeOptionType/NE':
                                                                    condition = 'ne'
                                                                    break;
                                                                case 'UI.SelectionRangeOptionType/GT':
                                                                    condition = 'gt'
                                                                    break;
                                                                case 'UI.SelectionRangeOptionType/LT':
                                                                    condition = 'lt'
                                                                    break;
                                                                default:
                                                                    break;
                                                            }

                                                            //如果是boolean 需要去掉引号 'null'
                                                            let value
                                                            if (Low === 'true' || Low === 'false') {
                                                                value = Low
                                                            } else if (Low === null) {
                                                                value = null
                                                            } else if (lodash.isNumber(Low) || Low === '0') {
                                                                value = lodash.toNumber(Low)
                                                            } else {
                                                                value = `'${Low}'`
                                                            }

                                                            if (PropertyName.search('/') !== -1) {
                                                                const arr = PropertyName.split('/');
                                                                let _isCollection = isCollection(
                                                                    currentEntityTypeData.navigationProperty,
                                                                    arr[0],
                                                                );
                                                                //是否是一对多 是否使用lambda查询
                                                                if (_isCollection) {
                                                                    if (!lambda[arr[0]]) {
                                                                        lambda[arr[0]] = [`${arr[1]} ${condition} ${value}`];
                                                                    } else {
                                                                        lambda[arr[0]].push(`${arr[1]} ${condition} ${value}`);
                                                                    }
                                                                } else {
                                                                    $filter = !$filter ? `${PropertyName} ${condition} ${value}` : $filter += ` or ${PropertyName} ${condition} ${value}`;
                                                                }
                                                            } else {
                                                                $filter = !$filter ? `${PropertyName} ${condition} ${value}` : $filter += ` or ${PropertyName} ${condition} ${value}`;
                                                            }                                                            //拼接lambda语句
                                                            if (`${JSON.stringify(lambda)}` !== '{}') {
                                                                let lambdaUrl = '',
                                                                    lambdaUrlItem = '';
                                                                for (let key of Object.keys(lambda)) {
                                                                    lambda[key].map((item) => {
                                                                        if (lambdaUrlItem === '') {
                                                                            lambdaUrlItem = `c:c/${item}`;
                                                                        } else {
                                                                            lambdaUrlItem += ` and c/${item}`;
                                                                        }
                                                                    });
                                                                    if (lambdaUrl === '') {
                                                                        lambdaUrl = `${key}/any(${lambdaUrlItem})`;
                                                                    } else {
                                                                        lambdaUrl += ` and ${key}/any(${lambdaUrlItem})`;
                                                                    }
                                                                }
                                                                if (lambdaUrl !== '') {
                                                                    $filter = !$filter ? lambdaUrl : $filter += ` or ${lambdaUrl}`;
                                                                }
                                                            }
                                                        }
                                                        if ($filter && $filter.search('or') !== -1) {
                                                            $filter = `(${$filter})`
                                                        }
                                                        filterItem = !filterItem ? $filter : filterItem += ` and ${$filter}`
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        if (filterItem !== '') {
                            result.filter = filterItem;
                        }
                    }
                }
            }
        }
    }
    return result;
};

/**
 * 解析PresentationVariant 根据Annotations
 * UI.PresentationVariant 
 * @param {*} obj 
 * @returns 
 */
const getPresentationVariantByAnnotations = (obj) => {
    const { term, record, property } = obj;
    let result = {
        orderby: null,
        text: null
    };
    if (term === `UI.PresentationVariant` || property === 'PresentationVariant') {
        for (let a of record) {
            const { type, propertyValue } = a;
            if (type === 'UI.PresentationVariantType') {
                for (let b of propertyValue) {
                    const { property, collection, string } = b;

                    //默认排序
                    if (property === 'SortOrder') {
                        for (let c of collection) {
                            const { record } = c;
                            for (let d of record) {
                                const { propertyValue } = d;
                                let path, value;
                                for (let e of propertyValue) {
                                    const { property, propertyPath, bool } = e;
                                    if (property === 'Property') {
                                        path = propertyPath;
                                    }
                                    if (property === 'Descending') {
                                        value = bool;
                                    }
                                }
                                result.orderby = {
                                    name: path,
                                    target: value === 'true' ? 'desc' : 'asc'
                                }
                            }
                        }
                    }

                    //Visualizations 可视化内容 ***目前只支持第一个***
                    if (property === 'Visualizations') {
                        for (let c of collection) {
                            const { annotationPath } = c
                            if (annotationPath && annotationPath instanceof Array) {
                                const arr = annotationPath[0].text.split('#');//支持第一个annotationPath
                                result.Visualizations = {
                                    term: arr[0],
                                    qualifier: arr[1]
                                }
                            }
                        }
                    }
                    //Text 不清楚
                    if (property === 'Text') {
                        result.text = string;
                    }
                }
            }
        }
    }

    return result;
};

/**
 * 解析SelectionPresentationVariant 根据Annotations
 * UI.SelectionPresentationVariant 
 * @param {*} obj 
 * @returns 
 */
const getSelectionPresentationVariantByAnnotations = (obj, currentEntityTypeData) => {
    const result = {
        text: null,
        Selection: null,
        Presentation: null
    }

    if (obj) {
        const { term, record } = obj
        if (term === 'UI.SelectionPresentationVariant') {
            for (let a of record) {
                const { type, propertyValue } = a
                if (type === 'UI.SelectionPresentationVariantType') {
                    for (let b of propertyValue) {
                        const { property, string } = b
                        switch (property) {
                            case 'Text':
                                result.text = string
                                break;
                            case 'SelectionVariant':
                                result.Selection = getSelectionVariantByAnnotations(b, currentEntityTypeData)
                                break;
                            case 'PresentationVariant':
                                result.Presentation = getPresentationVariantByAnnotations(b)
                                break;
                            default:
                                break;
                        }
                    }
                }
            }
        }
    }

    return result
}

/**
 * 解析UI.Hidden,判断元素是否隐藏
 * @param {object} annotation
 * @param {object} currentRecord 当前对象的数据
 * @return {boolean}
 */
const isHiddenByAnnotation = (annotation, currentRecord, currentTerm = 'UI.Hidden') => {
    let result = {
        hiddenPath: null,
        isHidden: false,
        hiddenQueryPath: null
    }

    //目前只支持 path 一段式
    const _getEqAndNe = (condition, data) => {
        let result = {}
        let path = getTextValueByData('path', data)
        let string = getTextValueByData('string', data)
        if (path) {
            result.path = path
            result.string = string
            result.boolText = currentRecord && currentRecord[path] === string

        }
        return result
    }

    if (annotation) {
        for (let a of annotation) {
            const { term, if: dataIf, bool } = a
            const path = getTextValueByData('path', a)
            if (term === currentTerm) {
                //配置了语义化字段
                if (path) {
                    if (path.indexOf("()") !== -1) {
                        result.hiddenQueryPath = path.slice(1)
                    } else {
                        result.hiddenPath = path
                        //如果传递了值 objectPage 返回是否隐藏
                        if (currentRecord) {
                            result.isHidden = currentRecord[path]
                        }
                    }
                }
                //配置了if else 的情况
                if (dataIf) {
                    for (let b of dataIf) {
                        const { eq, bool: dibool, ne, or, path: diPath } = b
                        //或者 目前只支持或者是同一个字段
                        if (or) {
                            let or_eq = or[0].eq, or_eq_val
                            if (or_eq) {
                                or_eq_val = or_eq.findIndex((item) => {
                                    const { path, string, boolText } = _getEqAndNe('eq', item, dibool)
                                    result.hiddenPath = path
                                    return boolText
                                }) !== -1
                                result.isHidden = or_eq_val ? JSON.parse(dibool[0]?.text) : JSON.parse(dibool[1]?.text)
                            }
                        }
                        //相等
                        if (eq) {
                            const { path, boolText } = _getEqAndNe('eq', eq[0])
                            if (path) {
                                //console.log({ path, boolText, currentRecord, dibool })
                                result.hiddenPath = path
                                result.isHidden = boolText ? JSON.parse(dibool[0]?.text) : JSON.parse(dibool[1]?.text)
                            }
                        }
                        //不等于
                        if (ne) {
                            const { path, string, boolText } = _getEqAndNe('ne', ne[0], bool)
                            //console.log({ path, string, boolText, bool })
                            if (path) {
                                result.hiddenPath = path
                                result.isHidden = !boolText ? JSON.parse(dibool[0]?.text) : JSON.parse(dibool[1]?.text)
                            }
                        }
                        //直接谢path
                        if (diPath) {
                            let path = getTextValueByData('path', b)

                            if (path) {
                                result.hiddenPath = path
                                result.isHidden = !(currentRecord && currentRecord[path])
                            }
                        }
                    }
                }
                //直接配置了bool
                if (bool) {
                    result.isHidden = bool === 'true'
                }
            }
        }
    }

    return result
}

/**
 * 解析UI.LineItem
 * 
 */
const parseLineItem = (LineItemData, entitySet, targetPath, currentRecord) => {
    const result = {
        columns: [],
        inLineBtns: [],
        headerBtns: [],
        CriticalityPath: null,
    }
    const { term, collection, annotation } = LineItemData

    //解析UI.Criticality
    if (getTermData(annotation, 'UI.Criticality')) {
        const { term, path } = getTermData(annotation, 'UI.Criticality')
        result.CriticalityPath = path
    }

    //解析LineItem 的Collection
    const _getPropertyValue = (propertyValue, annotation) => {
        const result = {
            Label: null,
            Path: null,
            Url: null,
            SemanticObject: null,
            Action: null,
            Inline: null,
            HiddenPath: null,
            IsHidden: null,
            MediaUploadLink: null,
            TargetType: null,
            TargetValue: null,
            NavigationPropertyPath: null
        }

        //解析
        for (let c of propertyValue) {
            const { property, annotationPath } = c
            switch (property) {
                case 'Label':
                    result.Label = getTextValueByData('string', c)
                    break;
                case 'Value':
                    result.Path = getTextValueByData('path', c)
                    //当前LineItem上的Label优先级最高，如果未设置去查询当前字段时候配置Label 关联对象label
                    if (!result.Label) {
                        const { currentAnnotations } = parseDataByPath(entitySet, result.Path)
                        result.Label = getLableByAnnotation(currentAnnotations)
                    }
                    break;
                case 'Inline':
                    result.Inline = getTextValueByData('bool', c)
                    break;
                case 'SemanticObject':
                    result.SemanticObject = getTextValueByData('string', c)
                    break;
                case 'Action':
                    result.Action = getTextValueByData('string', c)
                    break;
                case 'Target':
                    result.NavigationPropertyPath = getTextValueByData('navigationPropertyPath', c)
                    let isSet = false;//是否集合请求
                    let chartEntitySet = '';
                    let chartAnnotation, target = annotationPath, newType, newValue;
                    const { currentAnnotations, currentEntitySetData } = parseDataByPath(entitySet)
                    // debugger
                    if (target && target.search('@UI.Chart') !== -1) {
                        newType = 'UI.Chart'
                        chartAnnotation = getAnnotationByAnnotationPath(target, currentAnnotations, currentEntitySetData);
                        chartEntitySet = entitySet;

                        newValue = {
                            isSet: isSet,
                            target: targetPath + '/' + target,
                            targetEntitySet: entitySet,
                            chartAnnotation: chartAnnotation.record[0]
                        };
                    } else if (target && target.search('@UI.DataPoint') !== -1) {
                        newType = 'UI.DataPoint'
                        const arr = target.split('#')
                        newValue = getDataPointProperty(currentAnnotations, arr[arr.length - 1])
                    }
                    result.TargetType = newType
                    result.TargetValue = newValue
                    break;
                case 'Url':
                    result.Url = getTextValueByData('path', c)
                    break;
                default:
                    break;
            }
        }

        //处理annotation
        if (annotation) {
            //处理是否隐藏
            const { hiddenPath, isHidden } = isHiddenByAnnotation(annotation)
            if (hiddenPath) {
                result.HiddenPath = hiddenPath
            }
            //处理上传逻辑
            if (!result.MediaUploadLink) {
                result.MediaUploadLink = getMediaUploadLink(annotation)
            }
        }

        //如果没有配置Label  使用 Path
        if (!result.Label) {
            result.Label = result.Path
        }
        return result
    }

    //解析LineItem 添加到 columns
    const _addToColumns = (obj) => {
        const idx = result.columns.findIndex((item) => item.path === obj.path)
        if (idx === -1) {
            result.columns.push(obj)
        }
    }

    //解析LineItem字段
    if (term === 'UI.LineItem') {
        for (let a of collection) {
            const { record } = a
            for (let b of record) {
                const { type, propertyValue, annotation } = b
                const {
                    Label,
                    Path,
                    Url,
                    Inline,
                    SemanticObject,
                    Action,
                    HiddenPath,
                    MediaUploadLink,
                    TargetType,
                    TargetValue,
                    NavigationPropertyPath
                } = _getPropertyValue(propertyValue, annotation)
                switch (type) {
                    case 'UI.DataField':
                        _addToColumns({
                            type: type,
                            path: Path,
                            label: Label,
                            show: true
                        })
                        break;
                    case 'UI.DataFieldForAction':
                        //判断是行内还是头部
                        if (Inline === 'true') {
                            result.inLineBtns.push({ Action, Label, HiddenPath, MediaUploadLink })
                        } else {
                            result.headerBtns.push({ Action, Label, HiddenPath, MediaUploadLink })
                        }
                        break
                    case 'UI.DataFieldForAnnotation':
                        if (TargetType) {
                            _addToColumns({
                                type: TargetType,
                                label: Label,
                                value: TargetValue,
                                show: true
                            })
                        }
                    case 'UI.DataFieldWithNavigationPath':
                        _addToColumns({
                            type: type,
                            path: Path,
                            label: Label,
                            navigationPropertyPath: NavigationPropertyPath,
                            show: true
                        })
                        break;
                    case 'UI.DataFieldForIntentBasedNavigation':
                        _addToColumns({
                            type: type,
                            path: Path,
                            label: Label,
                            semanticObject: SemanticObject,
                            action: Action,
                            show: true
                        })
                        break;
                    case 'UI.DataFieldWithUrl':
                        _addToColumns({
                            type: type,
                            path: Path,
                            label: Label,
                            url: Url,
                            show: true
                        })
                        break;
                    default:
                        break;
                }
            }
        }
    }

    return result
}

/**
 * 解析DataPoint
 * @param {*} currentAnnotations 
 * @param {*} qualifier 
 * @returns 
 */
const getDataPointProperty = (currentAnnotations, currentQualifier) => {
    let result = {
        Title: null,
        Value: null,
        Criticality: null,
        TargetValue: {
            targetValue: null,
            isTargetPath: false
        },
        MaximumValue: {
            maximumValue: null,
            isMaximumPath: false
        },
        Visualization: null,
        ValueFormat: null
    }

    if (currentAnnotations) {
        for (let a of currentAnnotations) {
            const { term, qualifier, record } = a
            if (term === 'UI.DataPoint') {
                if (currentQualifier && currentQualifier === qualifier) {
                    for (let b of record) {
                        const { type, propertyValue } = b
                        if (type === 'UI.DataPointType') {
                            for (let c of propertyValue) {
                                const { property } = c
                                switch (property) {
                                    case 'Title':
                                        result.Title = getTextValueByData('string', c)
                                        break;
                                    case 'Value':
                                        result.Value = getTextValueByData('path', c)
                                        break;
                                    case 'TargetValue':
                                        if (c.decimal) {
                                            result.TargetValue.targetValue = getTextValueByData('decimal', c)
                                        } else if (c.path) {
                                            result.TargetValue.targetValue = getTextValueByData('path', c)
                                            result.TargetValue.isTargetPath = true
                                        }
                                        break;
                                    case 'MaximumValue':
                                        if (c.decimal) {
                                            result.MaximumValue.maximumValue = getTextValueByData('decimal', c)
                                        } else if (c.path) {
                                            result.MaximumValue.maximumValue = getTextValueByData('path', c)
                                            result.MaximumValue.isMaximumPath = true
                                        }
                                        break;
                                    case 'Visualization':
                                        result.Visualization = getTextValueByData('enumMember', c)
                                        break;
                                    case 'Criticality':
                                        result.Criticality = getTextValueByData('path', c)
                                        break;
                                    case 'ValueFormat':
                                        //没实现
                                        //result.ValueFormat = getTextValueByData('string', c)
                                        break;
                                    default:
                                        break;
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

/**QuickCreateFacets 快速创建的字段信息
 * 解析
 * @param {*} currentAnnotations 
 */
const parseQuickCreateFacets = (currentAnnotations, entitySet) => {
    const result = {
        ID: null,
        Label: null,
        Target: null,
        Fields: [],
        ImmutableFields: []
    }
    //解析termUI.QuickCreateFacets
    if (currentAnnotations) {
        const { collection } = getTermData(currentAnnotations, 'UI.QuickCreateFacets')
        if (collection) {
            for (let a of collection) {
                const { record } = a
                for (let b of record) {
                    const { type, propertyValue } = b
                    if (type === 'UI.ReferenceFacet') {
                        for (let c of propertyValue) {
                            const { property, string, annotationPath } = c
                            switch (property) {
                                case 'ID':
                                    result.ID = string
                                case 'Label':
                                    result.Label = string
                                case 'Target':
                                    result.Target = annotationPath
                                default:
                                    break;
                            }
                        }
                    }
                }
            }
        }
    }
    //通过target 查找创建时需要的字段信息
    if (result.Target) {
        const arr = result.Target.split('#')
        const type = arr[0], qualifier = arr[1]
        if (type === '@UI.FieldGroup') {
            const { record } = getTermData(currentAnnotations, 'UI.FieldGroup', qualifier)
            if (record) {
                for (let a of record) {
                    const { type, propertyValue } = a
                    if (type === 'UI.FieldGroupType') {
                        for (let b of propertyValue) {
                            const { property, collection } = b
                            if (property === 'Data') {
                                for (let c of collection) {
                                    const { record } = c
                                    for (let d of record) {
                                        const { type, propertyValue } = d
                                        if (type === 'UI.DataField') {
                                            for (let e of propertyValue) {
                                                const { property, path } = e
                                                if (property === 'Value') {
                                                    result.Fields.push(path)
                                                    //处理Core.Immutable
                                                    const { currentAnnotations: propertyAnnotations } = parseDataByPath(entitySet, path)
                                                    for (let b of propertyAnnotations) {
                                                        const { term } = b
                                                        const bool = getTextValueByData('bool', b)
                                                        switch (term) {
                                                            case 'Core.Immutable':
                                                                if (!bool || bool === 'true') {
                                                                    result.ImmutableFields.push(path)
                                                                }
                                                                break;
                                                            default:
                                                                break;
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    return result.ID ? result : null
}

export default {
    isBtnHidden,
    getIdentificationByAnnotations,
    getDataFieldByRecord,
    getCommonTextByAnnotatons,
    getFieldReadonlyTextAndCurrentValue,
    getQueryContitionsByAnnotations,
    getHeaderInfoOptions,
    getColorFromCriticalityType,
    getTargetAnnotationProcessed,
    getObjectPageSectionsByFacets,
    getSelectionVariantByAnnotations,
    getPresentationVariantByAnnotations,
    getSelectionPresentationVariantByAnnotations,
    isHiddenByAnnotation,
    parseLineItem,
    getDataPointProperty,
    parseQuickCreateFacets
}