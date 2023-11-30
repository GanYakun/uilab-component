/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2023-11-20 12:24:40
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-11-30 12:34:02
 * @FilePath: /Uilab-Application/lib/Uilab-Comp/smart-comp/Process/utils.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import React from 'react';
import odatajs from '../../utils/odata/index';
import odata from '../../utils/odata/odata';
import { message } from 'antd';
import storage from '../../utils/storage/metadataStorage';
import lodash from 'lodash';
import moment from 'moment';
import { FormattedMessage } from 'umi'

/**
 * 获取当前路由名称
 */
const getRouteName = () => {
    const { pathname } = window.location;
    const hrefArr = pathname.split('/');
    if (hrefArr.length > 1) {
        const path = hrefArr[hrefArr.length - 1];
        const appName = hrefArr.length === 4 ? hrefArr[hrefArr.length - 2] : hrefArr[hrefArr.length - 3]//目前是两个页面布局，后期优化
        const routeArr = path.split('?');
        const routeName = routeArr[0]
        return { appName, routeName };
    }
    return {}
}

/**
 * 获取ui5配置
 */
const getUi5Config = async (reload = false) => {
    const { appName, routeName } = getRouteName()
    //是否已有缓存
    if (!reload) {
        if (storage.get(`uilab-${appName}`)) {
            const { data } = storage.get(`uilab-${appName}`)
            if (data) {
                return data
            }
        }
    }

    const url = {
        manifestUrl: `/Ui5/${appName}/webapp/manifest.json`,
        annotationUrl: `/Ui5/${appName}/webapp/annotations/annotation.xml`,
        i18nUrl: `/Ui5/${appName}/webapp/i18n/i18n.properties`,
        i18nUrl_en: `/Ui5/${appName}/webapp/i18n/i18n_en.properties`,
        i18nUrl_zh: `/Ui5/${appName}/webapp/i18n/i18n_zh_CN.properties`,
    }

    const manifest = JSON.parse(await getXmlDoc(url.manifestUrl))
    const annotations = odatajs.oData.metadata.metadataParser(
        null,
        await getXmlDoc(url.annotationUrl)
    )
    const i18n = await getI18nJson(url.i18nUrl)
    const i18n_en = await getI18nJson(url.i18nUrl_en)
    const i18n_zh = await getI18nJson(url.i18nUrl_zh)
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
        i18n_en,
        i18n_zh,
        metadata,
        routeName,
        appName
    }
    storage.set(`uilab-${appName}`, result)
    return result
}

/**
 * 获取ui5配置在缓存中
 */
const getUi5ConfigAsync = () => {
    const { appName } = getRouteName()
    //是否已有缓存
    if (storage.get(`uilab-${appName}`)) {
        const { data } = storage.get(`uilab-${appName}`)
        if (data) {
            return data
        }
    }
}

/**
 * 获取xml文档
 * @param {string} path xml文档路径
 */
const getXmlDoc = async (path) => {
    return new Promise<string>((resolve, reject) => {
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
    if (i18nData && i18nData.search('DOCTYPE html') === -1) {
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
    return false
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
const getEntitySetConfig = (currentEntitySetName, currentPath = null as any, ActionName = null as any) => {
    const { metadata, manifest } = getUi5ConfigAsync()
    const { namespace, entityContainer, annotations, entityType: allEntityTypes } = metadata.dataServices.schema[0];
    let result = {
        currentEntitySetName,
        currentEntitySetData: null,
        currentEntityTypeName: null,
        currentEntityTypeData: null,
        currentPropertyType: null,
        currentAnnotations: null as any,
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
    const _nbff = (arr = []) => {
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

/**
 * 获取term对应的annotations
 * @param {array} annotations 
 * @param {string} term 
 * @returns 
 */
const getTermAnnotations = (annotations, term, qualifier = null) => {
    let result: any[] = [];
    if (Array.isArray(annotations)) {
        //目前匹配到最后
        annotations.map((item: any) => {
            if (qualifier) {
                if (item.term === term && item.qualifier === qualifier) {
                    result.push(item);
                }
            } else {
                //目前匹配到最后一条覆盖，兼容多次配置，后面的配置覆盖
                if (item.term === term) {
                    result.push(item);
                }
            }
        });

    }

    return result.length > 0 ? result[0] : null;
};

/**
 * 获取annotation中对应字段的值 string、annotationPath、bool等 目的兼容标签内的字段和标签包裹的情况
 * @param {string} label 例：string、annotationPath、bool
 * @param {object} data 
 * @returns 
 */
const getTextValueByData = (label, data) => {
    if (data) {
        if (data[label] instanceof Array) {
            return data[label][0].text;
        } else {
            return data[label];
        }
    }
};

/**
 * 通过annotation获取字段的显示label 
 * Common.Label
 * @param {*} annotations 当前对象的所有annotations
 * @returns 
 */
const getLabelByAnnotation = (annotations) => {
    let result;
    annotations && annotations.map((item) => {
        if (item.term === 'Common.Label') {
            result = getTextValueByData('string', item);
        }
    });
    return result;
};

/**
 * 获取当前对象的entityType中某个字段的数据类型：Edm.String、Edm.Boolean...
 * @param {array} entityTypeArray metadata中所有entityType
 * @param {string} property 需要获取的字段名称
 * @returns Edm.String、Edm.Boolean
 */
const getPropertyType = (entityTypeArray, property) => {
    let result;
    entityTypeArray.property.map((d) => {
        if (d.name === property) {
            result = d.type;
        }
    });
    return result;
};

/**
 * 获取nameSpace+entityType 
 * 区分Collection(com.dpbird.CustRequest) com.dpbird.CustRequest
 * @param {*} typeName 
 * @returns 
 */
const getNameSpaceEntityTypeName = (typeName) => {
    let end = typeName.indexOf(')', 10);
    return typeName.indexOf('Collection(') === 0 && end > 0 ? typeName.substring(11, end) : typeName;
};

/**
 * 获取查看条件，1.expand条件  2.主对象的select条件
 * @param {array} fieldArr
 * @param {array} annotations
 * @param {object}  entityContainer
 * @param {string}  entitySetName
 * @returns {object} currentExpand,currentSelect
 */
const getQueryContitionsByAnnotations = (
    fieldArr,
    entitySetName
) => {
    const { metadata } = getUi5ConfigAsync()
    const { entityContainer, annotations, entityType, namespace } = metadata.dataServices.schema[0];

    let currentExpand = {},
        currentSelect = []//最外层需要的$select

    //添加$select
    const _setSelect = (value, unitData) => {
        if (currentSelect.findIndex((item) => item === value) === -1) {
            currentSelect.push(value)
        }
        //处理单位请求，备注是第一层的字段
        if (unitData && unitData.index === 0 && unitData.value) {
            const { path } = unitData.value
            // 是否是多段式
            if (path.search('/') === -1) {
                currentSelect.push(path)
            }
        }
    }

    //判断当前字段是否配置了Common.Text
    const _nbff = (arr, field) => {
        let parseData = [], index = 0, unitData, isImageData, selectData, primaryKey
        const find = (entitySetName, navigationPropertyName, entityTypeName) => {
            const { entitySet } = entityContainer
            entitySet.map((item) => {
                const { name, navigationPropertyBinding, entityType } = item
                if (name === entitySetName) {
                    //数组的最后一个元素为字段信息，是否配置Common.Text
                    if (index === arr.length - 1) {

                        //两种entityType 都要去找 1.字段上的 2.entitySet上的
                        let fieldAnnotations1, fieldAnnotations2, fieldAnnotations
                        fieldAnnotations1 = getAnnotationByTarget(annotations, `${entityType}/${arr[index]}`);
                        fieldAnnotations2 = getAnnotationByTarget(annotations, `${namespace}.${entityTypeName}/${arr[index]}`);
                        fieldAnnotations = fieldAnnotations1.concat(fieldAnnotations2)

                        const { pathText } = getCommonTextByAnnotatons(fieldAnnotations);
                        const { currentEntityTypeData } = getUi5ConfigAsync(name)
                        //是否配置Text
                        if (pathText) {
                            if (pathText.search('/') !== -1) {
                                const textArr = pathText.split('/')
                                //配置了Text 关联对象也要配置在主对象entitySet的navigationPropertyBinding
                                if (navigationPropertyBinding && navigationPropertyBinding.findIndex((item) => item.path === textArr[0]) !== -1) {
                                    parseData = parseData.concat(textArr)
                                } else {
                                    console.error(`entitySet:${entitySetName} 中 navigationPropertyBinding 没有定义===> ${textArr[0]}`)
                                }
                            } else {
                                parseData.push(pathText)
                                index === 0 && _setSelect(pathText)
                            }
                        } else {
                            parseData.push(arr[index])
                            arr.length === 1 && _setSelect(arr[index])
                            //数据主键
                            primaryKey = getPrimaryKeys(currentEntityTypeData)
                        }

                        //处理Unit
                        const unit = getTermAnnotations(fieldAnnotations, 'Org.OData.Measures.V1.Unit') || getTermAnnotations(fieldAnnotations, 'Measures.Unit')
                        if (unit && unit.path) {
                            unitData = {
                                index,
                                value: unit
                            };
                        }
                        //处理isImage
                        isImageData = {
                            index,
                            value: getTermAnnotations(fieldAnnotations, 'UI.IsImage')
                        };
                        //selectData
                        selectData = {
                            index,
                            value: arr[index]
                        }

                        return
                    }

                    //检查是否没有配置对应
                    if (index !== arr.length - 1 && !navigationPropertyBinding) {
                        console.error(`Edm entitySet 配置错误： ${navigationPropertyName} => 没有配置在主对象 ${entitySetName} 对应的navigationPropertyBinding中`)
                    }

                    //递归查找关联对象，直到最后一层
                    navigationPropertyBinding && navigationPropertyBinding.map((d) => {
                        const { path, target } = d
                        if (path === navigationPropertyName) {
                            index++
                            parseData.push(path)
                            find(target, arr[index], arr[index - 1])
                        } else {
                            //console.error(`Edm entitySet 配置错误： ${navigationPropertyName} => 没有配置在主对象 ${entitySetName} 对应的navigationPropertyBinding中  ${arr}`)
                        }
                    })
                }
            })
        }
        //查找关联对象
        find(entitySetName, arr[index], arr[index])
        return {
            parseData,
            unitData,
            isImageData,
            selectData,
            primaryKey
        }
    }

    //4.拼装expand select
    const getMultistage = (arr, unitData, isImageData, selectData = null, primaryKey = null) => {
        let floatObj = currentExpand;
        function create(index) {
            //处理单位
            if (unitData && unitData.index !== 0) {
                const { value } = unitData
                if (value && index === unitData.index) {
                    const { path } = value
                    if (path.search('/') === -1) {
                        floatObj['$select'] += `,${path}`
                    }
                }
            } else {
                //处理第一层的多段式 单位联合显示
                if (unitData && unitData.value) {
                    const { path } = unitData.value
                    if (path.search('/') !== -1) {
                        arr = path.split('/')
                    }
                }
            }

            //处理isImage
            let ignore = false
            if (isImageData) {
                const { value } = isImageData
                if (value && value.bool === 'true') {
                    ignore = true
                }
            }

            //最后一个字段返回不处理
            if (index > arr.length - 2) {
                return
            }

            if (!floatObj[arr[index]]) {
                if (index === 0) {
                    floatObj[arr[index]] = {}
                    if (arr.length === 2 && !ignore && !floatObj[arr[index]]['$select']) {
                        floatObj[arr[index]]['$select'] = arr[index + 1]
                    }
                } else {
                    if (!floatObj.$expand) {
                        floatObj.$expand = {
                            ...floatObj.$expand,
                            [arr[index]]: index === arr.length - 2 ? {
                                $select: primaryKey && index === arr.length - 2 ? primaryKey.toString() : null//设置查询带上主键，最后一个对象
                            } : {}
                        }
                    } else {
                        floatObj.$expand = {
                            ...floatObj.$expand,
                            [arr[index]]: {
                                ...floatObj.$expand[arr[index]]
                            }
                        }
                    }
                    if (index === arr.length - 2 && !ignore) {
                        if (!floatObj.$expand[arr[index]]['$select']) {
                            floatObj.$expand[arr[index]]['$select'] = arr[index + 1]
                        } else {
                            floatObj.$expand[arr[index]]['$select'] += `,${arr[index + 1]}`
                        }
                    }
                }
            } else {
                //处理$select
                if (index === 0) {
                    if (arr.length === 2 && !ignore) {
                        if (!floatObj[arr[index]]['$select']) {
                            floatObj[arr[index]]['$select'] = arr[index + 1]
                        } else {
                            floatObj[arr[index]]['$select'] += `,${arr[index + 1]}`
                        }
                    }
                } else if (index === arr.length - 2 && !ignore) {
                    if (!floatObj.$expand[arr[index]]['$select']) {
                        floatObj.$expand[arr[index]]['$select'] = arr[index + 1]
                    } else {
                        floatObj.$expand[arr[index]]['$select'] += `,${arr[index + 1]}`
                    }
                }
            }

            //selectData
            if (selectData) {
                const { value } = selectData
                if (value && index === selectData.index) {
                    if (floatObj['$select']) {
                        floatObj['$select'] += `,${value}`
                    } else {
                        floatObj['$select'] = `${value}`
                    }
                }
            }

            floatObj = index === 0 ? floatObj[arr[index]] : floatObj.$expand[[arr[index]]]
            create(index + 1)
        }
        create(0)
    }

    //判断是否是现实关联对象的字段 通过是否存在 ‘/’ 
    fieldArr.map((item) => {
        if (item) {
            if (item.search('/') !== -1) {
                let arr = item.split('/')
                const { parseData, unitData, isImageData, selectData, primaryKey } = _nbff(arr, item)
                if (parseData.length === 0) {
                    console.error(`annotation配置错误： ${item} => 没有配置主对象（${entitySetName}）对应的navigationPropertyBinding`)
                }
                getMultistage(parseData, unitData, isImageData, selectData, primaryKey)
            } else {
                const { parseData, unitData, isImageData } = _nbff([item], item)
                getMultistage(parseData, unitData, isImageData)
                _setSelect(item, unitData)
            }
        }
    })

    return {
        currentExpand,
        currentSelect,
    };
};

/**
 * 获取当前对象的主键数据，primaryKeys 
 * @param {*} currentEntityTypeData 当前对象的entityType数据
 * @returns 
 */
const getPrimaryKeys = (currentEntityTypeData) => {
    const result = [];
    if (currentEntityTypeData) {
        const { key } = currentEntityTypeData;
        if (key) {
            for (let a of key) {
                const { propertyRef } = a;
                if (propertyRef) {
                    for (let b of propertyRef) {
                        const { name } = b;
                        result.push(name);
                    }
                }
            }
        }
    }

    return result;
};

/**
 * 获取只读状态显示的内容
 * UI.TextArrangementType/TextFirst UI.TextArrangementType/TextLast UI.TextArrangementType/TextOnly
 * @param {object} record
 * @param {array} currentAnnotations
 * @param {string} fieldValue
 * @param {array} annotations
 * @param {string} namespace
 * @param {string} fieldType
 * @param {string} displayProperty 兼容lookup
 * @returns {object}displayValue:只读显示的文本
 */
const getFieldDisplayValueAndCurrentValue = (
    record,
    fieldValue,
    currentAnnotations,
    currentPropertyType
) => {
    let displayValue, currentPathText, currentValue;

    //是否配置Common.Text
    let { pathText, enumMemberText } = getCommonTextByAnnotatons(currentAnnotations);

    //获取readonlyText
    const _getReadonlyText = (value1, value2) => {
        if (!value1) return value2;
        switch (enumMemberText) {
            case 'UI.TextArrangementType/TextFirst':
                return `${value1} ( ${value2} )`;
            case 'UI.TextArrangementType/TextLast':
                return `${value2} ( ${value1} )`;
            case 'UI.TextArrangementType/TextOnly':
                return `${value1}`;
        }
        return value1;
    };

    //获取对应字段在record中的值 通过目标数组
    const _getRecordDataByTargetArr = (record, targetArr) => {
        let data = record
        for (let i of targetArr) {
            if (data) {
                if (data instanceof Array) {
                    const arr = []
                    for (let item of data) {
                        item[i] && arr.push(item[i])
                    }
                    data = arr
                } else {
                    data = data[i]
                }
            } else {
                data = null
            }
        }
        return data
    }

    //判断是否为object,普通字符串直接返回
    if (record instanceof Object && fieldValue) {
        if (fieldValue.search('/') === -1) {
            if (pathText) {
                if (pathText.search('/') === -1) {
                    currentPathText = pathText
                    const value1 = record[pathText];
                    const value2 = record[fieldValue];
                    displayValue = _getReadonlyText(value1, value2);
                    currentValue = value2;
                } else {
                    const arr = pathText.split('/');
                    const value1 = _getRecordDataByTargetArr(record, arr)
                    currentPathText = value1
                    const value2 = record[fieldValue];

                    displayValue = _getReadonlyText(value1, value2);
                    currentValue = value2;
                }
            } else {
                currentPathText = fieldValue
                displayValue = record[fieldValue];
                currentValue = record[fieldValue];
            }
        } else {
            let arr = fieldValue.split('/');
            let arr1 = fieldValue.split('/')
            if (pathText) {
                arr = lodash.dropRight(arr, 1).concat(pathText.split('/'))
            }
            const value1 = _getRecordDataByTargetArr(record, arr)
            const value2 = _getRecordDataByTargetArr(record, arr1)
            //处理字段是列表
            if (value1 instanceof Array) {
                const arr = []
                value1.map((item, index) => {
                    arr.push(_getReadonlyText(item, value2[index]))
                })
                displayValue = arr
            } else {
                displayValue = _getReadonlyText(value1, value2);
            }

            currentValue = value2;
        }
    } else {
        currentPathText = record
        displayValue = record;
        currentValue = record;
    }

    //日期类型需要格式化
    if (currentValue) {
        if (currentPropertyType === 'Edm.DateTimeOffset') {
            currentValue = moment(currentValue, 'YYYY-MM-DD HH:mm:ss').utcOffset(-480 + 1440);
            displayValue = moment(currentValue).format('YYYY-MM-DD HH:mm:ss')
        } else if (currentPropertyType === 'Edm.DateOffset') {
            currentValue = moment(currentValue, 'YYYY-MM-DD').utcOffset(-480 + 1440);
            displayValue = moment(currentValue).format('YYYY-MM-DD')
        }
    }

    //console.log({ displayValue, currentPathText, currentValue, moment, currentPropertyType })
    return { displayValue, currentPathText, currentValue };
};

/**
 * 获取当前对象的EntitySetData
 * @param {object} entityContainer metadata中的entityContainer
 * @param {string} entitySetName 
 * @param {string} fieldValue      smartfield当前显示字段 判断是否显示
 * @returns {name: 'Parties', entityType: 'com.dpbird.Party', navigationPropertyBinding: Array(6)}
 */
const getEntitySetData = (entityContainer, entitySetName, fieldValue = null) => {
    let result = {
        entitySetData: null,
        property: null
    };
    const { entitySet } = entityContainer;

    const _getEntitySet = (targetName) => {
        entitySet.map((item) => {
            const { name } = item;
            if (name === targetName) {
                result.entitySetData = item;
            }
        });
    }
    _getEntitySet(entitySetName)
    if (fieldValue && fieldValue.search('/') !== -1) {
        const arr = fieldValue.split('/')
        arr.map((item, index) => {
            if (index !== arr.length - 1) {
                const { navigationPropertyBinding } = result.entitySetData
                for (let a of navigationPropertyBinding) {
                    const { path, target } = a
                    if (path === item) {
                        _getEntitySet(target)
                    }
                }
            } else {
                result.property = item
            }
        })
    } else {
        result.property = fieldValue
    }

    return result;
};

/**
 * 获取显示字段
 * Common.Text UI.TextArrangement
 * @param {array} currentAnnotations
 * @returns {object}
 */
const getCommonTextByAnnotatons = (currentAnnotations) => {
    const result = {
        pathText: null,
        enumMemberText: null,
    };

    if (currentAnnotations) {
        //解析当前字段的类型，通过term=Common.Text，判断最终显示的方式。未设定使用TextOnly
        for (let a of currentAnnotations) {
            const { term, annotation } = a;
            if (term === 'Common.Text') {
                result.pathText = getTextValueByData('path', a);
                if (annotation) {
                    for (let b of annotation) {
                        const { term } = b;
                        if (term === 'UI.TextArrangement') {
                            result.enumMemberText = getTextValueByData('enumMember', b);
                        }
                    }
                }
            }
        }
    }

    return result;
};

/**
 * 解析UI.Hidden,判断元素是否隐藏
 * @param {object} annotation
 * @param {object} currentRecord 当前对象的数据
 * @return {boolean}
 */
const isHiddenByAnnotation = (annotation, currentRecord, currentTerm = 'UI.Hidden') => {
    let result = {
        hiddenPath: null,
        isHidden: false,
        hiddenQueryPath: null
    }
    //目前只支持 path 一段式
    const _getEqAndNe = (condition, data) => {
        let result: any = {}
        let path = getTextValueByData('path', data)
        let string = getTextValueByData('string', data)
        result.path = path
        result.string = string
        if (currentRecord && JSON.stringify(currentRecord) !== '{}') {
            let val
            if (path.search('/') !== -1) {
                const arr = path.split('/')
                arr.map((item, index) => {
                    if (index === 0 && currentRecord[item]) {
                        val = currentRecord[item]
                    } else {
                        if (val && val[item]) {
                            val = val[item]
                        }
                    }
                })
            } else {
                val = currentRecord[path]
            }
            if (string) {
                if (condition === 'eq') {
                    result.boolText = val === string
                } else if (condition === 'ne') {
                    result.boolText = val !== string
                }
            } else {
                result.boolText = val
            }
        }

        return result
    }

    if (annotation) {
        for (let a of annotation) {
            const { term, if: dataIf, bool } = a
            if (term === currentTerm) {
                //配置了语义化字段
                const path = getTextValueByData('path', a)
                if (path) {
                    if (path.indexOf("()") !== -1) {
                        result.hiddenQueryPath = path.slice(1)
                    } else {
                        result.hiddenPath = path
                        //如果传递了值 objectPage 返回是否隐藏
                        if (currentRecord) {
                            result.isHidden = currentRecord[path]
                        }
                    }
                }
                //配置了if else 的情况
                if (dataIf) {
                    for (let b of dataIf) {
                        const { eq, bool: dibool, ne, or, and, path: diPath } = b
                        if (and) {
                            //bug and没实现
                            let and_eq = and[0].eq, and_eq_val
                            if (and_eq) {
                                and_eq_val = and_eq.findIndex((item) => {
                                    const { path, string, boolText } = _getEqAndNe('eq', item, dibool)
                                    //console.log({ path, string, boolText })
                                    result.hiddenPath = path
                                    return boolText
                                }) !== -1
                                result.isHidden = and_eq_val ? JSON.parse(dibool[0]?.text) : JSON.parse(dibool[1]?.text)
                            }
                        }
                        //或者 
                        if (or) {
                            let or_eq = or[0].eq, or_eq_val
                            if (or_eq) {
                                or_eq_val = or_eq.findIndex((item) => {
                                    const { path, string, boolText } = _getEqAndNe('eq', item, dibool)
                                    result.hiddenPath = path
                                    return boolText
                                }) !== -1
                                result.isHidden = or_eq_val ? JSON.parse(dibool[0]?.text) : JSON.parse(dibool[1]?.text)
                            }
                        }
                        //相等
                        if (eq) {
                            const { path, boolText } = _getEqAndNe('eq', eq[0])
                            if (path) {
                                //console.log({ path, boolText, currentRecord, dibool })
                                result.hiddenPath = path
                                result.isHidden = boolText ? JSON.parse(dibool[0]?.text) : JSON.parse(dibool[1]?.text)
                            }
                        }
                        //不等于
                        if (ne) {
                            const { path, string, boolText } = _getEqAndNe('ne', ne[0], bool)
                            if (path) {
                                result.hiddenPath = path
                                result.isHidden = boolText ? JSON.parse(dibool[0]?.text) : JSON.parse(dibool[1]?.text)
                            }
                        }
                        //直接写path
                        if (diPath) {
                            const { path, boolText } = _getEqAndNe('eq', b)
                            if (path) {
                                result.hiddenPath = path
                                result.isHidden = boolText
                            }
                        }
                    }
                }
                //直接配置了bool
                if (bool) {
                    result.isHidden = bool === 'true'
                }
            }
        }
    }

    return result
}

/**
 * 随机生成Key 供无逻辑组件使用
 * @param {*} keyLength 
 * @returns 
 */
const generateKey = (keyLength = 18) => {
    let rlt = ''
    for (let i = 0; i < keyLength; i++) {
        if (Math.round(Math.random())) {
            rlt += Math.ceil(Math.random() * 9)
        } else {
            const ranNum = Math.ceil(Math.random() * 23)
            if (Math.round(Math.random())) {
                rlt += String.fromCharCode(65 + ranNum)
            } else {
                rlt += String.fromCharCode(97 + ranNum)
            }
        }
        //加上-，不要的可以去掉
        if ((i + 1) % 6 === 0 && i > 2 && i < 17) {
            rlt += '-'
        }
    }
    return rlt
}

/**
 * 
 * @param {*} path 字段
 * @param {*} label 显示
 * @param {*} formatMessage 工具类 
 * @returns 
 */
const getTextByI18n = (label) => {
    return label && label.search('@i18n>') === -1 ? label : <FormattedMessage id={label} />
}

/**
 * 解析PropertyValue属性值
 * @param {*} data 
 * @returns 
 */
const parsePropertyValue = (data) => {
    const result = {
        ID: '' as any,
        Label: '' as any,
        Value: '' as any,
        Title: '' as any,
        Description: null as any,
        ImageUrl: '' as any,
        Target: '' as any,
        TypeName: '' as any,
        TypeNamePlural: '' as any
    }

    const _getValueByRecord = (record, property) => {
        for (let b of record) {
            const { type, propertyValue } = b
            const { Value } = parsePropertyValue(propertyValue)
            result[property] = {
                type,
                Value
            }
        }
    }

    if (Array.isArray(data)) {
        for (let a of data) {
            const { property, record } = a
            if (record) {
                _getValueByRecord(record, property)
            } else {
                switch (property) {
                    case 'ID':
                        result.ID = getTextValueByData('string', a)
                        break;
                    case 'Label':
                        result.Label = getTextByI18n(getTextValueByData('string', a))
                        break;
                    case 'Value':
                        result.Value = getTextValueByData('path', a)
                        break;
                    case 'TypeName':
                        result.TypeName = getTextValueByData('string', a);
                        break
                    case 'TypeNamePlural':
                        result.TypeNamePlural = getTextValueByData('string', a);
                        break
                    case 'Target':
                        result.Target = getTextValueByData('annotationPath', a);
                        break
                    default:
                        break;
                }
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
    let result
    const headerInfo = getTermAnnotations(currentAnnotations, 'UI.HeaderInfo');
    if (headerInfo) {
        const { record } = headerInfo;
        for (let a of record) {
            const { propertyValue, type } = a;
            if (type === 'UI.HeaderInfoType') {
                result = parsePropertyValue(propertyValue);
            }
        }
    }
    return result;
};

/**
 * 得到目标已整理过的annotation
 * @param annotations
 */
const getTargetAnnotationProcessed = (
    currentAnnotations,
    target,
    currentEntitySetData
) => {

    let targetNavigation, targetQualifier;

    //解析target
    if (target.search('@') !== -1) {
        const arr = target.split('@')
        targetNavigation = arr[0].substring(0, arr[0].length - 1)
    }
    if (target.search('#') !== -1) {
        const arr = target.split('#')
        targetQualifier = arr[arr.length - 1]
    }
    //console.log({ currentAnnotations, target, targetNavigation, targetQualifier, targetEntitySet })

    //Table类型
    if (target && target.search('UI.LineItem') !== -1) {
        const targetEntitySet = getEntitySetByCurrentEntitySetNavigationPropertyBinding(
            currentEntitySetData,
            targetNavigation,
        );
        return {
            facetType: 'UI.LineItem',
            targetNavigation,
            targetEntitySet: targetEntitySet,
            targetQualifier: targetQualifier
        }
    }

    //FieldGroup类型
    if (target && target.search('@UI.FieldGroup') !== -1) {
        const data = getTermAnnotations(currentAnnotations, 'UI.FieldGroup', targetQualifier)
        if (data) {
            const { record } = data
            for (let a of record) {
                const { type, propertyValue } = a
                if (type === 'UI.FieldGroupType') {
                    let Label, Fields = [] as any
                    for (let b of propertyValue) {
                        const { property, collection } = b
                        switch (property) {
                            case 'Label':
                                Label = getTextValueByData('string', b)
                                break;
                            case 'Data':
                                const record = collection[0]?.record
                                for (let c of record) {
                                    const { type, propertyValue } = c
                                    const { Value } = parsePropertyValue(propertyValue)
                                    Fields.push({ type, Value })
                                }
                                break;
                            default:
                                break;
                        }
                    }

                    return {
                        facetType: 'UI.FieldGroup',
                        Label,
                        Fields
                    }
                }
            }
        }
    }
};

/**
 * 解析objectPage Facets
 * UI.Facets UI.HeaderFacets
 * @param {*} currentAnnotations 
 * @returns 
 */
const getObjectPageFacetsByAnnotations = (currentAnnotations, currentEntitySetData, currentRecord = null) => {
    const result = {
        Facets: [] as any,
        HeaderFacets: [] as any,
    }

    const facetsData = getTermAnnotations(currentAnnotations, 'UI.Facets');
    const headerFacetsData = getTermAnnotations(currentAnnotations, 'UI.HeaderFacets');

    //解析ReferenceFacet
    const _getReferenceFacet = (propertyValue) => {
        let result = {} as any;
        for (let f of propertyValue) {
            const { property } = f;
            if (property === 'ID') {
                result.id = getTextValueByData('string', f);
            } else {
                result.id = generateKey()
            }
            if (property === 'Label') {
                result.label = getTextByI18n(getTextValueByData('string', f))
            }
            if (property === 'Target') {
                result.target = getTextValueByData(`annotationPath`, f);
                result.targetData = getTargetAnnotationProcessed(
                    currentAnnotations,
                    result.target,
                    currentEntitySetData
                );
            }
        }
        return result;
    };

    //解析CollectionFacet
    const _getCollectionFacet = (propertyValue) => {
        let id,
            label,
            childfacets = [] as any;
        for (let c of propertyValue) {
            const { property, collection } = c;
            if (property === 'ID') {
                id = getTextValueByData('string', c);
            }
            if (property === 'Label') {
                label = getTextByI18n(getTextValueByData('string', c))
            }
            if (property === 'Facets') {
                for (let d of collection) {
                    const { record } = d;
                    for (let e of record) {
                        const { type, propertyValue, annotation } = e;
                        if (type === 'UI.ReferenceFacet') {
                            const ReferenceFacetData = _getReferenceFacet(propertyValue);
                            childfacets.push(ReferenceFacetData);
                        }
                        if (type === 'UI.CollectionFacet') {
                            const CollectionFacetData = _getCollectionFacet(propertyValue);
                            childfacets.push(CollectionFacetData);
                        }
                    }
                }
            }
        }
        return { id, label, childfacets };
    };

    //解析Facets
    const _parseFacets = (data) => {
        const { collection } = data;
        const arr = [] as any
        if (collection) {
            for (let a of collection) {
                const { record } = a;
                if (record) {
                    for (let b of record) {
                        const { type, propertyValue, annotation } = b;
                        if (type === 'UI.CollectionFacet') {
                            const CollectionFacetData = _getCollectionFacet(propertyValue);
                            arr.push(CollectionFacetData);
                        }
                        if (type === 'UI.ReferenceFacet') {
                            const ReferenceFacetData = _getReferenceFacet(propertyValue);
                            arr.push(ReferenceFacetData);
                        }
                    }
                }
            }
        }
        return arr
    }

    if (facetsData) {
        result.Facets = _parseFacets(facetsData)
    }
    if (headerFacetsData) {
        result.HeaderFacets = _parseFacets(headerFacetsData)
    }
    return result
}

/**
 * 获取关联对象entitySet,通过当前对象的navigationPropertyBinding与指定的path
 * @param {*} currentEntitySetData 当前对象
 * @param {*} targetPath 指定目标path
 * @returns 关联对象的entitySet name
 */
const getEntitySetByCurrentEntitySetNavigationPropertyBinding = (
    currentEntitySetData,
    targetPath,
) => {
    const { metadata } = getUi5ConfigAsync()
    const { namespace, annotations, entityContainer } = metadata.dataServices.schema[0];
    const { entitySet } = entityContainer
    let result;
    if (targetPath.search('/') === -1 && currentEntitySetData) {
        const { navigationPropertyBinding } = currentEntitySetData;
        for (let a of navigationPropertyBinding) {
            const { path, target } = a;
            if (path === targetPath) {
                result = target;
            }
        }
    } else {
        const arr = targetPath.split('/')
        //目前两段  不支持了
        if (arr.length === 2 && currentEntitySetData) {
            const { navigationPropertyBinding } = currentEntitySetData;
            for (let a of navigationPropertyBinding) {
                const { path, target } = a;
                if (path === arr[0]) {
                    entitySet.map((b) => {
                        const { name, navigationPropertyBinding } = b
                        if (name === target) {
                            navigationPropertyBinding.map((c) => {
                                const { path, target } = c
                                if (path === arr[1]) {
                                    result = target;
                                }
                            })
                        }
                    })

                }
            }
        }
    }

    return result;
};

/**QuickCreateFacets 快速创建的字段信息
 * 解析
 * @param {*} currentAnnotations 
 */
const parseQuickCreateFacets = (currentAnnotations, entitySet) => {
    let result = {
        ID: null,
        Label: null,
        Target: null as any,
        Fields: [] as any,
        ImmutableFields: [] as any,
        //Annotations: [] as any,
        annoRequest: {} as any,
    }
    //解析termUI.QuickCreateFacets
    const QuickCreateFacets = getTermAnnotations(currentAnnotations, 'UI.QuickCreateFacets')
    if (QuickCreateFacets) {
        const { collection } = QuickCreateFacets
        if (collection) {
            for (let a of collection) {
                const { record } = a
                for (let b of record) {
                    const { type, propertyValue } = b
                    if (type === 'UI.ReferenceFacet') {
                        const { ID, Label, Target } = parsePropertyValue(propertyValue)
                        result = { ...result, ID, Label, Target }
                    }
                }
            }
        }
    } else {
        return false
    }

    //通过target 查找创建时需要的字段信息
    if (result.Target) {
        const arr = result.Target.split('#')
        const type = arr[0], qualifier = arr[1]
        if (type === '@UI.FieldGroup') {
            const FieldGroup = getTermAnnotations(currentAnnotations, 'UI.FieldGroup', qualifier)
            if (FieldGroup) {
                const { record } = FieldGroup
                for (let a of record) {
                    const { type, propertyValue } = a
                    if (type === 'UI.FieldGroupType') {
                        for (let b of propertyValue) {
                            const { property, collection } = b
                            if (property === 'Data') {
                                for (let c of collection) {
                                    const { record } = c
                                    for (let d of record) {
                                        const { type, propertyValue } = d
                                        if (type === 'UI.DataField') {
                                            const { Value } = parsePropertyValue(propertyValue)
                                            result.Fields.push({ type, Value })
                                            //处理Core.Immutable 是否配置了不可编辑
                                            if (Value) {
                                                const { currentAnnotations: propertyAnnotations } = getEntitySetConfig(entitySet, Value)
                                                for (let b of propertyAnnotations) {
                                                    const { term } = b
                                                    const bool = getTextValueByData('bool', b)
                                                    switch (term) {
                                                        case 'Core.Immutable':
                                                            if (!bool || bool === 'true') {
                                                                result.ImmutableFields.push(Value)
                                                            }
                                                            break;
                                                        default:
                                                            break;
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    //设置请求
    if (result.Fields.length > 0) {
        const _getCurrentBody = (body) => {
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
                            currentObj[key1] = body[key]; // 或者设置为你想要的默认值
                        } else {
                            currentObj[key1] = {};
                            currentObj = currentObj[key1];
                        }
                    }
                    result = { ...result, ...obj }
                }
            }
            return result
        }

        result.annoRequest = {
            post: async (body = {}) => {
                let option = {
                    path: entitySet,
                    method: 'POST',
                    body: _getCurrentBody(body),
                };
                return await odata.submit(option);
            },
            patch: async (record, body) => {
                let option = {
                    path: record['@odata.id'],
                    method: 'PATCH',
                    body: _getCurrentBody(body),
                };
                return await odata.submit(option);
            },
            delete: async (record) => {
                let option = {
                    path: record['@odata.id'],
                    method: 'DELETE',
                    body: {},
                };
                return await odata.submit(option);
            }
        }
    }

    return result
}

/**
 * 解析PresentationVariant 根据Annotations
 * UI.PresentationVariant 
 * @param {*} obj 
 * @returns 
 */
const getPresentationVariantByAnnotations = (obj) => {
    const { term, record, property } = obj;
    let result = {
        orderby: null as any,
        text: null as any,
        Visualizations: null as any
    };
    if (term === `UI.PresentationVariant` || property === 'PresentationVariant') {
        for (let a of record) {
            const { type, propertyValue } = a;
            if (type === 'UI.PresentationVariantType') {
                for (let b of propertyValue) {
                    const { property, collection, string } = b;

                    //默认排序
                    if (property === 'SortOrder') {
                        for (let c of collection) {
                            const { record } = c;
                            for (let d of record) {
                                const { propertyValue } = d;
                                let path, value;
                                for (let e of propertyValue) {
                                    const { property, propertyPath, bool } = e;
                                    if (property === 'Property') {
                                        path = propertyPath;
                                    }
                                    if (property === 'Descending') {
                                        value = bool;
                                    }
                                }
                                result.orderby = {
                                    name: path,
                                    target: value === 'true' ? 'desc' : 'asc'
                                }
                            }
                        }
                    }

                    //Visualizations 可视化内容 ***目前只支持第一个***
                    if (property === 'Visualizations') {
                        for (let c of collection) {
                            const { annotationPath } = c
                            if (annotationPath && annotationPath instanceof Array) {
                                const arr = annotationPath[0].text.split('#');//支持第一个annotationPath
                                result.Visualizations = {
                                    term: arr[0],
                                    qualifier: arr[1]
                                }
                            }
                        }
                    }
                    //Text 不清楚
                    if (property === 'Text') {
                        result.text = string;
                    }
                }
            }
        }
    }

    return result;
};

/**
 * 解析SelectionPresentationVariant 根据Annotations
 * UI.SelectionPresentationVariant 
 * @param {*} obj 
 * @returns 
 */
const getSelectionPresentationVariantByAnnotations = (obj, currentEntityTypeData) => {
    const result = {
        Text: null,
        Presentation: null as any,
        Selection: null as any
    }

    if (obj) {
        const { term, record } = obj
        if (term === 'UI.SelectionPresentationVariant') {
            for (let a of record) {
                const { type, propertyValue } = a
                if (type === 'UI.SelectionPresentationVariantType') {
                    for (let b of propertyValue) {
                        const { property } = b
                        switch (property) {
                            case 'Text':
                                result.Text = getTextByI18n(getTextValueByData('string', b))
                                break;
                            case 'SelectionVariant':
                                result.Selection = getSelectionVariantByAnnotations(b, currentEntityTypeData)
                                break;
                            case 'PresentationVariant':
                                result.Presentation = getPresentationVariantByAnnotations(b)
                                break;
                            default:
                                break;
                        }
                    }
                }
            }
        }
    }

    return result
}

/**
 * SelectionVariant 根据Annotations
 * UI.SelectionVariant 
 * @param {*} obj 
 * @returns 
 */
const getSelectionVariantByAnnotations = (obj, currentEntityTypeData) => {
    const result = {
        filter: null,
        PropertyNames: [] as any
    };
    const { property, record } = obj;
    if (property === 'SelectionVariant') {
        for (let a of record) {
            const { propertyValue, type } = a;
            if (type === 'UI.SelectionVariantType') {
                for (let b of propertyValue) {
                    const { property, collection } = b;
                    if (property === 'SelectOptions') {
                        let filterItem
                        for (let c of collection) {
                            const { record } = c;
                            if (record) {
                                for (let d of record) {
                                    const { propertyValue, type } = d;
                                    let PropertyName
                                    if (type === 'UI.SelectOptionType') {
                                        for (let e of propertyValue) {
                                            const { property, collection } = e;
                                            if (property === 'PropertyName') {
                                                PropertyName = getTextValueByData('propertyPath', e);
                                                result.PropertyNames.push(PropertyName)
                                            }
                                            if (property === 'Ranges' && collection) {
                                                for (let f of collection) {
                                                    const { record } = f;
                                                    //是否有多项 多项为or
                                                    if (record) {
                                                        let $filter;
                                                        for (let g of record) {
                                                            let Option, Low, condition, lambda = {};
                                                            const { propertyValue } = g;
                                                            //if (type === 'UI.SelectionRangeType') {
                                                            for (let h of propertyValue) {
                                                                const { property } = h;
                                                                if (property === 'Option') {
                                                                    Option = getTextValueByData('enumMember', h);
                                                                }
                                                                if (property === 'Low') {
                                                                    Low = h[null] ? null : getTextValueByData('string', h);
                                                                }
                                                                // if (property === 'Sign') {
                                                                //     Sign = getTextValueByData('enumMember', h);
                                                                // }
                                                            }
                                                            //}

                                                            //查询 eq ne gt lt
                                                            switch (Option) {
                                                                case 'UI.SelectionRangeOptionType/EQ':
                                                                    condition = 'eq'
                                                                    break;
                                                                case 'UI.SelectionRangeOptionType/NE':
                                                                    condition = 'ne'
                                                                    break;
                                                                case 'UI.SelectionRangeOptionType/GT':
                                                                    condition = 'gt'
                                                                    break;
                                                                case 'UI.SelectionRangeOptionType/LT':
                                                                    condition = 'lt'
                                                                    break;
                                                                default:
                                                                    break;
                                                            }

                                                            //如果是boolean 需要去掉引号 'null'
                                                            let value
                                                            if (Low === 'true' || Low === 'false') {
                                                                value = Low
                                                            } else if (Low === null) {
                                                                value = null
                                                            } else if (lodash.isNumber(Low) || Low === '0') {
                                                                value = lodash.toNumber(Low)
                                                            } else {
                                                                value = `'${Low}'`
                                                            }

                                                            if (PropertyName.search('/') !== -1) {
                                                                const arr = PropertyName.split('/');
                                                                let _isCollection = isCollection(
                                                                    currentEntityTypeData.navigationProperty,
                                                                    arr[0],
                                                                );
                                                                //是否是一对多 是否使用lambda查询
                                                                if (_isCollection) {
                                                                    if (!lambda[arr[0]]) {
                                                                        lambda[arr[0]] = [`${arr[1]} ${condition} ${value}`];
                                                                    } else {
                                                                        lambda[arr[0]].push(`${arr[1]} ${condition} ${value}`);
                                                                    }
                                                                } else {
                                                                    $filter = !$filter ? `${PropertyName} ${condition} ${value}` : $filter += ` or ${PropertyName} ${condition} ${value}`;
                                                                }
                                                            } else {
                                                                $filter = !$filter ? `${PropertyName} ${condition} ${value}` : $filter += ` or ${PropertyName} ${condition} ${value}`;
                                                            }                                                            //拼接lambda语句
                                                            if (`${JSON.stringify(lambda)}` !== '{}') {
                                                                let lambdaUrl = '',
                                                                    lambdaUrlItem = '';
                                                                for (let key of Object.keys(lambda)) {
                                                                    lambda[key].map((item) => {
                                                                        if (lambdaUrlItem === '') {
                                                                            lambdaUrlItem = `c:c/${item}`;
                                                                        } else {
                                                                            lambdaUrlItem += ` and c/${item}`;
                                                                        }
                                                                    });
                                                                    if (lambdaUrl === '') {
                                                                        lambdaUrl = `${key}/any(${lambdaUrlItem})`;
                                                                    } else {
                                                                        lambdaUrl += ` and ${key}/any(${lambdaUrlItem})`;
                                                                    }
                                                                }
                                                                if (lambdaUrl !== '') {
                                                                    $filter = !$filter ? lambdaUrl : $filter += ` or ${lambdaUrl}`;
                                                                }
                                                            }
                                                        }
                                                        if ($filter && $filter.search('or') !== -1) {
                                                            $filter = `(${$filter})`
                                                        }
                                                        filterItem = !filterItem ? $filter : filterItem += ` and ${$filter}`
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        if (filterItem !== '') {
                            result.filter = filterItem;
                        }
                    }
                }
            }
        }
    }
    return result;
};

/**
 * 判断navigation 是否是Collection 1vs多
 * @param {array} navigationProperty 当前对象的关联对象
 * @param {*} navigationPropertyPath 
 * @returns 
 */
const isCollection = (navigationProperty, navigationPropertyPath) => {
    let result = false;
    if (navigationProperty) {
        navigationProperty.map((item) => {
            if (item.name === navigationPropertyPath && item.type.search('Collection') !== -1) {
                result = true;
            }
        });
    }
    return result;
};

export default {
    getRouteName,
    getUi5Config,
    getUi5ConfigAsync,
    getEntitySetConfig,
    getTermAnnotations,
    getTextValueByData,
    getLabelByAnnotation,
    getQueryContitionsByAnnotations,
    getPrimaryKeys,
    getFieldDisplayValueAndCurrentValue,
    getAnnotationByTarget,
    getEntitySetData,
    getCommonTextByAnnotatons,
    getHeaderInfoOptions,
    getObjectPageFacetsByAnnotations,
    parseQuickCreateFacets,
    getPresentationVariantByAnnotations,
    getSelectionPresentationVariantByAnnotations
}