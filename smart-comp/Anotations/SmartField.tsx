/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2023-11-20 15:23:53
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-11-24 20:06:20
 * @FilePath: /Uilab-Application/lib/Uilab-Comp/smart-comp/Anotations/smartTable.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import Odata from '../../utils/odata/odata'
import Utils from '../Process/utils'

/**
 * 解析ValueList
 * @param {*} currentAnnotations
 */
const getValueListProperty = async (
    currentAnnotations,
) => {
    const { metadata } = await Utils.getUi5Config()
    const { annotations } = metadata.dataServices.schema[0];

    let result = {
        collectionPath: null,
        isFixedValues: false,
        columns: [] as any[],
        lookUpTitle: null,
        Parameters: [] as any,
        currentExpand: null as any,
        currentSelect: null as any,
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
    if (ValueListWithFixedValues && ValueListWithFixedValues.length > 0) {
        result.isFixedValues = Utils.getTextValueByData('bool', ValueListWithFixedValues[0]) === 'true';
    }

    //解析ValueList
    const ValueList = Utils.getTermAnnotations(currentAnnotations, 'Common.ValueList') || Utils.getTermAnnotations(currentAnnotations, 'Common.ValueListMapping')
    if (ValueList && ValueList.length > 0) {
        const { record } = ValueList[0]
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
                                        const { currentAnnotations } = await Utils.getEntitySetConfig(result.collectionPath, ValueListProperty)
                                        const label = Utils.getLableByAnnotation(currentAnnotations)
                                        if (result.columns.findIndex((columnItem) => columnItem.path === ValueListProperty) === -1) {
                                            result.columns.push({ path: ValueListProperty, label, type: 'UI.DataField' });
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
const _setRequest = async (collectionPath, columns, Parameters) => {

    //获取查询条件
    const arr = [] as any[]
    columns.map((item) => arr.push(item.path))
    const { currentExpand, currentSelect } = await Utils.getQueryContitionsByAnnotations(
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
    const _getValueListPropertyDisplay = async (ValueListProperty, collectionPath) => {
        let result
        const { metadata } = await Utils.getUi5Config()
        const { annotations, entityContainer } = metadata.dataServices.schema[0];
        const { entitySetData: currentEntitySetData } = Utils.getEntitySetData(entityContainer, collectionPath)
        if (currentEntitySetData) {
            const { entityType: currentEntityTypeName } = currentEntitySetData
            if (ValueListProperty) {
                const anno = Utils.getAnnotationByTarget(
                    annotations,
                    `${currentEntityTypeName}/${ValueListProperty}`,
                );
                const displayText = Utils.getDisplayTextByAnnotation(anno);
                if (displayText) {
                    result = displayText
                }
            }
        }
        return result
    }

    let option = {
        path: collectionPath,
        method: 'GET',
        parameters: {} ,
    };
    if (JSON.stringify(currentExpand) !== '{}') {
        option.parameters.$expand = currentExpand;
    }
    console.log({ currentExpand, currentSelect, arr })

    if (currentSelect.length) {
        option.parameters.$select = currentSelect.toString();
    }

    return async (params) => {
        // if (params && params.option) {
        //     const { option: sendOption } = params
        //     const { $top, $skip, $count } = sendOption
        //     option.parameters = {
        //         ...option.parameters,
        //         $top,
        //         $skip,
        //         $count
        //     }
        //     if (sendOption && sendOption.$top) {
        //         option.parameters.$top = sendOption.$top
        //     } else {
        //         delete option.parameters.$top
        //     }
        //     if (sendOption && sendOption.$skip) {
        //         option.parameters.$skip = sendOption.$skip
        //     } else {
        //         delete option.parameters.$skip
        //     }
        //     if (sendOption && sendOption.$count) {
        //         option.parameters.$count = sendOption.$count
        //     } else {
        //         delete option.parameters.$count
        //     }
        //     if (sendOption && sendOption.$filter) {
        //         option.parameters.$filter = sendOption.$filter
        //     } else {
        //         delete option.parameters.$filter
        //     }
        //     if (sendOption && sendOption.$search) {
        //         option.parameters.$search = sendOption.$search
        //     } else {
        //         delete option.parameters.$search
        //     }
        // }
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
            DisplayProperty =await _getValueListPropertyDisplay(_ValueListProperty, collectionPath)
            value.map((item) => {
                const val = _getDisplayText(item, DisplayProperty, _ValueListProperty)
                arr.push({
                    label: val ? val : item[_ValueListProperty], value: item[_ValueListProperty] 
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
const _setFieldValue = async (currentAnnotations, currentPropertyType, isReadOnly) => {

    let result = {
        fieldType: 'Text',
        valueListConfig: null as any
    }

    //只读返回
    if (isReadOnly) {
        result.fieldType = 'ReadOnly'
        return result
    }

    //判断是否是长文本
    if (Utils.getTermAnnotations(currentAnnotations, 'UI.MultiLineText').length > 0) {
        result.fieldType = 'TextArea';
    }

    //是否 IsImageURL 远端图片地址
    if (Utils.getTermAnnotations(currentAnnotations, 'UI.IsImageURL').length > 0) {
        result.fieldType = 'ImageURL';
    }

    //是否 IsImage 数据库存储
    if (Utils.getTermAnnotations(currentAnnotations, 'UI.IsImage').length > 0) {
        console.log({ a: Utils.getTermAnnotations(currentAnnotations, 'UI.IsImage') })
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
        } = await getValueListProperty(
            currentAnnotations,
        );
        result = {
            fieldType: isFixedValues ? 'Select' : 'LookUp',
            valueListConfig: {
                isFixedValues,
                collectionPath,
                columns,
                lookUpTitle,
                Parameters,
                annoRequest: await _setRequest(collectionPath, columns, Parameters)
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
        default:
            break;
    }

    return result
}

const getConfig = async (params) => {
    const { record, entitySet, path, isReadOnly } = params
    const { currentAnnotations, currentPropertyType } = await Utils.getEntitySetConfig(entitySet, path)
    const { fieldType, valueListConfig } = await _setFieldValue(currentAnnotations, currentPropertyType, isReadOnly)
    const { displayValue, currentValue } = Utils.getFieldReadonlyTextAndCurrentValue(record, path, currentAnnotations)
    // console.log({
    //     fieldType,
    //     displayValue,
    //     currentValue,
    //     currentAnnotations,
    //     valueListConfig
    // })
    return {
        fieldType,
        displayValue,
        currentValue,
        valueListConfig
    }
}

export {
    getConfig
}