/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2022-09-19 14:59:09
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-09-27 17:02:18
 * @FilePath: /uilab-gbms/lib/o3smart-comp/Anotations/SmartTable.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

import Odata from '../../utils/odata/odata';
import storage from '../../utils/storage/metadataStorage'
import { getCurrentRouter } from '../../utils/util'
import {
    Other,
    Ui,
} from '../Process/index';
import CustomComponents from '../CustomComponents/index'

const {
    getTermData,
    parseDataByPath,
    getPrimaryKeys
} = Other
const {
    getQueryContitionsByAnnotations,
    getObjectPageSectionsByFacets,
    getHeaderInfoOptions,
    getIdentificationByAnnotations,
    isHiddenByAnnotation,
    parseQuickCreateFacets
} = Ui

/**
 * 根据annotation解析table所需要的数据结构配置项
 */
const ObjectPageConfig = {
    entitySet: null,
    navigation: null,
    autoRefresh: null,
    content: null,//自定义组件内容
    Facets: null,
    HeaderFacets: null,
    HeaderInfo: null,
    annoRequest: null,
    stickySession: null,
    Identification: null,
    editHidden: null,//禁止编辑
    editableHeaderContent: true,//根据minifest.json中配置头部是否可编辑
    QuickCreateFacets: null,
}

/**
 * 解析manifest
 * @returns 
 */
const _getManifestConfig = () => {
    let result = {}
    const { data } = storage.get(window.micrAppName)
    const { manifest } = data
    const { routeName } = getCurrentRouter()
    //console.log({data,manifest,routeName})
    if (routeName && manifest && manifest['sap.ui5']['routing']['targets'][routeName]) {
        const { options } = manifest['sap.ui5']['routing']['targets'][routeName]
        const { settings } = options;
        const { entitySet, views, navigation, autoRefresh, content, editableHeaderContent } = settings;

        //uilab 兼容
        if (!entitySet) {
            console.error(`uilab 当前路由：${routeName} 需要在manifest中配置对应的entitySet`);
        }

        result = {
            entitySet,
            views,
            navigation,
            autoRefresh,
            content,
            editableHeaderContent
        }
    }
    return result
}

//获取objectPage中所有需要请求的字段 
const getFieldArr = () => {
    const result = []
    ObjectPageConfig.Facets.fields.map((item) => {
        if (result.findIndex((d) => d === item) == -1) {
            result.push(item)
        }
    });
    ObjectPageConfig.Facets.chartFields.map((item) => {
        if (result.findIndex((d) => d === item) == -1) {
            result.push(item)
        }
    });
    ObjectPageConfig.Facets.hiddenPathArr.map((hiddenPath) => {
        if (result.findIndex((d) => d === hiddenPath) == -1) {
            result.push(hiddenPath)
        }
    });
    ObjectPageConfig.HeaderFacets.fields.map((item) => {
        if (result.findIndex((d) => d === item) == -1) {
            result.push(item)
        }
    });
    ObjectPageConfig.HeaderFacets.chartFields.map((item) => {
        if (result.findIndex((d) => d === item) == -1) {
            result.push(item)
        }
    });
    ObjectPageConfig.HeaderFacets.hiddenPathArr.map((hiddenPath) => {
        if (result.findIndex((d) => d === hiddenPath) == -1) {
            result.push(hiddenPath)
        }
    });
    if (ObjectPageConfig) {
        const { currentEntityTypeData, HeaderInfo } = ObjectPageConfig
        if (HeaderInfo) {
            for (let key of Object.keys(ObjectPageConfig.HeaderInfo)) {
                if (ObjectPageConfig.HeaderInfo[key]) {
                    const { path } = ObjectPageConfig.HeaderInfo[key]
                    //判断配置的字段是否在EntityType的property 中
                    if (path && currentEntityTypeData.property.findIndex((item) => item.name === path) !== -1) {
                        if (result.findIndex((d) => d === path) == -1) {
                            result.push(path)
                        }
                    }
                    //多段式 暂不支持检测EntityType的property 
                    if (path && path.search('/') !== -1) {
                        if (result.findIndex((d) => d === path) == -1) {
                            result.push(path)
                        }
                    }
                }
            }
        }
    }
    if (ObjectPageConfig.Identification) {
        ObjectPageConfig.Identification.map((item) => {
            const { hiddenPath } = item
            if (hiddenPath && result.findIndex((d) => d === hiddenPath) === -1) {
                result.push(hiddenPath)
            }
        })
    }
    if (ObjectPageConfig.editHiddenPath) {
        if (result.findIndex((d) => d === ObjectPageConfig.editHiddenPath) == -1) {
            result.push(ObjectPageConfig.editHiddenPath)
        }
    }
    //console.log({ result })
    return result
}

//设置请求
const _setRequest = (entitySet, queryEntity) => {
    const fieldArr = getFieldArr()
    const { currentSelect, currentExpand } = getQueryContitionsByAnnotations(
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
    return async (params) => {
        if (params) {
            option.parameters = { ...option.parameters, ...params }
        }
        return await Odata.submit(option);
    }
}

//拼接query path
const _getBatchPath = (params) => {
    const { entitySet, record, PrimaryKeys } = params
    let result, str = ''

    //判断是日期类型
    const _isDateTime = (name) => {
        return record[`${name}@odata.type`] === '#DateTimeOffset'
    }

    //判断是否为数字类型minimumOrderQuantity@odata.type:"#Decimal"
    const _isNumber = (name) => {
        return record[`${name}@odata.type`] === '#Decimal'
    }

    if (record && PrimaryKeys) {
        if (PrimaryKeys.length === 1) {
            str = `'${record[PrimaryKeys[0]]}'`
        } else {
            PrimaryKeys.map((name, index) => {

                let value
                //判断是否为日期格式
                if (_isDateTime(name)) {
                    value = `${record[name]}`
                    //处理  ： 转义为 %3A
                    value = value.replace(/(\:)/g, '%3A')
                } else if (_isNumber(name)) {
                    value = record[name]
                } else {
                    value = `'${record[name]}'`
                }

                //多组件拼接
                if (index === 0) {
                    str += `${name}=${value}`
                } else {
                    str += `,${name}=${value}`
                }
            })
        }
        result = `${entitySet}(${str})`
    } else {
        console.error('错误223===>', { entitySet, record, PrimaryKeys })
    }

    return result
}

//保存提交
const _save = (queryEntity, entitySet, currentStickySessionData) => {
    const { SaveAction } = currentStickySessionData;
    const fieldArr = getFieldArr()
    const { currentSelect, currentExpand } = getQueryContitionsByAnnotations(
        fieldArr,
        entitySet
    );

    let option = {
        path: `${queryEntity}/${SaveAction}`,
        method: 'POST',
        headers: {
            'SAP-ContextId': window['SAP-ContextId'],
        },
        parameters: {},
        body: {},
    };

    if (currentSelect && currentSelect.length > 0) {
        option.parameters.$select = currentSelect.toString();
    }
    if (JSON.stringify(currentExpand) !== '{}') {
        option.parameters.$expand = currentExpand;
    }

    return async (params) => {
        if (params) {
            option.parameters = { ...option.parameters, ...params }
        }
        const result = await Odata.submit(option)
        if (result) {
            if (window['SAP-ContextId']) {
                window['SAP-ContextId'] = null
            }
            return result;
        }
    }
};

//编辑提交
const _edit = (queryEntity, entitySet, currentStickySessionData) => {
    const { EditAction } = currentStickySessionData;

    const fieldArr = getFieldArr()
    const { currentSelect, currentExpand } = getQueryContitionsByAnnotations(
        fieldArr,
        entitySet
    );

    let option = {
        path: `${queryEntity}/${EditAction}`,
        method: 'POST',
        parameters: {},
        body: {},
    };

    if (currentSelect && currentSelect.length > 0) {
        option.parameters.$select = currentSelect.toString();
    }
    if (JSON.stringify(currentExpand) !== '{}') {
        option.parameters.$expand = currentExpand;
    }

    return async (params) => {
        if (params) {
            option.parameters = { ...option.parameters, ...params }
        }
        const result = await Odata.submit(option)
        if (result) {
            const { headers } = result

            //全局保存action 返回的SAP-ContextId
            if (headers && headers['SAP-ContextId']) {
                window['SAP-ContextId'] = headers['SAP-ContextId']
            }

            return result;
        }
    }
};

//更新提交
const _patch = () => {
    return async (params) => {
        const { path, value, record, queryEntity, entitySet, PrimaryKeys } = params
        //console.log({ path, value, record, queryEntity, entitySet, PrimaryKeys })
        //处理请求 是否为关联对象
        let batchPath, bodyPath
        if (entitySet) {
            if (path.search('/') !== -1) {
                const arr = path.split('/')
                //2层1主键
                if (arr.length === 2) {
                    batchPath = _getBatchPath({ entitySet, record: record[arr[0]], PrimaryKeys })
                    bodyPath = arr[1]
                }
            } else {
                batchPath = _getBatchPath({ entitySet, record, PrimaryKeys })
                bodyPath = path
            }
        } else {
            if (path.search('/') !== -1) {
                const arr = path.split('/')
                //2层1主键 **
                if (arr.length === 2) {
                    batchPath = entitySet ? _getBatchPath({ entitySet, record: record[arr[0]], PrimaryKeys }) : null
                    bodyPath = arr[1]
                }
            } else {
                batchPath = queryEntity
                bodyPath = path
            }
        }

        //请求参数
        if (batchPath) {
            let option = {
                path: batchPath,
                method: 'PATCH',
                headers: {
                    'SAP-ContextId': window['SAP-ContextId'],
                },
                body: {
                    [bodyPath]: value
                },
            };
            return await Odata.submit(option);
        }
    }
}

//添加关联对象数据
const _add = () => {
    return async (path) => {
        //请求参数
        let option = {
            path,
            method: 'POST',
            headers: {
                'SAP-ContextId': window['SAP-ContextId'],
            },
            body: {},
        };
        return await Odata.submit(option);
    }
}

//删除关联对象数据
const _delete = () => {
    return async (params) => {
        const { data, entitySet, PrimaryKeys } = params
        const optionArr = [];
        data.map((item) => {
            const batch = _getBatchPath({ record: item, entitySet, PrimaryKeys })
            let option = {
                path: batch,
                method: 'DELETE',
                headers: {
                    'SAP-ContextId': window['SAP-ContextId'],
                },
                body: {},
            };
            optionArr.push(option);
        });
        return await Odata.submit(optionArr);
    }
}

//销毁stickSesstion
const _discard = (currentStickySessionData) => {
    const { DiscardAction } = currentStickySessionData
    let option = {
        path: DiscardAction,
        method: 'POST',
        headers: {
            'SAP-ContextId': window['SAP-ContextId'],
        },
        body: {},
    };

    return async (params) => {
        if (params) {
            option.parameters = { ...option.parameters, ...params }
        }
        if (window['SAP-ContextId']) {
            window['SAP-ContextId'] = null
        }
        return await Odata.submit(option);
    }
};

//解析custom components
const _getCustomComponnets = (customConfig) => {
    const result = {
        header: null,
        body: null
    }

    const { body } = customConfig
    //body
    if (body) {
        const { sections } = body
        for (let key of Object.keys(sections)) {
            const { name } = sections[key]
            if (CustomComponents[name]) {
                sections[key].component = CustomComponents[name]
            }
        }
        result.body = body
    }
    return result
}

//设置是否编辑
const _setEditHidden = (currentAnnotations, currentRecord) => {
    const { hiddenPath, isHidden } = isHiddenByAnnotation(currentAnnotations, currentRecord, 'UI.UpdateHidden')
    ObjectPageConfig.editHiddenPath = hiddenPath
    //console.log({ currentRecord, hiddenPath, isHidden })
    return isHidden
}

/**
 * 解析入口
 */
const getConfig = (params) => {
    const { queryEntity, currentRecord, sendEntitySet } = params
    const { entitySet, navigation, autoRefresh, content, editableHeaderContent } = _getManifestConfig()
    ObjectPageConfig.entitySet = entitySet
    ObjectPageConfig.navigation = navigation
    ObjectPageConfig.autoRefresh = autoRefresh
    ObjectPageConfig.content = content && _getCustomComponnets(content)
    ObjectPageConfig.editableHeaderContent = editableHeaderContent

    const { currentAnnotations, currentEntityTypeName, currentEntitySetData, currentStickySessionData, currentEntityTypeData } = parseDataByPath(sendEntitySet ? sendEntitySet : entitySet)
    ObjectPageConfig.currentEntityTypeData = currentEntityTypeData
    const facets = getTermData(currentAnnotations, 'UI.Facets');
    const headerFacets = getTermData(currentAnnotations, 'UI.HeaderFacets');
    const headerInfo = getTermData(currentAnnotations, 'UI.HeaderInfo');

    ObjectPageConfig.Facets = getObjectPageSectionsByFacets(facets, currentAnnotations, currentEntityTypeName, currentEntitySetData, currentRecord, true)
    ObjectPageConfig.HeaderFacets = getObjectPageSectionsByFacets(headerFacets, currentAnnotations, currentEntityTypeName, currentEntitySetData, currentRecord, false)
    ObjectPageConfig.HeaderInfo = getHeaderInfoOptions(headerInfo, currentRecord, sendEntitySet ? sendEntitySet : entitySet)
    ObjectPageConfig.PrimaryKeys = currentEntityTypeData && getPrimaryKeys(currentEntityTypeData)
    ObjectPageConfig.Identification = getIdentificationByAnnotations(currentAnnotations, currentRecord)
    ObjectPageConfig.editHidden = _setEditHidden(currentAnnotations, currentRecord)
    ObjectPageConfig.annoRequest = _setRequest(sendEntitySet ? sendEntitySet : entitySet, queryEntity)
    ObjectPageConfig.QuickCreateFacets = parseQuickCreateFacets(currentAnnotations, sendEntitySet ? sendEntitySet : entitySet)

    if (currentStickySessionData) {
        ObjectPageConfig.stickySession = currentStickySessionData
        ObjectPageConfig.save = _save(queryEntity, entitySet, currentStickySessionData)
        ObjectPageConfig.discard = _discard(currentStickySessionData)
        ObjectPageConfig.edit = _edit(queryEntity, entitySet, currentStickySessionData)
        ObjectPageConfig.patch = _patch()
        ObjectPageConfig.add = _add()
        ObjectPageConfig.delete = _delete()
    }

    console.log({ ObjectPageConfig, currentAnnotations })
    return ObjectPageConfig
}

export {
    getConfig
}