/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2022-09-19 14:59:09
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-01-11 18:11:06
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
import Odata from '../../utils/odata/odata';
import { array_get } from '../../utils/util';

const {
    parseDataByPath,
    getTermData,
    getTextValueByData
} = Other
const {
    getLableByAnnotation
} = Common

/**
 * 根据annotation解析所需要的数据结构配置项
 */
let SmartChartSingleConfig = {
    entitySet: null,
    Analytics: null,
    annoRequest: null
}

/**
 * 解析Analytics 需要的property
 * @param {*} currentAnnotations 
 * @param {*} qualifier 
 */
const _parseAnalytics = (currentAnnotations, qualifier) => {
    const result = {
        AggregatedProperties: [],//可选用的指标集合
        ApplySupported: null,
        ChartDefinition: null
    }

    //1.解析Analytics.AggregatedProperties 设置可选指标
    result.AggregatedProperties = _getAggregatedAnnotation(currentAnnotations)

    //2.解析Aggregation.ApplySupported 设置支持可选维度
    result.ApplySupported = _getApplyAnnotation(currentAnnotations)

    //3.解析对应的UI.Chart 设置默认请求
    result.ChartDefinition = _getChartDefinition(currentAnnotations, qualifier)
    return result
}

const _getChartDefinition = (currentAnnotations, qualifier) => {
    const result = {
        ChartDefinition: null
    }
    const ChartAnno = getTermData(currentAnnotations, 'UI.Chart', qualifier)
    if (ChartAnno) {
        const { record } = ChartAnno
        for (let a of record) {
            const { type, propertyValue } = a
            if (type === 'UI.ChartDefinitionType') {
                const obj = {}
                for (let b of propertyValue) {
                    const { property, collection } = b
                    switch (property) {
                        case 'Title':
                            obj.Title = getTextValueByData('string', b)
                            break;
                        case 'Description':
                            obj.Description = getTextValueByData('string', b)
                            break;
                        case 'ChartType':
                            obj.ChartType = getTextValueByData('enumMember', b)
                            break;
                        case 'Dimensions':
                            obj.Dimensions = collection && collection[0].propertyPath
                            break;
                        case 'DimensionAttributes':
                            obj.DimensionAttributes = []
                            for (let c1 of collection) {
                                const { record } = c1
                                for (let d1 of record) {
                                    const { propertyValue, type } = d1
                                    if (type === 'UI.ChartDimensionAttributeType') {
                                        const ChartDimensionAttribute = {}
                                        for (let e1 of propertyValue) {
                                            const { property } = e1
                                            switch (property) {
                                                case 'Dimension':
                                                    ChartDimensionAttribute.Dimension = getTextValueByData('propertyPath', e1)
                                                    break;
                                                case 'Role':
                                                    ChartDimensionAttribute.Role = getTextValueByData('enumMember', e1)
                                                    break;
                                                default:
                                                    break;
                                            }
                                        }
                                        obj.DimensionAttributes.push(ChartDimensionAttribute)
                                    }
                                }
                            }
                            break;
                        case 'Measures':
                            obj.Measures = collection && collection[0].propertyPath
                            break;
                        case 'MeasureAttributes':
                            obj.MeasureAttributes = []
                            for (let c2 of collection) {
                                const { record } = c2
                                for (let d2 of record) {
                                    const { propertyValue, type } = d2
                                    if (type === 'UI.ChartMeasureAttributeType') {
                                        const ChartMeasureAttribute = {}
                                        for (let e2 of propertyValue) {
                                            const { property } = e2
                                            switch (property) {
                                                case 'Measure':
                                                    ChartMeasureAttribute.Measure = getTextValueByData('propertyPath', e2)
                                                    break;
                                                case 'Role':
                                                    ChartMeasureAttribute.Role = getTextValueByData('enumMember', e2)
                                                    break;
                                                default:
                                                    break;
                                            }
                                        }
                                        obj.MeasureAttributes.push(ChartMeasureAttribute)
                                    }
                                }
                            }
                            break;
                        default:
                            break;
                    }
                }
                result.ChartDefinition = obj

            }
        }
    }
    return result.ChartDefinition

}

const _getAggregatedAnnotation = (currentAnnotations) => {
    const result = {
        AggregatedProperties: []
    }
    const AggregatedPropertiesAnno = getTermData(currentAnnotations, 'Analytics.AggregatedProperties')
    if (AggregatedPropertiesAnno) {
        const { collection } = AggregatedPropertiesAnno
        for (let a of collection) {
            const { record } = a
            for (let b of record) {
                const { type, propertyValue, annotation } = b
                if (type === 'Analytics.AggregatedPropertyType') {
                    const obj = {}
                    if (annotation) {
                        obj.Label = getLableByAnnotation(annotation)
                    }
                    for (let c of propertyValue) {
                        const { property } = c
                        switch (property) {
                            case 'Name':
                                obj.Name = getTextValueByData('string', c)
                                break;
                            case 'AggregationMethod':
                                obj.AggregationMethod = getTextValueByData('string', c)
                                break;
                            case 'AggregatableProperty':
                                obj.AggregatableProperty = getTextValueByData('propertyPath', c)
                                break;
                            default:
                                break;
                        }
                    }
                    result.AggregatedProperties.push(obj)
                }
            }
        }
    }
    return result.AggregatedProperties
}

const _getApplyAnnotation = (currentAnnotations) => {
    const result = {
        ApplySupported: null
    }
    const AggregatedApplySupportedAnno = getTermData(currentAnnotations, 'Aggregation.ApplySupported')
    if (AggregatedApplySupportedAnno) {
        const { record } = AggregatedApplySupportedAnno
        for (let b of record) {
            const { type, propertyValue } = b
            if (type === 'Aggregation.ApplySupportedType') {
                const obj = {}
                for (let c of propertyValue) {
                    const { property, collection } = c
                    switch (property) {
                        case 'Transformations':
                            obj.Transformations = collection && collection[0].string
                            break;
                        case 'Rollup':
                            obj.Rollup = getTextValueByData('enumMember', c)
                            break;
                        case 'PropertyRestrictions':
                            obj.PropertyRestrictions = getTextValueByData('bool', c)
                            break;
                        case 'GroupableProperties':
                            obj.GroupableProperties = collection && collection[0].propertyPath
                            break;
                        case 'AggregatableProperties':
                            //obj.AggregatableProperties = collection && collection[0].string
                            const { record } = collection[0]
                            obj.AggregatableProperties = []
                            for (let d of record) {
                                const { type, propertyValue } = d
                                if (type === 'Aggregation.AggregatablePropertyType') {
                                    const AggregatableObj = {}
                                    for (let e of propertyValue) {
                                        const { property, collection } = e
                                        switch (property) {
                                            case 'Property':
                                                AggregatableObj.Property = getTextValueByData('propertyPath', e)
                                                break;
                                            case 'SupportedAggregationMethods':
                                                AggregatableObj.SupportedAggregationMethods = collection[0].string
                                                break;
                                            case 'RecommendedAggregationMethod':
                                                AggregatableObj.RecommendedAggregationMethod = getTextValueByData('string', e)
                                                break;
                                            default:
                                                break;
                                        }
                                    }
                                    obj.AggregatableProperties.push(AggregatableObj)
                                }
                            }
                            break;

                        default:
                            break;
                    }
                }
                result.ApplySupported = obj
            }
        }
    }
    return result.ApplySupported
}

/**
 * 设置请求
 * @param {*} entitySet 
 * @param {*} queryEntity 
 * @param {*} targetPath 
 * @returns 
 * 
 * 回调函数的请求params说明
 * 1.Dimensions:[{text: 'productPriceTypeId'}]
 * 2.Measures:[{text: 'maxAmount'},{text: 'avgAmount'}]
 */
const _setRequest = (entitySet, queryEntity, targetPath) => {
    return async (params = {}) => {
        const { Dimensions: sendDimensions, Measures: sendMeasures } = params
        const { Analytics } = SmartChartSingleConfig
        const { ChartDefinition, AggregatedProperties } = Analytics
        const { Dimensions, Measures } = ChartDefinition
        const currentDimensions = sendDimensions ? sendDimensions : Dimensions
        const currentMeasures = sendMeasures ? sendMeasures : Measures
        let DimensionsStr = '', MeasuresStr = ''
        //请求参数准备
        let option = {
            path: queryEntity ? `${queryEntity}/${targetPath}` : entitySet,
            method: 'GET',
            parameters: {}
        };
        //设置Dimension
        if (currentDimensions && currentDimensions.length > 0) {
            currentDimensions.map((item, index) => {
                const { text } = item
                DimensionsStr += index === 0 ? text : `,${text}`
            })
        }

        //设置Measures
        if (currentMeasures && currentMeasures.length > 0) {
            currentMeasures.map((item, index) => {
                const { text } = item
                const idx = AggregatedProperties && AggregatedProperties.findIndex((d) => d.Name === text)
                if (idx !== -1) {
                    const { AggregationMethod, AggregatableProperty } = AggregatedProperties[idx]
                    const str = `${AggregatableProperty} with ${AggregationMethod} as ${text}`
                    MeasuresStr += index === 0 ? str : `,${str}`
                }
            })
        }

        //设置$apply
        if (DimensionsStr !== '' && MeasuresStr !== '') {
            option.parameters.$apply = `groupby((${DimensionsStr}),aggregate(${MeasuresStr}))`
        }

        return await Odata.submit(option);
    }
}


/**
 * 解析入口
 */
const getConfig = (params) => {
    const { entitySet, qualifier, targetPath, queryEntity } = params
    SmartChartSingleConfig.entitySet = entitySet
    const { currentAnnotations } = parseDataByPath(entitySet)
    let measures = []
    let index = 0
    let dimensions = []
    let dimensionTypes = []
    let aggregatedPropertyList = {}
    let groupablePropertyList = []

    //解析图表配置组件的默认项
    const chartDefitionAnnotation = _getChartDefinition(currentAnnotations, qualifier)
    for (let key of chartDefitionAnnotation.MeasureAttributes) {
        index++
        let measureType = key.Role
        if (measureType.search('/') !== -1) {
            const arr = measureType.split('/')
            measureType = arr[1]
        }
        measures.push({
            id: index,
            measure: key.Measure,
            measureType: measureType,
        })
    }

    for (let key of chartDefitionAnnotation.DimensionAttributes) {
        index++
        let dimensionType = key.Role
        let dimension = key.Dimension
        if (dimensionType.search('/') !== -1) {
            const arr = dimensionType.split('/')
            dimensionType = arr[1]
        }
        dimensionTypes.push({
            id2: index,
            dimensionType: dimensionType,
            dimension: dimension,
        })
    }

    //解析图表默认类型
    let currentChartType = chartDefitionAnnotation.ChartType
    if (currentChartType.search('/') !== -1) {
        const arr = currentChartType.split('/')
        currentChartType = arr[1]
    }

    //解析图表可配置项内容
    const AggregatedProperties = _getAggregatedAnnotation(currentAnnotations)
    for (let key of AggregatedProperties) {
        aggregatedPropertyList[key.Name] = { text: key.Label, measure: key.Name }
    }

    const GroupableProperties = _getApplyAnnotation(currentAnnotations)
    for (let key of GroupableProperties.GroupableProperties) {
        groupablePropertyList[key.text] = { text: key.text, dimension: key.text }
    }
    const dimensionTypeList = {
        Series: { text: 'Series', value: 'Series' },
        Category: { text: 'Category', value: 'Category' },
    }

    const measureTypeList = {
        Axis1: { text: 'Axis1', value: 'Axis1' },
        Axis2: { text: 'Axis2', value: 'Axis2' },
        Axis3: { text: 'Axis3', value: 'Axis3' }
    }

    let chartConfigObj = {
        measures, dimensions, currentChartType, dimensionTypes,
        aggregatedPropertyList, groupablePropertyList, dimensionTypeList, measureTypeList
    }

    SmartChartSingleConfig.Analytics = _parseAnalytics(currentAnnotations, qualifier)
    SmartChartSingleConfig.annoRequest = _setRequest(entitySet, queryEntity, targetPath)
    SmartChartSingleConfig.chartConfigObj = chartConfigObj
    return SmartChartSingleConfig
}

export {
    getConfig
}