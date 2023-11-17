/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2022-09-19 14:59:09
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-09-26 12:59:55
 * @FilePath: /uilab-gbms/lib/o3smart-comp/Anotations/SmartTable.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {
    Other,
    Ui,
    Capabilities,
    Common
} from '../Process/index';
import Odata from '../../utils/odata/odata';
import { getRequestFields } from './SmartChart';
import storage from '../../utils/storage/metadataStorage'
const {
    getTermData,
    parseDataByPath,
    getPrimaryKeys,
    getTextValueByData,
    getEntityTypePropertyAnnotations
} = Other
const {
    parseLineItem,
    getQueryContitionsByAnnotations,
    getFieldReadonlyTextAndCurrentValue,
    isHiddenByAnnotation,
    parseQuickCreateFacets
} = Ui
const {
    getObjectRestrictions
} = Capabilities
const {
    getLableByAnnotation,
    getFilterDefaultValue
} = Common

/**
 * 根据annotation解析table所需要的数据结构配置项
 */
let SmartTableConfig = {
    annoColumns: [],
    annoRequest: null,
    entitySet: null,
    currentEntityTypeData: null,
    stickySession: null,
    getPathValue: null,
    stickSessionCreateData: null,
    CreateHidden: false,
    UpdateHidden: false,
    DeleteHidden: false,
    LaucnPadConfig: null,
    QuickCreateFacets: null,
    filterDefaultValue: null
}

//设置请求
const _setRequest = (entitySet, queryEntity, targetPath, CriticalityPath, inLineBtns, PrimaryKeys) => {
    return async (params) => {
        const { option: sendOption, columns } = params
        //添加要查询的字段
        const fieldArr = []
        if (CriticalityPath) {
            fieldArr.push(CriticalityPath)
        }

        //inlineBtn 需要查询的字段
        if (inLineBtns) {
            for (let a of inLineBtns) {
                const { HiddenPath } = a
                if (HiddenPath) {
                    fieldArr.push(HiddenPath)
                }
            }
        }
        columns.map((item) => {
            const { dataIndex: path, type, value, show, url } = item
            switch (type) {
                case 'UI.DataField':
                    show === true && fieldArr.push(path)
                    break;
                case 'UI.Chart':
                    var chartFields = getRequestFields(item);
                    if (chartFields.length) {
                        chartFields.some(function (_field) {
                            if (!fieldArr.includes(_field)) {
                                fieldArr.push(_field)
                            }
                        });
                    }
                    break;
                case 'UI.DataPoint':
                    fieldArr.push(value.Value)
                    break;
                case 'UI.DataFieldWithNavigationPath':
                    fieldArr.push(path)
                    break;
                case 'UI.DataFieldWithUrl':
                    fieldArr.push(path)
                    fieldArr.push(url)
                    break;
                default:
                    break;
            }
        })
        //获取查询条件
        let { currentExpand, currentSelect } = getQueryContitionsByAnnotations(
            fieldArr, entitySet
        );
        //console.log({fieldArr,currentExpand, currentSelect})

        if (PrimaryKeys) {
            PrimaryKeys.map((PrimaryKeyItem) => {
                if (currentSelect.findIndex((item) => item === PrimaryKeyItem) === -1) {
                    currentSelect.push(PrimaryKeyItem)
                }
            })
        }

        //请求参数准备
        let option = {
            path: queryEntity ? `${queryEntity}/${targetPath}` : entitySet,
            method: 'GET',
            parameters: {
                $count: true
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

        //设置过滤、排序条件
        if (sendOption) {
            option.parameters = { ...option.parameters, ...sendOption }
        }

        return await Odata.submit(option);
    }
}

//查询某个字段的返回值
const _getPathValue = (entitySet) => {
    return (path, record) => {
        const { currentAnnotations } = parseDataByPath(entitySet, path)
        return getFieldReadonlyTextAndCurrentValue(record, currentAnnotations, path)
    }
}

//1.添加currentEntityType的property到列表默认不显示
const _setAnnoColumns = (columns, currentEntityTypeData, entitySet) => {

    //处理当前entityType的property 先取消这个功能
    // if (currentEntityTypeData) {
    //     const { property } = currentEntityTypeData
    //     for (let a of property) {
    //         const { name } = a
    //         if (columns.findIndex((item) => item.path === name) === -1) {
    //             const { currentAnnotations } = parseDataByPath(entitySet, name)
    //             //判断是否隐藏
    //             const bool = getTextValueByData('bool', getTermData(currentAnnotations, 'UI.Hidden'))
    //             if (bool !== 'true') {
    //                 //获取对应字段的label
    //                 let currentLabel = getLableByAnnotation(currentAnnotations)
    //                 if (!currentLabel) {
    //                     currentLabel = name
    //                 }
    //                 columns.push({
    //                     type: 'UI.DataField',
    //                     path: name,
    //                     label: currentLabel,
    //                     show: false
    //                 })
    //             }
    //         }
    //     }
    // }

    return columns
}

/**
 * 设置当前对象 创建时需要的字段信息
 * @param {*} entitySet 
 * @param {*} currentAnnotations 
 * @param {*} PrimaryKeys 
 * @returns 
 */
const _setStickSessionCreateData = (entitySet, currentAnnotations, PrimaryKeys, currentEntityTypeData) => {
    let currentPropertyPath = []
    //console.log({ entitySet, currentAnnotations, PrimaryKeys, currentEntityTypeData })
    //1.获取当前对象的RequiredProperties 
    if (currentAnnotations) {
        for (let a of currentAnnotations) {
            const { term, record } = a
            if ((term === 'Org.OData.Capabilities.V1.InsertRestrictions' || term === 'Capabilities.InsertRestrictions') && record) {
                for (let b of record) {
                    const { type, propertyValue } = b
                    if ((type === 'Org.OData.Capabilities.V1.InsertRestrictionsType' || type === 'Capabilities.InsertRestrictionsType') && propertyValue) {
                        for (let c of propertyValue) {
                            const { property, collection } = c
                            if (property === 'RequiredProperties' && collection) {
                                for (let d of collection) {
                                    const { propertyPath } = d
                                    propertyPath && currentPropertyPath.push(...propertyPath)
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    //2.添加当前对象的主键
    if (PrimaryKeys) {
        for (let a of PrimaryKeys) {
            if (currentPropertyPath.findIndex((item) => item.text === a) === -1) {
                currentPropertyPath.push({ text: a })
            }
        }
    }

    //3.把当前对象的字段中配置了Core.Immutable 添加到currentPropertyPath
    if (currentEntityTypeData) {
        const { property } = currentEntityTypeData
        for (let a of property) {
            const { name } = a
            const { currentAnnotations: propertyAnnotations } = parseDataByPath(entitySet, name)
            for (let b of propertyAnnotations) {
                const { term } = b
                const bool = getTextValueByData('bool', b)
                switch (term) {
                    case 'Core.Immutable':
                        if (!bool || bool === 'true') {
                            currentPropertyPath.push({
                                text: name
                            })
                        }
                        break;
                    default:
                        break;
                }
            }
        }
    }

    //4.去除term:Core.Computed UI.Hidden
    for (let a of currentPropertyPath) {
        const { text } = a
        const { currentAnnotations: propertyAnnotations } = parseDataByPath(entitySet, text)
        for (let b of propertyAnnotations) {
            const { term, bool } = b
            switch (term) {
                case 'Core.Computed':
                    a.hidden = true
                    break;
                case 'UI.Hidden':
                    a.hidden = true
                    break;
                default:
                    break;
            }
        }
    }

    return currentPropertyPath
}

/**
 * 是否隐藏创建按钮
 * @param {*} currentAnnotations 
 */
const _getCreateHidden = (currentAnnotations) => {
    const { hiddenPath, isHidden, hiddenQueryPath } = isHiddenByAnnotation(currentAnnotations, null, 'UI.CreateHidden')
    return hiddenQueryPath ? async () => {
        //请求参数准备
        let option = {
            path: hiddenQueryPath,
            method: 'GET',
        };
        return await Odata.submit(option);
    } : isHidden
}

const _getUpdateHidden = (currentAnnotations) => {
    const { hiddenPath, isHidden } = isHiddenByAnnotation(currentAnnotations, null, 'UI.UpdateHidden')
    return isHidden
}

const _getDeleteHidden = (currentAnnotations) => {
    const { hiddenPath, isHidden } = isHiddenByAnnotation(currentAnnotations, null, 'UI.DeleteHidden')
    //console.log({ currentAnnotations, isHidden })
    return isHidden
}

//设置表格是否可选
const _setRowSelection = (headerBtns) => {
    const { data } = storage.get(window.micrAppName)
    const { namespace, action } = data?.metadata?.dataServices?.schema[0]
    let result
    if (headerBtns) {
        headerBtns.map((item, index) => {
            const { Action } = item
            //console.log({ Action, headerBtns, item })
            for (let b of action) {
                const { name, isBound, parameter } = b
                if (`${namespace}.${name}` === Action) {
                    if (isBound && isBound === 'true') {
                        headerBtns[index].isBound = true
                        if (parameter[0]) {
                            const { type } = parameter[0]
                            if (type) {
                                headerBtns[index].isCollection = type.includes('Collection')
                            }
                        }
                        result = 'checkbox'
                    }
                }
            }
        })

    }
    return result
}

//拼接query path
const _getBatchPath = () => {
    return (params) => {
        const { entitySet, record, PrimaryKeys } = params
        let result, str = ''

        //判断是日期类型
        const _isDateTime = (name) => {
            return record[`${name}@odata.type`] === '#DateTimeOffset'
        }

        //判断是否为数字类型minimumOrderQuantity@odata.type:"#Decimal"
        const _isNumber = (name) => {
            return record[`${name}@odata.type`] === '#Decimal'
        }

        if (record && PrimaryKeys) {
            if (PrimaryKeys.length === 1) {
                str = `'${record[PrimaryKeys[0]]}'`
            } else {
                PrimaryKeys.map((name, index) => {

                    let value
                    //判断是否为日期格式
                    if (_isDateTime(name)) {
                        value = `${record[name]}`
                        //处理  ： 转义为 %3A
                        value = value.replace(/(\:)/g, '%3A')
                    } else if (_isNumber(name)) {
                        value = record[name]
                    } else {
                        value = `'${record[name]}'`
                    }

                    //多组件拼接
                    if (index === 0) {
                        str += `${name}=${value}`
                    } else {
                        str += `,${name}=${value}`
                    }
                })
            }
            result = `${entitySet}(${str})`
        } else {
            console.error('错误223===>', { entitySet, record, PrimaryKeys })
        }
        return result
    }
}


const _getFilterDefaultValue = (currentEntityTypePropertyAnnotations) => {
    let result
    if (currentEntityTypePropertyAnnotations && currentEntityTypePropertyAnnotations instanceof Array) {
        currentEntityTypePropertyAnnotations.map((item) => {
            if (getFilterDefaultValue(item)) {
                result = getFilterDefaultValue(item)
                return result
            }
        })
    }
    return result
}

/**
 * 解析入口
 */
const getConfig = (params) => {
    const { entitySet, qualifier, queryEntity, targetPath } = params
    SmartTableConfig.entitySet = entitySet
    if (!SmartTableConfig.LaucnPadConfig) {
        const { data } = storage.get(window.micrAppName)
        const { LaucnPadConfig } = data
        SmartTableConfig.LaucnPadConfig = LaucnPadConfig
    }

    const { currentAnnotations, currentStickySessionData, currentEntityTypeData } = parseDataByPath(entitySet)
    const LineItemData = getTermData(currentAnnotations, 'UI.LineItem', qualifier)
    const { columns, inLineBtns, headerBtns, CriticalityPath, HiddenPath } = parseLineItem(LineItemData, entitySet, targetPath)

    SmartTableConfig.CriticalityPath = CriticalityPath
    SmartTableConfig.HiddenPath = HiddenPath
    SmartTableConfig.currentEntityTypeData = currentEntityTypeData
    SmartTableConfig.annoColumns = _setAnnoColumns(columns, currentEntityTypeData, entitySet)
    SmartTableConfig.inLineBtns = inLineBtns
    SmartTableConfig.headerBtns = headerBtns
    SmartTableConfig.rowSelection = _setRowSelection(headerBtns)
    SmartTableConfig.PrimaryKeys = getPrimaryKeys(currentEntityTypeData)
    SmartTableConfig.annoRequest = _setRequest(entitySet, queryEntity, targetPath, CriticalityPath, inLineBtns, SmartTableConfig.PrimaryKeys)
    SmartTableConfig.stickySession = currentStickySessionData
    SmartTableConfig = { ...SmartTableConfig, ...getObjectRestrictions(currentAnnotations) }
    SmartTableConfig.getPathValue = _getPathValue(entitySet)
    SmartTableConfig.CreateHidden = _getCreateHidden(currentAnnotations)
    SmartTableConfig.UpdateHidden = _getUpdateHidden(currentAnnotations)
    SmartTableConfig.DeleteHidden = _getDeleteHidden(currentAnnotations)
    SmartTableConfig.stickSessionCreateData = _setStickSessionCreateData(entitySet, currentAnnotations, SmartTableConfig.PrimaryKeys, currentEntityTypeData)
    SmartTableConfig.QuickCreateFacets = parseQuickCreateFacets(currentAnnotations, entitySet)
    SmartTableConfig.getBatchPath = _getBatchPath()
    SmartTableConfig.filterDefaultValue = _getFilterDefaultValue(getEntityTypePropertyAnnotations(currentEntityTypeData.name))

    // if (entitySet === 'Warehouses') {
    //     console.log('SmartTableConfig', { entitySet, SmartTableConfig, currentAnnotations, LineItemData, inLineBtns })
    // }

    return SmartTableConfig
}

export {
    getConfig
}