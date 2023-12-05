/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2023-11-20 15:23:53
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-12-05 14:40:25
 * @FilePath: /Uilab-Application/lib/Uilab-Comp/smart-comp/Anotations/smartTable.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import Odata from '../../utils/odata/odata'
import Utils from '../Process/utils'

/**
 * 解析ValueList
 * @param {*} currentAnnotations
 */
const getValueListProperty = (
    currentAnnotations,
) => {
    const { metadata } = Utils.getUi5ConfigAsync()
    const { annotations } = metadata.dataServices.schema[0];

    let result = {
        collectionPath: null,
        isFixedValues: false,
        columns: [] as any[],
        lookUpTitle: null,
        Parameters: [] as any,
        currentExpand: null as any,
        currentSelect: null as any,
        isMultiple: false
    };

    //解析返回  LocalDataProperty、ValueListProperty
    const _getProperty = (propertyValue) => {
        let LocalDataProperty, ValueListProperty;
        for (let a of propertyValue) {
            const { property } = a;
            if (property === 'ValueListProperty') {
                ValueListProperty = Utils.getTextValueByData('string', a);
            }
            if (property === 'LocalDataProperty') {
                LocalDataProperty = Utils.getTextValueByData('propertyPath', a);
            }
        }
        return {
            LocalDataProperty,
            ValueListProperty,
        };
    };

    //设置返回outObject
    const _setParameters = (type, LocalDataProperty, ValueListProperty) => {
        if (result.Parameters) {
            switch (type) {
                case `Common.ValueListParameterInOut`:
                    result.Parameters.push({
                        type: 'ValueListParameterInOut',
                        LocalDataProperty,
                        ValueListProperty
                    })
                    break;
                case `Common.ValueListParameterOut`:
                    result.Parameters.push({
                        type: 'ValueListParameterOut',
                        LocalDataProperty,
                        ValueListProperty
                    })
                    break;
                case `Common.ValueListParameterIn`:
                    result.Parameters.push({
                        type: 'ValueListParameterIn',
                        LocalDataProperty,
                        ValueListProperty
                    })
                    break;
                case `Common.ValueListParameterDisplayOnly`:
                    result.Parameters.push({
                        type: 'ValueListParameterDisplayOnly',
                        ValueListProperty
                    })
                    break;
                default:
                    break;
            }
        }
    };

    //判断是否是下拉框类型
    const ValueListWithFixedValues = Utils.getTermAnnotations(currentAnnotations, 'Common.ValueListWithFixedValues')
    if (ValueListWithFixedValues) {
        result.isFixedValues = Utils.getTextValueByData('bool', ValueListWithFixedValues) === 'true';
    }

    //解析ValueList
    const ValueList = Utils.getTermAnnotations(currentAnnotations, 'Common.ValueList') || Utils.getTermAnnotations(currentAnnotations, 'Common.ValueListMapping')
    if (ValueList) {
        const { record } = ValueList
        for (let a of record) {
            const { type, propertyValue } = a;
            if (type === 'Common.ValueListType' || type === 'Common.ValueListMappingType') {
                for (let b of propertyValue) {
                    const { property, collection } = b;

                    //lookup title
                    if (property === 'Label') {
                        result.lookUpTitle = Utils.getTextValueByData('string', b);
                    }

                    //查询主对象
                    if (property === 'CollectionPath') {
                        result.collectionPath = Utils.getTextValueByData('string', b);
                    }

                    //解析参数
                    if (property === 'Parameters') {
                        for (let c of collection) {
                            const { record } = c;
                            if (record) {
                                for (let d of record) {
                                    const { type, propertyValue } = d;
                                    const { LocalDataProperty, ValueListProperty } = _getProperty(propertyValue);
                                    if (ValueListProperty && type !== 'Common.ValueListParameterIn') {
                                        const { currentAnnotations } = Utils.getEntitySetConfig(result.collectionPath, ValueListProperty)
                                        const Label = Utils.getLabelByAnnotation(currentAnnotations)
                                        if (result.columns.findIndex((columnItem) => columnItem.path === ValueListProperty) === -1) {
                                            result.columns.push({ path: ValueListProperty, Label, type: 'UI.DataField' });
                                        }
                                    }
                                    _setParameters(type, LocalDataProperty, ValueListProperty);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    return result;
};

/**
 * 设置下拉框请求
 * @param {*} collectionPath //主对象
 * @param {*} currentExpand 
 * @param {*} currentSelect 
 * @returns 
 */
const _setRequest = (collectionPath, columns, Parameters) => {

    //获取查询条件
    const arr = [] as any[]
    columns.map((item) => arr.push(item.path))
    const { currentExpand, currentSelect } = Utils.getQueryContitionsByAnnotations(
        arr,
        collectionPath
    );

    /**
    * 获取显示的文本内容
    * DisplayProperty有值显示对应值，否则显示columns
    * @param {*} data 
    * @returns 
    */
    const _getDisplayText = (data, DisplayProperty, ValueListProperty) => {
        //1.是否配置了显示字段
        if (DisplayProperty) {
            //2.是否是显示关联对象的字段
            if (DisplayProperty.search('/') === -1) {
                return data[DisplayProperty];
            } else {
                const arr = DisplayProperty.split('/');
                let value = data;
                for (let i of arr) {
                    value = value[i];
                }
                return value;
            }
        } else {
            //3.如果没有配置显示多个字段
            let str = ''
            columns.map((item) => {
                const { path } = item
                if (data[path]) {
                    str += ` ${data[path]} `
                }
            })
            if (str !== '') {
                return str
            } else {
                return data[ValueListProperty]
            }
        }
    };

    /**
     * 获取显示字段
     * @param {*} ValueListProperty 
     * @param {*} collectionPath 
     * @returns 
     */
    const _getValueListPropertyDisplay = (ValueListProperty, collectionPath) => {
        let result
        const { metadata } = Utils.getUi5ConfigAsync()
        const { annotations, entityContainer } = metadata.dataServices.schema[0];
        const { entitySetData: currentEntitySetData } = Utils.getEntitySetData(entityContainer, collectionPath)
        if (currentEntitySetData) {
            const { entityType: currentEntityTypeName } = currentEntitySetData
            if (ValueListProperty) {
                const anno = Utils.getAnnotationByTarget(
                    annotations,
                    `${currentEntityTypeName}/${ValueListProperty}`,
                );
                const { pathText } = Utils.getCommonTextByAnnotatons(anno);
                if (pathText) {
                    result = pathText
                }
            }
        }
        return result
    }

    let option = {
        path: collectionPath,
        method: 'GET',
        parameters: {},
    };
    if (JSON.stringify(currentExpand) !== '{}') {
        option.parameters.$expand = currentExpand;
    }
    //console.log({ currentExpand, currentSelect, arr })

    if (currentSelect.length) {
        option.parameters.$select = currentSelect.toString();
    }

    return async (params) => {
        const result = await Odata.submit(option)
        if (result) {
            const { value } = result.data;
            const arr = [] as any;
            let _ValueListProperty, DisplayProperty
            for (let a of Parameters) {
                const { type, ValueListProperty } = a
                if (type === 'ValueListParameterOut' || type === 'ValueListParameterInOut') {
                    _ValueListProperty = ValueListProperty
                }
            }
            DisplayProperty = _getValueListPropertyDisplay(_ValueListProperty, collectionPath)
            value.map((item) => {
                const val = _getDisplayText(item, DisplayProperty, _ValueListProperty)
                arr.push({
                    Label: val ? val : item[_ValueListProperty], value: item[_ValueListProperty]
                })
            });
            return arr
        }
    };
}

/**
 * 设置当前字段的类型
 * @param {*} currentAnnotations 
 * @param {*} currentPropertyType 当前字段，例：Edm.String、Edm.Int64、Edm.DateTimeOffset、Edm.Date
 * @returns 
 */
const _setFieldValue = (currentAnnotations, currentPropertyType, isReadOnly, dataPoint = null) => {
    let result = {
        fieldType: 'Text',
        valueListConfig: null as any,
    }

    //dataPoint
    if (dataPoint) {
        result.fieldType = 'DataPoint';
        const { Visualization } = dataPoint
        switch (Visualization) {
            case 'UI.VisualizationType/Rating':
                result.fieldType = 'Rating'
                break;
            case 'UI.VisualizationType/Progress':
                result.fieldType = 'Progress'
                break;
        }
        return result
    }

    //只读返回
    if (isReadOnly) {
        result.fieldType = 'ReadOnly'
        return result
    }

    //判断是否是长文本
    if (Utils.getTermAnnotations(currentAnnotations, 'UI.MultiLineText')) {
        result.fieldType = 'TextArea';
    }

    //是否 IsImageURL 远端图片地址
    if (Utils.getTermAnnotations(currentAnnotations, 'UI.IsImageURL')) {
        result.fieldType = 'ImageURL';
    }

    //是否 IsImage 数据库存储
    if (Utils.getTermAnnotations(currentAnnotations, 'UI.IsImage')) {
        result.fieldType = 'IsImage';
    }

    //下拉选择 通过annotation 设置对应的查询对象、显示字段信息
    if (Utils.getTermAnnotations(currentAnnotations, 'Common.ValueList') || Utils.getTermAnnotations(currentAnnotations, 'Common.ValueListMapping')) {
        let {
            isFixedValues,
            collectionPath,
            columns,
            lookUpTitle,
            Parameters,
        } = getValueListProperty(
            currentAnnotations,
        );
        return {
            fieldType: isFixedValues ? 'Select' : 'LookUp',
            valueListConfig: {
                isFixedValues,//是否为下拉类型：1.下拉类型Select 2.弹出表格类型LookUp
                collectionPath,//查询的主对象
                columns,//弹出表格类型LookUp 的列配置项
                lookUpTitle,//弹出表格类型LookUp 的弹窗标题
                Parameters,//略
                annoRequest: _setRequest(collectionPath, columns, Parameters)//请求
            }
        }
    }

    //处理数据结构中的字段类型，优先级最高 
    switch (currentPropertyType) {
        case 'Edm.DateTimeOffset':
            result.fieldType = 'DateTime'
            break;
        case 'Edm.Date':
            result.fieldType = 'Date'
            break;
        case 'Edm.Boolean':
            result.fieldType = 'IsBoolean'
            break;
        case 'Edm.Decimal':
            result.fieldType = 'Number'
            break;
        case 'Edm.Int64':
            result.fieldType = 'Number'
            break;
        case 'Edm.Double':
            result.fieldType = 'Number'
            break;
        case 'Edm.Stream':
            result.fieldType = 'Upload'
            break;
        default:
            break;
    }

    //是否 IsImage 数据库存储
    if (Utils.getTermAnnotations(currentAnnotations, 'UI.Hidden')) {
        result.fieldType = 'Hidden';
    }

    return result
}

/**
 * 判断是否必填
 * @param {*} currentAnnotations 
 */
const isNullable = (currentAnnotations, entitySet, path) => {
    let result = false

    //1.Common.FieldControlType/Mandatory
    const mandatory = Utils.getTermAnnotations(currentAnnotations, `Common.FieldControl`);
    if (mandatory && Utils.getTextValueByData(`enumMember`, mandatory) === 'Common.FieldControlType/Mandatory') {
        result = true
    }

    //2.主对象是否配置RequiredProperties
    const { currentAnnotations: entityAnnotations } = Utils.getEntitySetConfig(entitySet)
    for (let a of entityAnnotations) {
        const { term, record } = a
        if ((term === 'Org.OData.Capabilities.V1.InsertRestrictions' || term === 'Capabilities.InsertRestrictions') && record) {
            for (let b of record) {
                const { type, propertyValue } = b
                if ((type === 'Org.OData.Capabilities.V1.InsertRestrictionsType' || type === 'Capabilities.InsertRestrictionsType') && propertyValue) {
                    for (let c of propertyValue) {
                        const { property, collection } = c
                        if (property === 'RequiredProperties') {
                            for (let d of collection) {
                                const { propertyPath } = d
                                if (propertyPath && propertyPath.findIndex((item) => item.text === path) !== -1) {
                                    result = true
                                }
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
 * 获取字段默认值
 * @param {*} currentAnnotations 
 */
const getParameterDefaultValue = (currentAnnotations, record = null, stateTree = null, action = null, namespace = null) => {
    const anno = Utils.getTermAnnotations(currentAnnotations, 'UI.ParameterDefaultValue');
    if (anno) {
        if (Utils.getTextValueByData(`string`, anno)) {
            return Utils.getTextValueByData(`string`, anno)
        } else if (Utils.getTextValueByData(`bool`, anno)) {
            return Utils.getTextValueByData(`bool`, anno) === 'true'
        } else if (Utils.getTextValueByData(`path`, anno)) {
            const path = Utils.getTextValueByData(`path`, anno)
            if (stateTree && action) {
                const { BoundData } = action
                let arr = path.split('/')
                if (BoundData) {
                    let value
                    const { name, type } = BoundData
                    const key = type.replace(`${namespace}.`, '')
                    for (let a of arr) {
                        if (name === a) {
                            value = stateTree[key]?.data
                        } else {
                            if (Array.isArray(value)) {
                                const val = [] as any
                                for (let b of value) {
                                    val.push(b[a])
                                }
                                value = val
                            } else {
                                value = value[a]
                            }
                        }
                    }
                    return value
                }

            }
        }
    }
}

//获取单位
const getUnit = (currentAnnotations) => {
    const record = Utils.getTermAnnotations(currentAnnotations, 'Measures.Unit')
    return Utils.getTextValueByData('string', record)
}

export const getConfig = async (params) => {
    const { record, entitySet, path, isReadOnly, action, dataPoint, stateTree } = params
    const { currentAnnotations, currentPropertyType, namespace } = Utils.getEntitySetConfig(entitySet, path, action?.name)
    const { fieldType, valueListConfig } = _setFieldValue(currentAnnotations, currentPropertyType, isReadOnly, dataPoint)
    const { displayValue, currentValue } = Utils.getFieldDisplayValueAndCurrentValue(record, path, currentAnnotations, currentPropertyType)
    const Label = Utils.getLabelByAnnotation(currentAnnotations)
    const nullable = isNullable(currentAnnotations, entitySet, path)
    const defaultValue = getParameterDefaultValue(currentAnnotations, record, stateTree, action, namespace)
    const unit = getUnit(currentAnnotations)
    const isMultiple = Utils.isMultiSelect(action, path)

    //调试用
    if (path === 'ddFormType') {
        console.log('SmartField-Log', {
            path,
            record,
            currentPropertyType,
            isReadOnly,
            fieldType,
            displayValue,
            currentValue,
            currentAnnotations,
            valueListConfig,
            Label,
            nullable,
            action,
            defaultValue,
            unit,
            dataPoint,
            isMultiple,
            stateTree
        })
    }
    return {
        fieldType,//表单类型
        displayValue,//用户显示的值
        currentValue,//表单的值value
        valueListConfig,//Select的类型需要的参数
        Label,//表单的label
        nullable,//是否必填字段 true:必填
        defaultValue,//默认值
        unit,//单位
        isMultiple,//是否多选
    }
}