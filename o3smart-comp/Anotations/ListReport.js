/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2022-09-19 14:59:09
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2022-12-29 14:28:09
 * @FilePath: /uilab-gbms/lib/o3smart-comp/Anotations/SmartTable.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {
    Other,
    Ui,
} from '../Process/index';
import Odata from '../../utils/odata/odata';
import storage from '../../utils/storage/metadataStorage'
import { getCurrentRouter } from '../../utils/util'

const {
    parseDataByPath
} = Other
const {
    getPresentationVariantByAnnotations,
    getSelectionPresentationVariantByAnnotations
} = Ui

/**
 * 根据annotation解析table所需要的数据结构配置项
 */
const ListReportConfig = {
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
 * 解析manifest
 * @returns 
 */
const _getManifestConfig = () => {
    let result
    const { data } = storage.get(window.micrAppName)
    const { manifest } = data
    const { routeName } = getCurrentRouter()

    if (routeName && manifest) {
        const { options, name, controlAggregation } = manifest['sap.ui5']['routing']['targets'][routeName]
        const { id } = manifest["sap.app"]
        const { settings, } = options;
        const { entitySet, views, navigation, autoRefresh } = settings;
        result = {
            entitySet,
            views,
            navigation,
            autoRefresh,
            pageName: name,
            controlAggregation,
            id
        }
    }
    return result
}

//设置tabs
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

//设置请求
const _setRequest = (entitySet) => {
    const batchArr = []
    ListReportConfig.tabs.map((item) => {
        const { Selection } = item
        let option = {
            path: entitySet,
            method: 'GET',
            parameters: {
                $top: 1,
                $skip: 0,
                $count: true
            },
        };
        if (Selection && Selection.filter) {
            option.parameters.$filter = Selection.filter
        }
        batchArr.push(option)
    })
    return async () => await Odata.submit(batchArr);
}

/**
 * 解析入口
 */
const getConfig = (params) => {
    const { entitySet, views, navigation, autoRefresh, pageName, controlAggregation, id } = _getManifestConfig()
    ListReportConfig.entitySet = entitySet
    ListReportConfig.navigation = navigation
    ListReportConfig.autoRefresh = autoRefresh
    ListReportConfig.pageName = pageName
    ListReportConfig.controlAggregation = controlAggregation
    ListReportConfig.appId = id

    const { currentAnnotations, currentEntityTypeData } = parseDataByPath(entitySet)
    if (views) {
        ListReportConfig.tabs = _setTabs(views, currentAnnotations, currentEntityTypeData)
        ListReportConfig.annoRequest = _setRequest(entitySet)
    }
    //console.log({ ListReportConfig, entitySet })
    return ListReportConfig
}

export {
    getConfig
}