/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2023-11-20 15:23:53
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-12-07 11:47:01
 * @FilePath: /Uilab-Application/lib/Uilab-Comp/smart-comp/Anotations/smartTable.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import Utils from '../Process/utils'
import Odata from '../../utils/odata/odata'
import moment from 'moment'

/**
 * 获取表格配置
 * @param currentAnnotations
 * @returns
 */
const getTableConfig = (currentAnnotations: any[], entitySetName: string, qualifier: null | undefined, currentEntitySetData: any) => {
    const result = {
        columns: [] as any,
        inLineBtns: [] as any,
        headerBtns: [] as any
    }

    //LineItem
    const lineItem = Utils.getTermAnnotations(currentAnnotations, 'UI.LineItem', qualifier)
    if (lineItem) {
        //遍历collection数组 返回property配置
        const { collection } = lineItem
        if (collection) {
            //解析LineItem 添加到 columns
            const _addToColumns = (obj: any) => {
                const idx = result.columns.findIndex((item: any) => item.path === obj.path)
                if (idx === -1) {
                    result.columns.push(obj)
                }
            }
            for (let a of collection) {
                const { record } = a
                for (let b of record) {
                    const { type, propertyValue, annotation, } = b
                    let {
                        Label,
                        Value,
                        Url,
                        Inline,
                        SemanticObject,
                        Action,
                        TargetValue,
                        TargetType,
                        NavigationPropertyPath,
                        Criticality,
                        Target
                    } = Utils.parsePropertyValue(propertyValue, entitySetName)

                    switch (type) {
                        case 'UI.DataField':
                            _addToColumns({
                                type: type,
                                path: Value,
                                Label,
                                show: true,
                                Criticality
                            })
                            break;
                        case 'UI.DataFieldForAction':
                            const ActionData = Utils.parseActionByName(Action)
                            //判断是行内还是头部
                            if (Inline === 'true') {
                                result.inLineBtns.push({ Action: ActionData, Label, type })
                            } else {
                                result.headerBtns.push({ Action: ActionData, Label, type })
                            }
                            break
                        case 'UI.DataFieldForAnnotation':
                            const targetData = Utils.getTargetAnnotationProcessed(currentAnnotations, Target, currentEntitySetData)
                            if (targetData) {
                                const { facetType, value } = targetData
                                _addToColumns({
                                    type: facetType,
                                    path: value.Value,
                                    Label: value?.Title,
                                    value: value,
                                    show: true
                                })
                            }
                            break
                        case 'UI.DataFieldWithNavigationPath':
                            _addToColumns({
                                type: type,
                                path: Value,
                                Label,
                                navigationPropertyPath: NavigationPropertyPath,
                                show: true
                            })
                            break;
                        case 'UI.DataFieldForIntentBasedNavigation':
                            _addToColumns({
                                type: type,
                                path: Value,
                                Label,
                                semanticObject: SemanticObject,
                                action: Action,
                                show: true
                            })
                            break;
                        case 'UI.DataFieldWithUrl':
                            _addToColumns({
                                type: type,
                                path: Value,
                                Label,
                                Url,
                                show: true
                            })
                            break;
                        default:
                            break;
                    }
                }
            }
        }
    }
    return result
}

/**
 * 处理请求参数
 * @param queryEntity 
 * @param targetPath 
 */
const _setRequest = (entitySet: string, columns: any) => {
    return async (currentParams: { searchVal: any; params: any; filterDefaultValue: any }, parentColumns: any, queryEntity: any, targetNavigation: any) => {
        const currentColumns = parentColumns ? parentColumns : columns
        //列查询字段
        const fieldArr = [] as any
        currentColumns.map((item: { path: any; type: any; value: any; show: any; url: any; Criticality: any, Url: any }) => {
            const { path, type, value, show, Url, Criticality } = item
            switch (type) {
                case 'UI.DataField':
                    fieldArr.push(path)
                    Criticality && fieldArr.push(Criticality)
                    break;
                case 'UI.DataFieldWithUrl':
                    fieldArr.push(path)
                    Url && fieldArr.push(Url)
                    break;
                case 'UI.DataPoint':
                    fieldArr.push(path)
                    break;
                default:
                    break;
            }
        })

        //获取查询条件
        let { currentExpand, currentSelect } = await Utils.getQueryContitionsByAnnotations(
            fieldArr, entitySet
        );
        //console.log({ columns, fieldArr, entitySet, currentExpand, currentSelect })
        //请求参数准备
        interface Option {
            path: string,
            method: string,
            parameters: any
        }
        let option: Option = {
            path: queryEntity && targetNavigation ? `${queryEntity}/${targetNavigation}` : entitySet,
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

        //设置过滤、排序条件
        if (currentParams) {
            const { searchVal, params, filterDefaultValue } = currentParams
            const { pageSize, current } = params
            if (pageSize && current) {
                option.parameters.$top = pageSize
                option.parameters.$skip = pageSize * (current - 1)
            }

            //处理fiterbar的过滤条件
            if (searchVal) {
                let onSearchFilter, url
                for (let key of Object.keys(searchVal)) {
                    if (searchVal[key] !== '' && searchVal[key] != null) {

                        if (searchVal[key] instanceof Array) {
                            //处理 dataTime类型的时间筛选
                            url = `${key} gt ${moment(`${searchVal[key][0]} 00:00:00`).format('YYYY-MM-DDTHH:mm:ss.SSSZ')} and ${key} lt ${moment(`${searchVal[key][0]} 23:59:59`).format('YYYY-MM-DDTHH:mm:ss.SSSZ')}`
                        } else {
                            url =
                                key.search('Id') == -1
                                    ? `contains(${key}, '${searchVal[key]}')`
                                    : `${key} eq '${searchVal[key]}'`;
                        }

                        //页面搜索条件的过滤条件
                        if (!onSearchFilter) {
                            onSearchFilter = url;
                        } else {
                            onSearchFilter += ` and ${url}`;
                        }
                    }
                }
                if (onSearchFilter) {
                    option.parameters.$filter = onSearchFilter
                } else {
                    option.parameters.$filter = null
                }
            }

            //处理默认过滤条件
            if (filterDefaultValue) {
                if (!option?.parameters?.$filter) {
                    option.parameters.$filter = filterDefaultValue
                } else {
                    option.parameters.$filter += ` and ${filterDefaultValue}`
                }
            }

            //console.log({ currentParams, option })
        }

        return await Odata.submit(option);
    }
}

export const getConfig = async (params: { entitySet: any; qualifier: any }) => {
    const { entitySet, qualifier } = params
    const { currentAnnotations, currentEntityTypeData, currentEntitySetData } = Utils.getEntitySetConfig(entitySet)
    const { columns, inLineBtns, headerBtns } = getTableConfig(currentAnnotations, entitySet, qualifier, currentEntitySetData)
    const annoRequest = _setRequest(entitySet, columns)
    const quickCreate = Utils.parseQuickCreateFacets(currentAnnotations, entitySet)
    console.log('SmartTable-Log', {
        entitySet,
        annoRequest,
        columns,
        inLineBtns,
        headerBtns,
        quickCreate,
        currentAnnotations,
        qualifier
    })
    return {
        entitySet,
        annoRequest,
        columns,
        inLineBtns,
        headerBtns,
        quickCreate,//是否配置快速创建
    }
}