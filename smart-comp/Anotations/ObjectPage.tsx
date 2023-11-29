/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2022-09-19 14:59:09
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-11-29 17:06:49
 * @FilePath: /uilab-gbms/lib/o3smart-comp/Anotations/SmartTable.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

import Odata from '../../utils/odata/odata'
import Utils from '../Process/utils'

/**
 * 获取manifest配置
 * @param {*} manifest 
 * @param {*} routeName 
 * @returns 
 */
const _getManifestConfig = () => {
    const { manifest, routeName } = Utils.getUi5ConfigAsync()
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
//获取objectPage中所有需要请求的字段 
const getFieldArr = ({ HeaderInfo, Facets, HeaderFacets }) => {
    const result = [] as any

    if (HeaderInfo) {
        for (let key of Object.keys(HeaderInfo)) {
            if (HeaderInfo[key]) {
                const { type, Value } = HeaderInfo[key]
                if (type === 'UI.DataField' && Value) {
                    result.push(Value)
                }
            }
        }
    }

    const facetsData = [...Facets, ...HeaderFacets]
    if (facetsData) {
        for (let a of facetsData) {
            if (a?.targetData) {
                const { facetType, Fields } = a?.targetData
                if (facetType === 'UI.FieldGroup') {
                    for (let b of Fields) {
                        const { type, Value } = b
                        if (type === 'UI.DataField' && Value) {
                            result.push(Value)
                        }
                    }
                }
            }
        }
    }

    //数组去重
    result.filter((item, index, result) => {
        return result.indexOf(item) === index
    })
    return result
}

//设置请求
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
    console.log({ option, entitySet, queryEntity, fieldArr })
    return async (params) => {
        if (params) {
            option.parameters = { ...option.parameters, ...params }
        }
        return await Odata.submit(option);
    }
}

export const getConfig = async ({ location }) => {
    const { queryEntity } = location?.query
    const { entitySet } = _getManifestConfig()
    const { currentAnnotations, currentEntitySetData, currentEntityTypeData } = Utils.getEntitySetConfig(entitySet)
    const HeaderInfo = Utils.getHeaderInfoOptions(currentAnnotations)
    const { Facets, HeaderFacets } = Utils.getObjectPageFacetsByAnnotations(currentAnnotations, currentEntitySetData)
    const annoRequest = _setRequest(entitySet, queryEntity, getFieldArr({ HeaderInfo, Facets, HeaderFacets }))
    console.log('ObjectPage-Log', {
        queryEntity,
        currentAnnotations,
        currentEntityTypeData,
        location,
        entitySet,
        HeaderInfo,
        Facets,
        HeaderFacets,
        annoRequest
    })
    return {
        entitySet,
        HeaderInfo,//导航栏信息
        HeaderFacets,//头部构件
        Facets,//内容区构件
        annoRequest,//请求
    }
}