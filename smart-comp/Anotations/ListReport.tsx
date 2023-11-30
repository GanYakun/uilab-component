/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2022-09-19 14:59:09
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-11-30 12:27:38
 * @FilePath: /uilab-gbms/lib/o3smart-comp/Anotations/SmartTable.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

import Utils from '../Process/utils'
import { addLocale, getLocale } from 'umi';
import Odata from '../../utils/odata/odata'
import enUS from 'antd/es/locale/en_US';
import znCN from 'antd/es/locale/zh_CN';

/**
 * 获取manifest配置
 * @param {*} manifest 
 * @param {*} routeName 
 * @returns 
 */
const _getManifestConfig = async () => {
    const { manifest, routeName, i18n_en, i18n_zh, i18n } = await Utils.getUi5Config(true)
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
    if (manifest && routeName) {
        const { id, dataSources } = manifest['sap.app']
        const { annotation, mainService } = dataSources
        const serviceUrl = mainService.uri.slice(1)
        window.serviceUrl = serviceUrl//设置当前应用请求地址
        const { options, name, controlAggregation } = manifest['sap.ui5']['routing']['targets'][routeName]
        const { settings, } = options;
        const { entitySet, views, navigation, autoRefresh } = settings;
        //设置跳转
        let routing = manifest['sap.ui5']['routing'], navigationRoute
        if (routing && name === 'sap.fe.templates.ListReport') {
            const { routes, targets } = routing
            const targetRoute = targets[routeName]?.options?.settings?.navigation[entitySet]?.detail?.route
            navigationRoute = targetRoute
        }
        return {
            entitySet,
            views,
            navigation,
            autoRefresh,
            pageName: name,
            controlAggregation,
            id,
            navigationRoute
        }
    }
    return {}
}

/**
 * 获取tabs配置
 * @param {*} views 
 * @param {*} currentAnnotations 
 * @param {*} currentEntityTypeData 
 * @returns 
 */
const _setTabs = (views, currentAnnotations, currentEntityTypeData) => {
    let tabs: any[] = [], showCounts = false
    if (views) {
        const { paths } = views
        showCounts = views.showCounts
        const findAnnotation = (term, qualifier, key) => {
            switch (term) {
                case 'com.sap.vocabularies.UI.v1.PresentationVariant':
                    const PresentationVariantIdx = currentAnnotations.findIndex((item) => {
                        const { qualifier: currentQualifier, term } = item
                        return currentQualifier === qualifier && term === 'UI.PresentationVariant'
                    })
                    const PresentationVariantResult = Utils.getPresentationVariantByAnnotations(currentAnnotations[PresentationVariantIdx])
                    console.log({ PresentationVariantResult })
                    tabs.push({ Presentation: { ...PresentationVariantResult, } })
                    break;
                case 'com.sap.vocabularies.UI.v1.SelectionPresentationVariant':
                    const SelectionPresentationVariantIdx = currentAnnotations.findIndex((item) => {
                        const { qualifier: currentQualifier, term } = item
                        return currentQualifier === qualifier && term === 'UI.SelectionPresentationVariant'
                    })
                    const { Presentation, Selection, Text } = Utils.getSelectionPresentationVariantByAnnotations(currentAnnotations[SelectionPresentationVariantIdx], currentEntityTypeData)
                    tabs.push({ Presentation, Selection, Text })
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
    }
    return {
        tabs,
        showCounts
    }
}

//设置请求
const _setRequest = (entitySet, tabs) => {
    const batchArr = [] as any
    if (Array.isArray(tabs)) {
        tabs.map((item) => {
            const { Selection } = item
            let option = {
                path: entitySet,
                method: 'GET',
                parameters: {
                    $top: 1,
                    $skip: 0,
                    $count: true
                } as any,
            };
            if (Selection && Selection.filter) {
                option.parameters.$filter = Selection.filter
            }
            batchArr.push(option)
        })
    }
    return async () => await Odata.submit(batchArr);
}

export const getConfig = async () => {
    const { entitySet, navigationRoute, views } = await _getManifestConfig()
    const { currentAnnotations, currentEntityTypeData } = Utils.getEntitySetConfig(entitySet)
    const { tabs, showCounts } = _setTabs(views, currentAnnotations, currentEntityTypeData)
    const annoRequest = _setRequest(entitySet, tabs)
    console.log('ListReport-Log', {
        currentAnnotations,
        currentEntityTypeData,
        entitySet,
        tabs,
        showCounts,
        navigationRoute,
        annoRequest,
        views,
        getLocale: getLocale()
    })
    return {
        entitySet,
        tabs,//tabs配置 1.Text tab名字 2.Selection.filter 当前tab对应的table的默认过滤条件
        showCounts,//是否显示tab内table的行数
        navigationRoute,
        annoRequest
    }
}