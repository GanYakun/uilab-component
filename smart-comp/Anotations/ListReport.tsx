/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2022-09-19 14:59:09
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-11-23 10:44:15
 * @FilePath: /uilab-gbms/lib/o3smart-comp/Anotations/SmartTable.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

import Utils from '../Process/utils'

/**
 * 根据annotation解析table所需要的数据结构配置项
 */
let ListReportConfig = {
    entitySet: null,
    tabs: [],
    annoRequest: null,
    showCounts: null,
    navigation: null,
    autoRefresh: null,
    pageName: null,
    getVariantConfig: null,
}

/**
 * 获取manifest配置
 * @param {*} manifest 
 * @param {*} routeName 
 * @returns 
 */
const _getManifestConfig = async () => {
    const { manifest, routeName } = await Utils.getUi5Config()
    if (manifest) {
        const { id, dataSources } = manifest['sap.app']
        const { annotation, mainService } = dataSources
        const serviceUrl = mainService.uri.slice(1)
        window.serviceUrl = serviceUrl//设置当前应用请求地址
        const { options, name, controlAggregation } = manifest['sap.ui5']['routing']['targets'][routeName]
        const { settings, } = options;
        const { entitySet, views, navigation, autoRefresh } = settings;
        return {
            entitySet,
            views,
            navigation,
            autoRefresh,
            pageName: name,
            controlAggregation,
            id
        }
    }
}

/**
 * 获取tabs配置
 * @param {*} views 
 * @param {*} currentAnnotations 
 * @param {*} currentEntityTypeData 
 * @returns 
 */
const _setTabs = (views, currentAnnotations, currentEntityTypeData) => {
    const { paths, showCounts } = views
    ListReportConfig.showCounts = showCounts
    const tabsArr = []
    const findAnnotation = (term, qualifier, key) => {

        switch (term) {
            case 'com.sap.vocabularies.UI.v1.PresentationVariant':
                const PresentationVariantIdx = currentAnnotations.findIndex((item) => {
                    const { qualifier: currentQualifier, term } = item
                    return currentQualifier === qualifier && term === 'UI.PresentationVariant'
                })
                const PresentationVariantResult = getPresentationVariantByAnnotations(currentAnnotations[PresentationVariantIdx], currentEntityTypeData)
                tabsArr.push({ Presentation: { ...PresentationVariantResult, key } })
                break;
            case 'com.sap.vocabularies.UI.v1.SelectionPresentationVariant':
                const SelectionPresentationVariantIdx = currentAnnotations.findIndex((item) => {
                    const { qualifier: currentQualifier, term } = item
                    return currentQualifier === qualifier && term === 'UI.SelectionPresentationVariant'
                })
                const SelectionPresentationVariantResult = getSelectionPresentationVariantByAnnotations(currentAnnotations[SelectionPresentationVariantIdx], currentEntityTypeData)
                tabsArr.push({ ...SelectionPresentationVariantResult, key })
                break;
            default:
                break;
        }
    }

    for (let a of paths) {
        const { key, annotationPath } = a
        const arr = annotationPath.split('#')
        findAnnotation(arr[0], arr[1], key)
    }

    return tabsArr
}

const getConfig = async () => {
    ListReportConfig = { ...ListReportConfig, ...await _getManifestConfig() }
    const { currentAnnotations, currentEntityTypeData } = await Utils.getEntitySetConfig(ListReportConfig.entitySet)
    // if (ListReportConfig.views) {
    //     ListReportConfig.tabs = _setTabs(ListReportConfig.views, currentAnnotations, currentEntityTypeData)
    // }
    //console.log({ ListReportConfig, currentAnnotations, currentEntityTypeData })
    return ListReportConfig
}

export {
    getConfig
}