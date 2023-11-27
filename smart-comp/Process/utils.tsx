/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2023-11-20 12:24:40
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-11-27 12:33:33
 * @FilePath: /Uilab-Application/lib/Uilab-Comp/smart-comp/Process/utils.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import odatajs from '../../utils/odata/index';
import odata from '../../utils/odata/odata';
import { message } from 'antd';
import storage from '../../utils/storage/metadataStorage';
import lodash from 'lodash';
import moment from 'moment'

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
    return {}
}

/**
 * 获取ui5配置
 */
const getUi5Config = async () => {
    const { appName, routeName } = getRouteName()

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
    if (i18nData) {
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
const getEntitySetConfig = async (currentEntitySetName, currentPath = null as any, ActionName = null as any) => {
    const { metadata } = await getUi5Config()

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
const getTermAnnotations = (annotations, term) => {
    let result: any[] = [];
    Array.isArray(annotations) && annotations.map((item: any) => {
        if (item.term === term) {
            result.push(item);
        }
    });
    return result;
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
 * 获取查看条件，1.expand条件  2.主对象的select条件
 * @param {array} fieldArr
 * @param {array} annotations
 * @param {object}  entityContainer
 * @param {string}  entitySetName
 * @returns {object} currentExpand,currentSelect
 */
const getQueryContitionsByAnnotations = async (
    fieldArr,
    entitySetName
) => {
    const { metadata } = await getUi5Config()
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
            entitySet.map(async (item) => {
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
                        const { currentEntityTypeData } = await getEntitySetConfig(name)
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
    const getMultistage = (arr, unitData, isImageData, selectData, primaryKey) => {
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
    await Promise.all(
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
    )

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
const getFieldReadonlyTextAndCurrentValue = (
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
 * 获取当前字段对应的展示字段信息 
 * Common.Text
 * @param {*} annotations 当前对象的annotations
 * @returns 
 */
const getDisplayTextByAnnotation = (annotations) => {
    let result;
    annotations && annotations.map((item) => {
        if (!result && item.term === 'Common.Text') {
            result = getTextValueByData('path', item);
        }
    });
    return result;
};

export default {
    getRouteName,
    getUi5Config,
    getEntitySetConfig,
    getTermAnnotations,
    getTextValueByData,
    getLabelByAnnotation,
    getQueryContitionsByAnnotations,
    getPrimaryKeys,
    getFieldReadonlyTextAndCurrentValue,
    getAnnotationByTarget,
    getEntitySetData,
    getDisplayTextByAnnotation
}