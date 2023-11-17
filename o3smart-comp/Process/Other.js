/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2022-08-30 10:52:29
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-10-12 14:28:14
 * @FilePath: /uilab-gbms/lib/o3smart-comp/Process/Other.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { array_get, getCurrentRouter } from '../../utils/util';
import storage from '../../utils/storage/metadataStorage'

/**
 * 获取当前对象的entityType
 * @param {array} entityType metadata中的entityType 
 * @param {string} namespace 
 * @param {*} currentEntityTypeName 当前entitySet对应的entityType name字段
 * @returns {name: 'Party', key: Array(1), property: Array(14), navigationProperty: Array(6)}
 */
const getEntityType = (entityType, namespace, currentEntityTypeName) => {
    let result;
    for (let a of entityType) {
        const { name } = a
        if (`${namespace}.${name}` === currentEntityTypeName) {
            result = a;
        }
    }
    return result;
};

/**
 * 获取当前对象的EntitySetData
 * @param {object} entityContainer metadata中的entityContainer
 * @param {string} entitySetName 
 * @param {string} fieldValue      smartfield当前显示字段 判断是否显示
 * @returns {name: 'Parties', entityType: 'com.dpbird.Party', navigationPropertyBinding: Array(6)}
 */
const getEntitySetData = (entityContainer, entitySetName, fieldValue) => {
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
 * 获取当前entityType 所有字段的annotations
 * @param {string} entityTypeName c
 * @returns {array} 
 */
const getEntityTypePropertyAnnotations = (entityTypeName) => {
    let result = [];
    const { data } = storage.get(window.micrAppName)
    const { metadata } = data
    const { namespace, annotations } = metadata.dataServices.schema[0];
    annotations.map((item) => {
        if (item.annotation && item.target.search(`${namespace}.${entityTypeName}`) !== -1) {
            result.push(item)
        }
    });
    return result;
};

/**
 * 获取当前对象的annotations,条件所有annotations 中遍历找到对应target = 传入值
 * @param {array} annotations metadata、annotation.xml中的annotations
 * @param {string} target com.dpbird.Party 或对应字段：com.dpbird.Party/partyId
 * @returns {array} 
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
 * 获取当前对象的annotations,条件所有annotations 中遍历找到对应target = 传入值
 * 1.通过entitySet 找到对应的entityType
 * 2.通过entityType 对应的navigation 递归查找对应字段的主对象annotations
 * @param {string} currentEntitySetName 当前主对象的entitySetName
 * @param {string} currentPath 多段式path
 * @param {string} ActionName 如果字段是用于action中
 * @returns {array} 
 */
const parseDataByPath = (currentEntitySetName, currentPath, ActionName) => {
    const { data } = storage.get(window.micrAppName)
    const { metadata } = data
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

    //解析com.sap.vocabularies.Session.v1.StickySessionSupported,得到currentStickySessionData
    let entityContainerAntotations = null, StickySessionData
    if (result.currentEntitySetName) {

        //contatiner 中的annotations
        entityContainerAntotations = getAnnotationByTarget(
            annotations,
            `${namespace}.${entityContainer.name}/${result.currentEntitySetName}`,
        )
        //console.log({ entityContainerAntotations, currentAnnotations: result.currentAnnotations })
        //合并currentAnotations
        if (entityContainerAntotations && entityContainerAntotations.length > 0) {
            result.currentAnnotations = result.currentAnnotations ? result.currentAnnotations.concat(entityContainerAntotations) : entityContainerAntotations
        }

        //stickSessionData
        StickySessionData = getTermData(
            entityContainerAntotations,
            `com.sap.vocabularies.Session.v1.StickySessionSupported`,
        );
        if (StickySessionData && StickySessionData.record) {
            const { record } = StickySessionData
            const obj = {}
            for (let a of record) {
                const { propertyValue } = a
                for (let b of propertyValue) {
                    const { property, string } = b
                    obj[property] = string
                }
            }
            result.currentStickySessionData = obj
        }
    }

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
 * 获取指定term  annotation数据
 * @param {*} currentAnnotations 当前对象的annotations
 * @param {*} termName 指定term name
 * @param {*} qualifierName 没传查没有的
 * @returns 
 */
const getTermData = (currentAnnotations, termName, qualifierName) => {
    let result = false
    if (currentAnnotations && termName) {
        const termIndex = currentAnnotations && currentAnnotations.findLastIndex((item) => {
            const { term, qualifier } = item
            if (qualifierName) {
                return term === termName && qualifier === qualifierName
            } else {
                return term === termName && !qualifier
            }
        });
        result = termIndex !== -1 ? currentAnnotations[termIndex] : false;
    }
    return result
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
    let result;
    const { navigationPropertyBinding } = currentEntitySetData;
    for (let a of navigationPropertyBinding) {
        const { path, target } = a;
        if (path === targetPath) {
            result = target;
        }
    }
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
 * 判断当前字段是否存在当前entityType的property 或关联对象的property (50%)
 * @param {object} record
 * @param {object} currentEntityTypeData
 * @param {array} entityType
 * @returns {boolean}
 */
const isCurrentEntityTypeField = (record, currentEntityTypeData) => {
    const { propertyValue } = record;
    const { property } = currentEntityTypeData;
    let result = true,
        field;
    for (let a of propertyValue) {
        const { property } = a;
        if (property === 'Value') {
            field = getTextValueByData('path', a);
        }
    }
    if (field && field.search('/') === -1) {
        result = property.findIndex((item) => item.name === field) !== -1;
    }
    //console.log({ field, currentEntityTypeData, entityType, result });
    return result;
};

/**
 * 通过href拿到对应的路由获取navigation的配置
 * @param {*} targetPath 
 * @param {*} manifest 
 * @returns 
 */
const getNavigationOptionsByRoute = (targetPath, manifest) => {
    const result = {
        pathname: null,
    };
    const { routeName: currentRoute } = getCurrentRouter();
    const { name, options } = manifest['sap.ui5']['routing']['targets'][currentRoute]
    const { settings } = options;
    const { navigation } = settings;
    if (name === 'sap.fe.templates.ListReport') {
        for (let key of Object.keys(navigation)) {
            result.pathname = `/${navigation[key].detail.route}`;
        }
    }
    if (navigation && navigation[targetPath]) {
        result.pathname = `/${navigation[targetPath].detail.route}`;
    }
    return result;
};

/**
 * 对应字段翻译 使用ant国际化组件
 * @param {*} intl 
 * @param {*} text 
 * @param {*} prefix 
 * @returns 
 */
const getI18nText = (intl, text, prefix) => {
    if (text) {
        let match = text.match(/\{\s*@i18n>(.+?)\}/);
        if (match) {
            let key = prefix ? prefix + '.' + match[1] : match[1];

            return key //intl.formatMessage({ id: key });
            // return (<FormattedMessage id={`${key}`} />);
        }
    }
    return text;
};

//解析action
const getCurrentActionByAnnotations = (actionAnnotations, actions, namespace, annotations) => {
    const result = [];
    //获取label、actionName
    if (actionAnnotations && actionAnnotations instanceof Array) {
        for (let a of actionAnnotations) {
            const obj = {
                label: null,
                actionName: null,
                actionParameter: null,
            };
            const { propertyValue } = a;
            for (let b of propertyValue) {
                const { property } = b;
                if (property === 'Label') {
                    obj.label = getTextValueByData('string', b);
                }
                if (property === 'Action' || property === 'NewAction') {
                    obj.actionName = getTextValueByData('string', b);
                }
            }
            //解析action对应的参数
            if (actions && actions instanceof Array) {
                let { actionName } = obj;
                const arr = actions.filter((item) => `${namespace}.${item.name}` === actionName);
                if (arr.length > 0) {
                    let { parameter, isBound } = arr[0];
                    obj.actionParameter = JSON.parse(JSON.stringify(parameter));
                    if (isBound === 'true') {
                        obj.actionParameter.splice(0, 1);
                    }
                    obj.actionParameter.map((item) => {
                        const { name } = item;
                        const target = `${actionName}/${name}`;
                        const nameAnnotations = getAnnotationByTarget(annotations, target);
                        const defaultValue = getTermData(nameAnnotations, 'UI.ParameterDefaultValue');
                        const hidden = getTermData(nameAnnotations, 'UI.Hidden');
                        if (hidden) {
                            item.hidden = getTextValueByData(`bool`, hidden);
                        }
                        if (defaultValue) {
                            item.defaultValue = getTextValueByData(`string`, defaultValue);
                        }
                    });
                    result.push(obj);
                }
            }
        }
    }
    return result;
};

/**
 * 获取当前对象关联对象的EntityTypeName
 * @param {*} currentEntityTypeData 当前对象
 * @param {*} navigationPropertyPath 目标对象在当前对象中的navigationProperty 的name 字段
 */
const getNavigationEntityTypeNameBycurrentEntityTypeData = (currentEntityTypeData, navigationPropertyPath) => {
    let result
    const { navigationProperty } = currentEntityTypeData;
    for (let a of navigationProperty) {
        const { name, type } = a;
        const typeName = getNameSpaceEntityTypeName(type);
        if (name === navigationPropertyPath) {
            result = typeName;
        }
    }
    return result
}

const getAnnotationByAnnotationPath = (annotationPath, currentAnnotations, currentEntitySetData) => {
    const { data } = storage.get(window.micrAppName)
    const { metadata } = data
    const { entityContainer, annotations } = metadata.dataServices.schema[0];
    let annotation = [];
    let newCurrentAnnotations = JSON.parse(JSON.stringify(currentAnnotations));
    let newAnnotationPath = annotationPath;
    if (annotationPath.indexOf('/') !== -1) {
        //需要找 navigation
        let navigationPath = annotationPath.split('/')[0];
        newAnnotationPath = annotationPath.split('/')[1];

        let navigationEntitySet = getEntitySetByCurrentEntitySetNavigationPropertyBinding(
            currentEntitySetData,
            navigationPath,
        );
        let navigationEntitySetData = getEntitySetData(entityContainer, navigationEntitySet).entitySetData;
        let navigationEntityTypeName = navigationEntitySetData.entityType;
        newCurrentAnnotations = getAnnotationByTarget(annotations, `${navigationEntityTypeName}`);
    }

    newAnnotationPath = newAnnotationPath.replace('@', '');
    let annotationPathArr = newAnnotationPath.split('#');
    let term = annotationPathArr[0];
    let qualifier = annotationPathArr[1];
    newCurrentAnnotations?.some((currentAnnotation) => {
        if (qualifier) {
            if (term == currentAnnotation.term
                && qualifier == currentAnnotation.qualifier) {
                annotation = currentAnnotation;
                return true;
            }
        } else if (term == currentAnnotation.term) {
            annotation = currentAnnotation;
            return true;
        }
    });

    return annotation;
}

/**
 * 根据action名称 遍历后台返回的action数组，返回对应action的配置项
 * @param {*} actionName 
 * @returns 
 */
const parseActionByName = (actionName) => {
    let result = {
        actionData: {},
        complexTypeData: null,
        SideEffects: []
    }
    const { data } = storage.get(window.micrAppName)
    const { metadata } = data
    const { action, complexType, namespace, annotations } = metadata.dataServices.schema[0];
    //console.log({ actionName, action, namespace,annotations,complexType })
    //查找anction对应的参数数据
    if (action && actionName) {
        for (let a of action) {
            const { name } = a
            if (actionName === `${namespace}.${name}`) {
                result.actionData = a
                break
            }
        }
    }
    //查找complexType对应的参数数据
    if (complexType) {
        result.complexTypeData = complexType
    }
    //查找annotations
    if (actionName && annotations) {
        const { record } = getTermData(getAnnotationByTarget(annotations, actionName), 'Common.SideEffects');
        if (record) {
            for (let a of record) {
                const { propertyValue } = a
                for (let b of propertyValue) {
                    const { property, collection } = b
                    if (property === 'TargetEntities') {
                        for (let c of collection) {
                            const { navigationPropertyPath } = c
                            for (let d of navigationPropertyPath) {
                                const { text } = d
                                result.SideEffects.push(text)
                            }
                        }
                    }
                }
            }
        }
    }
    return result
}

/**
 * 
 * @param {*} linkEntity 
 * @param {*} entitySet 
 * @returns 
 */
const getQuickViewEntitySet = (linkEntity, entitySet) => {
    let linkEntitySet = ''
    const { currentEntitySetData } = parseDataByPath(entitySet)

    for (let key of currentEntitySetData.navigationPropertyBinding) {
        if (key.path == linkEntity) {
            linkEntitySet = key.target
        }
    }

    return linkEntitySet
}

export default {
    getEntityType,
    getEntitySetData,
    getEntityTypePropertyAnnotations,
    getAnnotationByTarget,
    parseDataByPath,
    getTextValueByData,
    getPropertyType,
    getTermData,
    getPrimaryKeys,
    isCollection,
    getEntitySetByCurrentEntitySetNavigationPropertyBinding,
    getNameSpaceEntityTypeName,
    generateKey,
    isCurrentEntityTypeField,
    getNavigationOptionsByRoute,
    getI18nText,
    getCurrentActionByAnnotations,
    getNavigationEntityTypeNameBycurrentEntityTypeData,
    getAnnotationByAnnotationPath,
    parseActionByName,
    getQuickViewEntitySet
}