/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2022-09-19 14:59:09
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-12-05 16:20:01
 * @FilePath: /uilab-gbms/lib/o3smart-comp/Anotations/SmartTable.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

import Odata from '../../utils/odata/odata'
import Utils from '../Process/utils'
import { addLocale } from 'umi';
import enUS from 'antd/es/locale/en_US';
import znCN from 'antd/es/locale/zh_CN';

/**
 * 获取manifest配置
 * @param {*} manifest 
 * @param {*} routeName 
 * @returns 
 */
const _getManifestConfig = () => {
    const { manifest, routeName, i18n_en, i18n_zh } = Utils.getUi5ConfigAsync()
    //国际化 CN 
    if (i18n_zh) {
        addLocale(
            'zh-CN',
            i18n_zh,
            {
                momentLocale: 'zh-cn',
                antd: znCN,
            },
        )
    }
    //国际化 US
    if (i18n_en) {
        addLocale(
            'en-US',
            i18n_en,
            {
                momentLocale: 'en-us',
                antd: enUS,
            },
        )
    }
    if (manifest) {
        const { dataSources } = manifest['sap.app']
        const { mainService } = dataSources
        const serviceUrl = mainService.uri.slice(1)
        window.serviceUrl = serviceUrl//设置当前应用请求地址
        const { options } = manifest['sap.ui5']['routing']['targets'][routeName]
        const { settings, } = options;
        const { entitySet } = settings;
        return {
            entitySet,
        }
    }
    return {}
}
/**
 * 获取字段数组
 * @param {*} data 
 * @returns 
 */
const getFieldArr = ({ HeaderInfo, Facets, HeaderFacets, HiddenPaths, Identification }) => {
    const result = [] as any

    if (HeaderInfo) {
        for (let key of Object.keys(HeaderInfo)) {
            if (HeaderInfo[key]) {
                const { type, Value } = HeaderInfo[key]
                if (type === 'UI.DataField' && Value) {
                    result.push(Value)
                }
            }
            if (key ==='ImageUrl') {
                result.push(HeaderInfo[key])
            }
        }
    }

    if (HiddenPaths) {
        result.push(...HiddenPaths)
    }

    const facetsData = [...Facets, ...HeaderFacets]
    if (facetsData) {
        const addValueToResult = (targetData) => {
            if (targetData) {
                const { facetType, Fields, value } = targetData
                if (facetType === 'UI.FieldGroup') {
                    for (let b of Fields) {
                        const { type, Value, Criticality, Url } = b
                        if (type === 'UI.DataField' && Value) {
                            Value && result.push(Value)
                            Criticality && result.push(Criticality)
                            Url && result.push(Url)
                        }
                        if (type === 'UI.DataFieldWithUrl' && Url && Value) {
                            Value && result.push(Value)
                            Url && result.push(Url)
                        }
                    }
                } else if (facetType === 'UI.DataPoint' && value) {
                    const { Value, Criticality } = value
                    Value && result.push(value.Value)
                    Criticality && result.push(Criticality)
                }
            }
        }

        for (let a of facetsData) {
            const { childfacets, targetData } = a
            if (childfacets) {
                for (let b of childfacets) {
                    const { targetData } = b
                    addValueToResult(targetData)
                }
            }
            addValueToResult(targetData)
        }
    }

    if (Identification) {
        for (let a of Identification) {
            const { hiddenPath } = a
            if (hiddenPath) {
                result.push(hiddenPath)
            }
        }
    }

    //数组去重
    result.filter((item, index, result) => {
        return result.indexOf(item) === index
    })

    console.log({ result, HeaderFacets, Facets, facetsData })
    return result
}

/**
 * 设置请求方法
 * @param {*} entitySet 
 * @param {*} queryEntity 
 * @param {*} fieldArr 
 * @returns 
 */
const _setRequest = (entitySet, queryEntity, fieldArr) => {
    const { currentSelect, currentExpand } = Utils.getQueryContitionsByAnnotations(
        fieldArr,
        entitySet
    );

    let option = {
        path: queryEntity,
        method: 'GET',
        headers: {},
        parameters: {},
    };
    if (currentSelect && currentSelect.length > 0) {
        option.parameters.$select = currentSelect.toString();
    }
    if (JSON.stringify(currentExpand) !== '{}') {
        option.parameters.$expand = currentExpand;
    }
    if (window['SAP-ContextId']) {
        option.headers['SAP-ContextId'] = window['SAP-ContextId']
    }
    //console.log({ option, entitySet, queryEntity, fieldArr })
    return async (params) => {
        if (params) {
            option.parameters = { ...option.parameters, ...params }
        }
        return await Odata.submit(option);
    }
}

/**
 * 解析Identification
 * UI.Identification
 * @param {object} currentAnnotations
 * @returns
 */
const getIdentificationByAnnotations = (currentAnnotations, currentRecord) => {
    const result = [] as any
    const annotation = Utils.getTermAnnotations(currentAnnotations, 'UI.Identification');
    if (annotation) {
        const { collection } = annotation
        for (let a of collection) {
            const { record } = a
            for (let b of record) {
                const { type, propertyValue, annotation: fieldannotation } = b
                const { SemanticObject, Action, Label } = Utils.parsePropertyValue(propertyValue)
                const obj = {
                    SemanticObject,
                    Action: Utils.parseActionByName(Action),
                    Label,
                    hiddenPath: null,
                    isHidden: null as any,
                    MediaUploadLink: null,
                    type,
                }
                //是否隐藏 是否是链接
                if (fieldannotation) {
                    const { hiddenPath, isHidden } = Utils.isHiddenByAnnotation(fieldannotation, currentRecord)
                    //console.log({ hiddenPath, isHidden, currentRecord, fieldannotation })
                    obj.hiddenPath = hiddenPath
                    obj.isHidden = isHidden
                    for (let c of fieldannotation) {
                        const { term } = c
                        if (term === 'Common.MediaUploadLink') {
                            obj.MediaUploadLink = Utils.getTextValueByData('string', c);
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
 * 解析objectPage headerInfo 注：目前只实现Title、Description
 * UI.HeaderInfo
 * @param {*} headerInfo 
 * @param {*} currentRecord 请求的数据
 * @param {*} entitySet
 * @returns 
 */
const getHeaderInfoOptions = (currentAnnotations) => {
    const headerInfo = Utils.getTermAnnotations(currentAnnotations, 'UI.HeaderInfo');
    if (headerInfo) {
        const { record } = headerInfo;
        for (let a of record) {
            const { propertyValue, type } = a;
            if (type === 'UI.HeaderInfoType') {
                return Utils.parsePropertyValue(propertyValue);
            }
        }
    }
};

export const getConfig = async ({ location, currentRecord }) => {
    const { queryEntity } = location?.query
    const { entitySet } = _getManifestConfig()
    const { currentAnnotations, currentEntitySetData, currentEntityTypeData } = Utils.getEntitySetConfig(entitySet)
    const HeaderInfo = getHeaderInfoOptions(currentAnnotations)
    const { Facets, HeaderFacets, HiddenPaths } = Utils.getObjectPageFacetsByAnnotations(currentAnnotations, currentEntitySetData, currentRecord)
    const Identification = getIdentificationByAnnotations(currentAnnotations, currentRecord)
    const annoRequest = _setRequest(entitySet, queryEntity, getFieldArr({ HeaderInfo, Facets, HeaderFacets, HiddenPaths, Identification }))
    const quickCreate = Utils.parseQuickCreateFacets(currentAnnotations, entitySet)

    //调试使用
    if (currentRecord) {
        console.log('ObjectPage-Log', {
            queryEntity,
            currentAnnotations,
            currentEntityTypeData,
            location,
            currentRecord,
            entitySet,
            HeaderInfo,
            Facets,
            HeaderFacets,
            annoRequest,
            Identification,
            quickCreate
        })
    }

    return {
        entitySet,
        HeaderInfo,//导航栏信息
        HeaderFacets,//头部构件
        Facets,//内容区构件
        annoRequest,//请求
        Identification,//头部按钮 [{Label:btnText/title,Fields:表单字段，annoRequest:提交请求（body）,isHidden:是否隐藏,type：表单提交类型}]
        quickCreate,//是否支持quickCreate
        currentEntityTypeData
    }
}