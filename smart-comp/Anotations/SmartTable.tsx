/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2023-11-20 15:23:53
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-11-23 11:10:15
 * @FilePath: /Uilab-Application/lib/Uilab-Comp/smart-comp/Anotations/smartTable.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import Utils from '../Process/utils'
import Odata from '../../utils/odata/odata'
interface SmartTableConfigType {
    entitySet: string,
    annoRequest: any,
    columns: any[],
    inLineBtns: any[],
    headerBtns: any[]

}
let SmartTableConfig: SmartTableConfigType = {
    entitySet: '',
    annoRequest: null,
    columns: [],
    inLineBtns: [],
    headerBtns: [],
}

/**
 * 获取表格配置
 * @param currentAnnotations
 * @returns
 */
const getTableConfig = async (currentAnnotations: any[]) => {
    const result = {
        columns: [] as any,
        inLineBtns: [] as any,
        headerBtns: [] as any
    }

    //LineItem
    const lineItem = Utils.getTermAnnotations(currentAnnotations, 'UI.LineItem')
    //console.log({ lineItem })
    if (lineItem) {
        //遍历collection数组 返回property配置
        const { collection } = lineItem[0]
        if (collection) {
            //解析LineItem 的Collection
            const _getPropertyValue = async (propertyValue, annotation) => {
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
                            result.Label = Utils.getTextValueByData('string', c)
                            break;
                        case 'Value':
                            result.Path = Utils.getTextValueByData('path', c)
                            //当前LineItem上的Label优先级最高，如果未设置去查询当前字段时候配置Label 关联对象label
                            if (!result.Label) {
                                const { currentAnnotations } = await Utils.getEntitySetConfig(SmartTableConfig.entitySet, result.Path)
                                result.Label = Utils.getLableByAnnotation(currentAnnotations)
                            }
                            break;
                        case 'Inline':
                            result.Inline = Utils.getTextValueByData('bool', c)
                            break;
                        case 'SemanticObject':
                            result.SemanticObject = Utils.getTextValueByData('string', c)
                            break;
                        case 'Action':
                            result.Action = Utils.getTextValueByData('string', c)
                            break;
                        case 'Target':
                            break;
                        case 'Url':
                            result.Url = Utils.getTextValueByData('path', c)
                            break;
                        default:
                            break;
                    }
                }

                //处理annotation
                if (annotation) {
                }

                //如果没有配置Label  使用 Path
                if (!result.Label) {
                    result.Label = result.Path
                }
                return result
            }

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
                    } = await _getPropertyValue(propertyValue, annotation)
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

    }
    return result
}

/**
 * 处理请求参数
 * @param queryEntity 
 * @param targetPath 
 */
const _setRequest = (queryEntity = null, targetPath = null) => {
    const { entitySet, columns } = SmartTableConfig
    interface Params {
        option: any
    }
    return async (params: Params = {
        option: undefined
    }) => {
        const fieldArr = []
        const { option: sendOption } = params
        columns.map((item) => {
            const { path, type, value, show, url } = item
            switch (type) {
                case 'UI.DataField':
                    show === true && fieldArr.push(path)
                    break;
                default:
                    break;
            }
        })
        //获取查询条件
        let { currentExpand, currentSelect } = await Utils.getQueryContitionsByAnnotations(
            fieldArr, entitySet
        );

        //请求参数准备
        interface Option {
            path: string,
            method: string,
            parameters: any
        }
        let option: Option = {
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

        //设置过滤、排序条件
        if (sendOption) {
            option.parameters = { ...option.parameters, ...sendOption }
        }
        return await Odata.submit(option);
    }
}

const getConfig = async (params) => {
    const { entitySet } = params
    SmartTableConfig.entitySet = entitySet
    const { currentAnnotations, currentEntityTypeData } = await Utils.getEntitySetConfig(entitySet)
    if (currentAnnotations) SmartTableConfig = { ...SmartTableConfig, ...await getTableConfig(currentAnnotations) }
    SmartTableConfig.annoRequest = _setRequest()

    console.log({ SmartTableConfig, currentAnnotations, currentEntityTypeData })
    return SmartTableConfig
}

export {
    getConfig
}