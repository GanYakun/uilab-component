/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2022-09-19 14:59:09
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-02-02 11:35:46
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
    parseDataByPath,
    getTermData
} = Other
const {
    parseLineItem,
    getQueryContitionsByAnnotations
} = Ui

/**
 * 根据annotation解析table所需要的数据结构配置项
 */
const OverviewPageConfig = {
    Ovp: null,//manifest中的sap.ovp设置
    annoRequest: null
}

/**
 * 解析manifest
 * @returns 
 */
const _getManifestConfig = () => {
    let result = {
        Ovp: null,
        appId: null,
        entitySet: null
    }
    const { data } = storage.get(window.micrAppName)
    const { manifest } = data
    const { routeName } = getCurrentRouter()
    if (manifest && manifest['sap.ovp']) {
        result.Ovp = manifest['sap.ovp']

    }
    if (manifest && manifest["sap.app"]) {
        const { id } = manifest["sap.app"]
        result.appId = id
    }
    return result
}

//设置请求
const _setRequest = (Ovp, currentAnnotations) => {
    return async (params) => {
        const batchArr = [], batchKeys = []
        const { cards } = Ovp
        for (let key of Object.keys(cards)) {
            const { template, settings } = cards[key]
            if (template === 'sap.ovp.cards.v4.list' || template === 'sap.ovp.cards.v4.table') {
                const { entitySet, sortBy, sortOrder, defaultSpan, annotationPath, tabs } = settings
                let qualifier
                if (annotationPath) {
                    const arr = annotationPath.split('#')
                    qualifier = arr[arr.length - 1]
                } else if (tabs) {
                    const arr = tabs[0].annotationPath.split('#')
                    qualifier = arr[arr.length - 1]
                }
                const LineItemData = getTermData(currentAnnotations, 'UI.LineItem', qualifier)
                const { columns } = parseLineItem(LineItemData, entitySet)

                //添加要查询的字段
                const fieldArr = []
                columns.map((item) => {
                    const { path, type, value, show } = item
                    switch (type) {
                        case 'UI.DataField':
                            show === true && fieldArr.push(path)
                            break;
                        case 'UI.DataPoint':
                            fieldArr.push(value.Value)
                            break;
                        case 'UI.DataFieldWithNavigationPath':
                            fieldArr.push(path)
                            break;
                        default:
                            break;
                    }
                })

                const option = {
                    path: entitySet,
                    method: 'GET',
                    parameters: {
                        $count: true,
                        $top: 5
                    },
                }

                //$top
                if (defaultSpan && defaultSpan.rows) {
                    const { rows } = defaultSpan
                    option.parameters.$top = rows
                }

                //获取查询条件
                const { currentExpand, currentSelect } = getQueryContitionsByAnnotations(
                    fieldArr, entitySet
                );
                if (currentSelect && currentSelect.length > 0) {
                    option.parameters.$select = currentSelect.toString();
                }
                if (JSON.stringify(currentExpand) !== '{}') {
                    option.parameters.$expand = currentExpand;
                }

                //默认排序
                if (sortBy) {
                    const sortTarget = sortOrder && sortOrder === 'descending' ? 'desc' : 'asc'
                    option.parameters.$orderby = `${sortBy} ${sortTarget}`;
                }
                batchKeys.push({ key, columns, tabs })
                batchArr.push(option)
            }
        }
        const result = await Odata.submit(batchArr)
        const resulrMap = {}
        batchKeys.map((item, index) => {
            const { key, columns, tabs } = item
            resulrMap[key] = {
                columns,
                tabs,
                data: result[index]
            }
        })
        console.log({ Ovp, batchArr, result, resulrMap })
        return resulrMap
    }
}

/**
 * 解析入口
 */
const getConfig = () => {
    const { Ovp, appId } = _getManifestConfig()
    const { globalFilterEntityType } = Ovp
    OverviewPageConfig.entitySet = globalFilterEntityType
    const { currentAnnotations, currentEntityTypeData } = parseDataByPath(globalFilterEntityType)
    OverviewPageConfig.Ovp = Ovp
    OverviewPageConfig.appId = appId
    OverviewPageConfig.annoRequest = _setRequest(Ovp, currentAnnotations)
    console.log({ OverviewPageConfig, currentAnnotations })
    return OverviewPageConfig
}

export {
    getConfig
}