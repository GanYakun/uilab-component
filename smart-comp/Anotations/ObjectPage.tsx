/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2022-09-19 14:59:09
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-12-22 10:48:01
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
const _getManifestConfig = async () => {
    const { manifest, goupName, routeName, i18n_en, i18n_zh } = await Utils.getUi5Config()
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
            goupName,
            routeName
        }
    }
    return {}
}
/**
 * 获取字段数组
 * @param {*} data 
 * @returns 
 */
const getFieldArr = ({ HeaderInfo, Facets, HeaderFacets, HiddenPaths, Identification }: any) => {
    const result = [] as any

    if (HeaderInfo) {
        for (let key of Object.keys(HeaderInfo)) {
            if (HeaderInfo[key]) {
                const { type, Value } = HeaderInfo[key]
                if (type === 'UI.DataField' && Value) {
                    result.push(Value)
                }
            }
            if (key === 'ImageUrl') {
                result.push(HeaderInfo[key])
            }
        }
    }

    if (HiddenPaths) {
        result.push(...HiddenPaths)
    }

    const facetsData = [...Facets, ...HeaderFacets]
    if (facetsData) {
        const addValueToResult = (targetData: { facetType: any; Fields: any; value: any; }) => {
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
    result.filter((item: any, index: any, result: string | any[]) => {
        return result.indexOf(item) === index
    })

    return result
}

/**
 * 设置请求方法
 * @param {*} entitySet 
 * @param {*} queryEntity 
 * @param {*} fieldArr 
 * @returns 
 */
const _setRequest = (entitySet: any, queryEntity: any, fieldArr: any) => {
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
    return async (params: {}) => {
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
const getIdentificationByAnnotations = (currentAnnotations: any, currentRecord: any) => {
    const result = [] as any
    const annotation = Utils.getTermAnnotations(currentAnnotations, 'UI.Identification');
    if (annotation) {
        const { collection } = annotation
        for (let a of collection) {
            const { record } = a
            for (let b of record) {
                const { type, propertyValue, annotation: fieldannotation } = b
                const { SemanticObject, Action, Label, IconUrl } = Utils.parsePropertyValue(propertyValue)
                const obj = {
                    SemanticObject,
                    Action: Utils.parseActionByName(Action),
                    Label,
                    IconUrl,
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
const getHeaderInfoOptions = (currentAnnotations: any) => {
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
    return false
};

const _formRequest = (entitySet: any) => {

    function assiginObj(target = {}, sources = {}) {
        let obj = target;
        if (typeof target != 'object' || typeof sources != 'object') {
            return sources; // 如果其中一个不是对象 就返回sources
        }
        for (let key in sources) {
            // 如果target也存在 那就再次合并
            if (target.hasOwnProperty(key)) {
                obj[key] = assiginObj(target[key], sources[key]);
            } else {
                // 不存在就直接添加
                obj[key] = sources[key];
            }
        }
        return obj;
    }


    const _getCurrentBody = (body: any) => {
        let result = {}
        for (let key of Object.keys(body)) {
            if (key.search('/') === -1) {
                result[key] = body[key]
            } else {
                const arr = key.split('/')
                let obj = {};
                let currentObj = obj;
                for (let i = 0; i < arr.length; i++) {
                    let key1 = arr[i];
                    if (i === arr.length - 1) {
                        currentObj[key1] = body[key]; 
                    } else {
                        currentObj[key1] = {};
                        currentObj = currentObj[key1];
                    }
                }
                result = assiginObj(result, obj)
            }
        }
        return result
    }

    return {
        post: async ({ body = {}, queryEntity = null, targetNavigation = null }) => {
            let path = entitySet
            if (queryEntity) {
                if (targetNavigation) {
                    path = `${queryEntity}/${targetNavigation}`
                } else {
                    path = `${queryEntity}`
                }
            }
            let option = {
                path: path,
                method: 'POST',
                body: _getCurrentBody(body),
            };
            return await Odata.submit(option);
        },
        patch: async (record:any, body: any) => {
            let option = {
                path: record['@odata.id'],
                method: 'PATCH',
                body: _getCurrentBody(body),
            };
            console.log({ option })
            //return await Odata.submit(option);
        },
        delete: async (record: any) => {
            let option = {
                path: record['@Odata.id'],
                method: 'DELETE',
                body: {},
            };
            return await Odata.submit(option);
        }
    }
}

export const getConfig = async (props: any) => {
    const { location, currentRecord } = props
    const { queryEntity } = location?.query
    const { entitySet, goupName, routeName } = await _getManifestConfig()
    const { currentAnnotations, currentEntitySetData, currentEntityTypeData, currentStickySessionData } = Utils.getEntitySetConfig(entitySet)
    const HeaderInfo = getHeaderInfoOptions(currentAnnotations)
    const { Facets, HeaderFacets, HiddenPaths } = Utils.getObjectPageFacetsByAnnotations(currentAnnotations, currentEntitySetData, currentRecord)
    const Identification = getIdentificationByAnnotations(currentAnnotations, currentRecord)
    const annoRequest = _setRequest(entitySet, queryEntity, getFieldArr({ HeaderInfo, Facets, HeaderFacets, HiddenPaths, Identification }))
    const quickCreate = Utils.parseQuickCreateFacets(currentAnnotations, entitySet)
    const formRequest = _formRequest(entitySet)

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
            quickCreate,
            goupName,
            routeName,
            currentStickySessionData,
            formRequest
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
        currentEntityTypeData,
        goupName,
        routeName,
        currentStickySessionData,
        formRequest
    }
}