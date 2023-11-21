/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2023-11-20 12:24:40
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-11-21 17:28:52
 * @FilePath: /Uilab-Application/lib/Uilab-Comp/smart-comp/Process/utils.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import odatajs from '../../utils/odata/index';
import odata from '../../utils/odata/odata';
import { message } from 'antd';
import storage from '../../utils/storage/metadataStorage';
import Utils from '../Process/utils'

/**
 * 获取当前路由名称
 */
const getRouteName = () => {
    const href = window.location.href;
    const hrefArr = href.split('/');
    if (hrefArr.length > 1) {
        const path = hrefArr[hrefArr.length - 1];
        const appName = hrefArr[hrefArr.length - 2]
        const routeArr = path.split('?');
        const routeName = routeArr[0]
        return { appName, routeName };
    }
    return false
}

/**
 * 获取ui5配置
 */
const getUi5Config = async () => {
    const { appName, routeName } = Utils.getRouteName()

    //是否已有缓存
    if (storage.get(appName)) {
        const { data } = storage.get(appName)
        if (data) {
            return data
        }
    }

    const url = {
        manifestUrl: `/Ui5/${appName}/webapp/manifest.json`,
        annotationUrl: `/Ui5/${appName}/webapp/annotations/annotation.xml`,
        i18nUrl: `/Ui5/${appName}/webapp/i18n/i18n.properties`,
    }

    const manifest = JSON.parse(await getXmlDoc(url.manifestUrl))
    const annotations = odatajs.oData.metadata.metadataParser(
        null,
        await getXmlDoc(url.annotationUrl)
    )
    const i18n = await getI18nJson(url.i18nUrl)
    const requestUri = manifest['sap.app'].dataSources.mainService.uri
    const metadata = await getMetadata(requestUri)

    //合并annotations
    if (annotations && annotations.dataServices) {
        metadata.dataServices.schema[0].annotations = metadata.dataServices.schema[0].annotations ? metadata.dataServices.schema[0].annotations : []
        metadata.dataServices.schema[0].annotations = annotations.dataServices.schema[0].annotations ? metadata.dataServices.schema[0].annotations.concat(annotations.dataServices.schema[0].annotations) : metadata.dataServices.schema[0].annotations
    }

    const result = {
        manifest,
        annotations,
        i18n,
        metadata,
        routeName,
        appName
    }
    storage.set(appName, result)
    return result
}

/**
 * 获取xml文档
 * @param {string} path xml文档路径
 */
const getXmlDoc = async (path) => {
    return new Promise((resolve, reject) => {
        let oReq = new XMLHttpRequest();
        oReq.open('GET', path);
        oReq.send();
        oReq.onload = function () {
            if (oReq.readyState === oReq.DONE) {
                if (oReq.status === 200) {
                    resolve(oReq.responseText);
                }
            } else {
                reject(false);
            }
        };
    });
};

/**
 * 获取I18n配置文件
 * @param {string} path 
 * @returns 
 */
const getI18nJson = async (i18nUrl) => {
    const i18nJson = {}
    let i18nData = await getXmlDoc(i18nUrl)
    let resArr = i18nData.split('\n')
    for (let item of resArr) {
        if (item.search('=') !== -1) {
            const arr = item.split('=')
            if (arr.length === 2) {
                i18nJson[`{@i18n>${arr[0]}}`] = arr[1]
            }
        }
    }
    return i18nJson
}

/**
 * 获取metadata对象，兼容浏览器
 * @param {string} path 
 * @returns 
 */
const getMetadata = async (url) => {
    //url去掉第一个/
    if (url.startsWith('/')) {
        url = url.slice(1)
    }

    const loginPath = '/user/login';
    const options = {
        path: `${url}$metadata`,
        parameters: {},
    };
    const result = await odata.read(options, odatajs.oData.metadataHandler);
    if (result) {
        message.destroy()
        const { data, statusCode } = result
        if (statusCode < 300) {
            return data
        } else if (statusCode === 401) {
            window.history.pushState(null, '', `${loginPath}`)
            message.open({
                type: 'error',
                content: '登录状态失效，请重新登录!',
            });
        } else {
            window.history.pushState(null, '', `${loginPath}`)
            message.open({
                type: 'error',
                content: `服务器请求异常，状态码:${statusCode}`,
            });
        }
    }
}

/**
 * 获取entitySet配置
 * @param {string} currentEntitySetName 
 * @param {object} metadata 
 */
const getEntitySetConfig = async (currentEntitySetName, currentPath, ActionName) => {
    const { metadata } = await Utils.getUi5Config()

    const { namespace, entityContainer, annotations, entityType: allEntityTypes } = metadata.dataServices.schema[0];
    let result = {
        currentEntitySetName,
        currentEntitySetData: null,
        currentEntityTypeName: null,
        currentEntityTypeData: null,
        currentPropertyType: null,
        currentAnnotations: null,
        currentStickySessionData: null,
        currentSortRestrictions: null
    };

    //查找主对象的entityType
    const { entitySet } = entityContainer
    let currentEntityTypeName, currentEntitySetData
    entitySet.map((item) => {
        const { name, entityType } = item
        if (name === currentEntitySetName) {
            const arr = entityType.split('.')
            currentEntityTypeName = arr[arr.length - 1]
            currentEntitySetData = item
        }
    })

    //递归处理 查找annotation等页面需要的配置文件
    const _nbff = (arr) => {
        let index = 0
        function query(currentEntityTypeName, navigationPropertyName, currentEntitySetName) {
            //遍历
            allEntityTypes.map((item) => {
                const { name, navigationProperty } = item

                if (name === currentEntityTypeName) {
                    result.currentEntityTypeData = item
                    //不含字段的情况
                    if (!navigationPropertyName || !arr && arr.length === 0) {
                        result.currentEntitySetData = currentEntitySetData
                        result.currentEntityTypeName = currentEntityTypeName
                        result.currentAnnotations = getAnnotationByTarget(annotations, `${namespace}.${currentEntityTypeName}`)
                        return
                    } else {
                        //对应绑定的entitySet  没有绑定设置为null
                        let targetEntitySetName = null
                        if (arr.length > 1) {
                            entitySet.map((item) => {
                                const { name, navigationPropertyBinding } = item
                                if (name === currentEntitySetName) {
                                    //递归查找关联对象，直到最后一层
                                    navigationPropertyBinding && navigationPropertyBinding.map((d) => {
                                        const { path, target } = d
                                        if (path === navigationPropertyName) {
                                            targetEntitySetName = target
                                            result.currentEntitySetName = target
                                        }
                                    })
                                }
                            })
                        }

                        //数组的最后一个
                        if (index === arr.length - 1) {
                            const target = `${namespace}.${currentEntityTypeName}/${arr[index]}`
                            result.currentAnnotations = getAnnotationByTarget(annotations, target)
                            result.currentPropertyType = getPropertyType(result.currentEntityTypeData, arr[index]);
                            //action 配置的annotation
                            if (ActionName) {
                                const actionTarget = `${ActionName}/${navigationPropertyName}`
                                const actionData = getAnnotationByTarget(annotations, actionTarget)
                                result.currentAnnotations = result.currentAnnotations.concat(actionData)
                            }
                            return
                        }

                        //递归查找关联对象，直到最后一层
                        navigationProperty && navigationProperty.map((d) => {
                            const { name, type } = d
                            if (name === navigationPropertyName) {
                                const typeName = getNameSpaceEntityTypeName(type)
                                const typeArr = typeName.split('.')
                                const typeEntityTypeName = typeArr[typeArr.length - 1]
                                index++
                                query(typeEntityTypeName, arr[index], targetEntitySetName)
                            }
                        })
                    }
                }
            })
        }
        query(currentEntityTypeName, arr ? arr[index] : null, currentEntitySetName)
    }

    //判断是否需要获取关联对象的currentAnnotations,多段式兼容
    if (currentPath) {
        let arr = currentPath.search('/') !== -1 ? currentPath.split('/') : [currentPath]
        _nbff(arr)
    } else {
        _nbff()
    }

    return result;
}

/**
 * 获取annotations 
 * @param {array} annotations 
 * @param {string} target 
 */
const getAnnotationByTarget = (annotations, target) => {
    let result = [];
    annotations.map((item) => {
        if (target) {
            if (item.annotation && item.target === target) {
                result.push(...item.annotation);
            }
        } else {
            if (item.annotation) {
                result.push(...item.annotation);
            }
        }
    });
    return result;
};

export default {
    getRouteName,
    getUi5Config,
    getEntitySetConfig
}