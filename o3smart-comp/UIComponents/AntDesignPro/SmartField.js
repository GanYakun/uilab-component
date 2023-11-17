import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import {
    ProForm,
    ProFormGroup,
    ProFormText,
    ProFormDatePicker,
    ProFormDateTimePicker,
    ProFormDateRangePicker,
    ProFormSelect,
    ProFormTextArea,
    ProFormDigit,
    ProFormRate,
    ProFormSlider
} from '@ant-design/pro-components';
import { BlockOutlined } from '@ant-design/icons';
import { Image, Modal, message, Typography, Button, Card, Popover, List } from 'antd';
import { getConfig } from '../../Anotations/SmartField'
import Odata from '../../../utils/odata/odata';
import { SmartTable } from '../config';
import { useIntl, useModel } from 'umi';
const {
    getFieldReadonlyTextAndCurrentValue
} = Ui
const {
    parseDataByPath,
    getQuickViewEntitySet
} = Other
import moment from 'moment'
import lodash from 'lodash'
import { Ui, Other } from '../../Process';

const SmartField = (props) => {
    const {
        record,
        entitySet,
        path,
        pathType,//action 参数的字段类型
        width,
        rules,
        colProps,
        maxLength,
        isReadOnly,
        disabled,
        onBlur,
        inCell,//是否在table中显示
        inCellName,
        label: parentLabel,
        formRef,
        actionName,
        queryEntity,
        nullable,
        isAvailable,//必须可编辑
        inFilterBar,
        fieldType: parentFieldType,
        dataPointProperty,
        tableRef,//刷新table用
        formRefresh,
    } = props

    let {
        fieldType,
        value: currentValue,
        displayValue,
        label,
        valueList,
        Computed,
        nullable: currentNullable,
        PrimaryKeys,
        currentEntitySetName,
        annoRequest,
        quickViewConfigObj,
        linkEntityTypes,
        currentEntityTypeData,
    } = getConfig({ record, entitySet, path, pathType, actionName, nullable, queryEntity, isReadOnly, inCell, formRef })

    const { initialState, setInitialState } = useModel('@@initialState');
    const intl = useIntl();
    fieldType = parentFieldType ? parentFieldType : fieldType//父级传递了类型使用父级，DataPoint等情况
    const [currentValueEnum, setCurrentValueEnum] = useState(null); //下拉选择框暂存
    const [selectLoading, setSelectLoading] = useState(false);//下拉框是否加载中
    const [lookUpVisible, setLookUpVisible] = useState(false);//lookup 显示状态
    const [currentSelected, setCurrentSelected] = useState(null);//lookup选中项
    const [requestData, setRequestData] = useState(null)

    //label进行判定
    const _getLabel = () => {
        const currentLabel = parentLabel ? parentLabel : label
        let result = path
        //判断是否在table的cell中
        if (inCell) {
            result = null
        } else {
            if (currentLabel) {
                if (currentLabel.search('@i18n>') === -1) {
                    result = `${currentLabel} : `
                } else {
                    result = `${intl.formatMessage(
                        {
                            id: currentLabel,
                        },
                    )} :`
                }
            }
        }
        return result
    }

    //字段相关显示属性
    let [currentFieldProps, setCurrentFieldProps] = useState({
        width,
        rules,
        //1.tabel内不显示label 2.优先使用父级传递的label
        label: _getLabel(),
        name: inCellName ? inCellName : path,
        colProps: !colProps && { md: 8, xl: 6 },
        readonly: isAvailable ? false : !actionName && (isReadOnly || Computed),
        fieldProps: {
            maxLength,
            disabled,
        },
    });

    //调试用
    // if (path === 'fromDate') {
    //     console.log({
    //         path,
    //         Computed,
    //         nullable,
    //         fieldType,
    //         currentNullable,
    //         isAvailable,
    //         currentValue,
    //         displayValue,
    //         label,
    //         isAvailable,
    //         currentFieldProps,
    //         record
    //     })
    // }

    //设置Select下拉框requset
    if (fieldType === 'Select') {
        currentFieldProps.fieldProps.onDropdownVisibleChange = (bool) => {
            if (bool) {
                queryValueEnum();
            }
        };
    }

    //设置必填
    if (currentNullable && !inFilterBar) {
        currentFieldProps.rules = [
            {
                required: true,
                message: '当前字段必须填写',
            },
        ];
    }

    //设置value
    if (currentFieldProps.readonly) {
        currentFieldProps.value = displayValue;
    } else {
        if (!currentFieldProps.fieldProps.defaultValue) {
            currentFieldProps.fieldProps.defaultValue = currentValue;
        }
    }

    //如果是form表单的字段 设置表单默认值
    useEffect(() => {
        if (formRef && formRef.current) {
            formRef.current.setFieldsValue({
                [path]: (fieldType === 'Date' || fieldType === 'DateTime') ? displayValue : currentValue
            });
        }
    }, [formRef, currentValue])

    /**
        * 获取显示的文本内容
        * DisplayProperty有值显示对应值，否则显示columns
        * @param {*} data 
        * @returns 
        */
    const _getDisplayText = (data, DisplayProperty, ValueListProperty) => {

        const { columns } = valueList

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

    //下拉框请求数据
    const queryValueEnum = async () => {
        const { request, Parameters, collectionPath, getValueListPropertyDisplay } = valueList
        setSelectLoading(true);
        const $filter = _getValueListFilter()
        const result = await request({ option: { $filter } })
        if (result) {
            setSelectLoading(false);
            const { value } = result.data;
            const obj = {};
            let _ValueListProperty, DisplayProperty
            for (let a of Parameters) {
                const { type, ValueListProperty } = a
                if (type === 'ValueListParameterOut' || type === 'ValueListParameterInOut') {
                    _ValueListProperty = ValueListProperty
                }
            }
            DisplayProperty = getValueListPropertyDisplay(_ValueListProperty, collectionPath)

            value.map((item) => {
                const val = _getDisplayText(item, DisplayProperty, _ValueListProperty)
                obj[item[_ValueListProperty]] = val ? val : item[_ValueListProperty];
            });

            setCurrentValueEnum(obj);
        }
    };

    const setQuickViewRequest = async () => {
        let linkEntity = {}
        let linkKey = path
        for (let key of linkEntityTypes) {
            if (path == key.linkKey) {
                linkEntity = key.linkEntity
            }
        }
        const result = await annoRequest({ linkKey, linkEntity })
        setRequestData(result)
    }

    const FieldGroup = () => {
        let resultData = {}
        let formValue = []
        let sectionLabel = {}
        resultData = requestData ? requestData.data : ""
        for (let key of quickViewConfigObj.sections) {
            if (key.linkKey == path && key.section.length > 0) {
                for (let key2 of key.section) {
                    if (key2.targetData !== undefined && key2.targetData.type == 'form') {
                        for (let key3 of key2.targetData.value) {
                            formValue.push(key3)
                            sectionLabel = key2.label
                        }
                    }
                }
            }
        }

        const FieldGroupElement = formValue.map((item, index) => {
            let linkEntity = {}
            for (let key of linkEntityTypes) {
                if (path == key.linkKey) {
                    linkEntity = key.linkEntity
                }
            }
            const { label, record } = item;
            const path2 = record.path;

            let linkEntitySet = getQuickViewEntitySet(linkEntity, entitySet)
            let value = ''
            if (path2.search('/') != -1) {
                let array = path2.split('/')
                if (resultData != "") {
                    value = resultData[array[0].toString()][array[1].toString()]

                }
            } else {
                const { currentAnnotations } = parseDataByPath(linkEntitySet, path2)
                const { readonlyTextValue } = getFieldReadonlyTextAndCurrentValue(resultData, currentAnnotations, path2)
                value = readonlyTextValue
            }
            return (
                <ProFormText
                    key={`field-${index}`}
                    readonly={true}
                    value={value}
                    name={path2}
                    label={label}
                />
            );
        })
        return (
            formValue.length > 0 ?
                <div>
                    <div style={{ marginBottom: '15px', fontSize: "18px", display: 'block' }}>{sectionLabel}</div>
                    {FieldGroupElement}
                </div> : <div></div>
        )
    }

    const QuickViewList = () => {
        return (
            <Card style={{ width: 380 }} bordered={false}>
                <ProForm readonly={true}
                    autoFocusFirstInput
                    submitter={false}
                >
                    <FieldGroup />
                </ProForm>
            </Card>
        )
    }

    //查询语义化
    const _getLocalDataPropertyValue = async (LocalDataPropertyArr) => {
        const option = {
            path: record['@odata.id'],
            method: 'GET',
            parameters: {
                $select: LocalDataPropertyArr.toString()
            },
        }

        if (window['SAP-ContextId']) {
            option.headers = {
                'SAP-ContextId': window['SAP-ContextId'],
            }
        }
        const result = await Odata.submit(option)
        console.log({ result, currentEntityTypeData })
        initialState.stateTree[currentEntityTypeData.name].newActionBackData = result.data
        setInitialState(initialState)
    }

    //设置valueList filter
    const _getValueListFilter = () => {
        const { Parameters, action, namespace } = valueList
        const stateTree = initialState.stateTree
        let $filter

        //获取filter url
        const getFiterUrl = (url) => {
            if ($filter) {
                $filter += ` and ${url}`
            } else {
                $filter = url
            }
            return $filter
        }


        //console.log({ Parameters, action, namespace, stateTree, actionName, inCell })
        //1.action中的in
        if (actionName) {
            if (Parameters && stateTree) {
                for (let a of Parameters) {
                    const { type, LocalDataProperty, ValueListProperty } = a
                    if (type === 'ValueListParameterIn') {
                        const arr = LocalDataProperty.split('/')
                        if (arr.length > 1) {
                            let currentEntityType, currentData
                            for (let b of action) {
                                const { name, parameter } = b
                                if (`${namespace}.${name}` === actionName) {
                                    for (let c of parameter) {
                                        const { name, type } = c
                                        if (arr[0] === name) {
                                            currentEntityType = type
                                            for (let key of Object.keys(stateTree)) {
                                                if (type === `${namespace}.${key}`) {
                                                    currentData = stateTree[key]
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            //console.log({ currentEntityType, currentData, actionName, action })
                            if (currentEntityType && currentData) {
                                arr.map((item, index) => {
                                    if (index > 0) {
                                        const { data, navigationProperty } = currentData
                                        //最后一项是字段
                                        if (index === arr.length - 1 && data && data[item]) {
                                            $filter = getFiterUrl(`${ValueListProperty} eq '${data[item]}'`)

                                        } else {
                                            navigationProperty.map((citem) => {
                                                const { name, type } = citem
                                                for (let key of Object.keys(stateTree)) {
                                                    if (name === item && type === `${namespace}.${key}`) {
                                                        currentData = stateTree[key]
                                                    }
                                                }
                                            })
                                        }
                                    }
                                })
                            }
                        }
                        //console.log('valueList-filter', { type, LocalDataProperty, ValueListProperty, $filter, stateTree })
                    }
                }
            }
            //console.log({ path, $filter, stateTree, Parameters, action, namespace, record })
        } else {
            //2.fieldGroup中的in QuickCreateFacets
            if (!inCell) {
                if (Parameters && stateTree) {
                    for (let a of Parameters) {
                        const { type, LocalDataProperty, ValueListProperty } = a
                        if (type === 'ValueListParameterIn') {
                            //一段情况
                            if (LocalDataProperty.search('/') === -1) {
                                const { name: currentEntityType } = currentEntityTypeData
                                let currentData = stateTree[currentEntityType]
                                if (currentEntityType && currentData) {
                                    const { data } = currentData
                                    if (data && data[LocalDataProperty]) {
                                        $filter = getFiterUrl(`${ValueListProperty} eq '${data[LocalDataProperty]}'`)
                                    }
                                }
                            } else {
                                const arr = LocalDataProperty.split('/')
                                //一段情况
                                if (arr.length > 0) {
                                    let currentEntityType = arr[0], currentData
                                    for (let key of Object.keys(stateTree)) {
                                        if (currentEntityType === key) {
                                            currentData = stateTree[key]
                                        }
                                    }
                                    if (currentEntityType && currentData) {
                                        arr.map((item, index) => {
                                            if (index > 0) {
                                                const { data, navigationProperty } = currentData
                                                //最后一项是字段
                                                if (index === arr.length - 1 && data && data[item]) {
                                                    $filter = getFiterUrl(`${ValueListProperty} eq '${data[item]}'`)
                                                } else {
                                                    navigationProperty.map((citem) => {
                                                        const { name, type } = citem
                                                        for (let key of Object.keys(stateTree)) {
                                                            if (name === item && type === `${namespace}.${key}`) {
                                                                currentData = stateTree[key]
                                                            }
                                                        }
                                                    })
                                                }
                                            }
                                        })
                                    }
                                }
                            }
                        }
                    }
                }
                //console.log({ path, stateTree, $filter, Parameters, action, namespace, record })
            } else {
                //3.LineItem中的in
                if (Parameters && stateTree) {
                    for (let a of Parameters) {
                        const { type, LocalDataProperty, ValueListProperty } = a
                        if (type === 'ValueListParameterIn') {
                            //目前支持一段
                            if (LocalDataProperty.search('/') === -1) {
                                const { name: currentEntityType } = currentEntityTypeData
                                let currentData = stateTree[currentEntityType]
                                if (currentEntityType && currentData) {
                                    const { data, newActionBackData } = currentData
                                    //newAction 设置的返回值
                                    if (newActionBackData && newActionBackData[LocalDataProperty]) {
                                        $filter = getFiterUrl(`${ValueListProperty} eq '${newActionBackData[LocalDataProperty]}'`)
                                    }
                                }
                            } else {
                                const arr = LocalDataProperty.split('/')
                            }
                        }
                    }
                }
                //console.log({ path, $filter, Parameters, action, namespace, record })
            }
        }
        return $filter
    }

    //渲染lookUp
    const _renderLookUp = () => {
        const { lookUpTitle, collectionPath, columns: parentColumns, Parameters, request, getValueListPropertyDisplay } = valueList
        let $filter = _getValueListFilter()
        return (
            <Modal
                layout="horizontal"
                title={lookUpTitle ? lookUpTitle : _getLabel()}
                width={'65%'}
                open={lookUpVisible}
                onCancel={() => setLookUpVisible(false)}
                bodyStyle={{ padding: 0 }}
                onOk={async () => {
                    if (currentSelected && currentSelected.length>0) {
                        if (Parameters) {
                            let outTime = 1
                            Parameters.map((a, index) => {
                                const { type, ValueListProperty, LocalDataProperty } = a
                                if (type === 'ValueListParameterOut' || type === 'ValueListParameterInOut') {
                                    outTime++
                                    let cvalue, value, DisplayProperty//cvalue:currentSelected 中的值 value：显示的值
                                    cvalue = currentSelected[0][ValueListProperty]

                                    //判断选中的值 显示字段
                                    DisplayProperty = getValueListPropertyDisplay(ValueListProperty, collectionPath)
                                    value = DisplayProperty ? _getDisplayText(currentSelected[0], DisplayProperty, ValueListProperty) : cvalue

                                    //console.log({ path, cvalue, value, LocalDataProperty, ValueListProperty, currentSelected })

                                    //是否设置表单值
                                    const setField = path === LocalDataProperty || path.search(LocalDataProperty) !== -1 || LocalDataProperty.search(path) !== -1

                                    //设置表单内的值
                                    if (setField) {
                                        if (formRef) {
                                            //action modalForm内的lookup
                                            formRef.current.setFieldsValue({
                                                [path]: cvalue
                                            });
                                        } else {
                                            //设置当前字段的值
                                            currentFieldProps.value = value
                                        }
                                    }
                                    setCurrentValueEnum({ [cvalue]: value })
                                    setLookUpVisible(false);

                                    //stickySession  更新字段 
                                    const time = 200 * outTime
                                    if (outTime > 2) {
                                        setTimeout(() => {
                                            onBlur && _onBlur(cvalue, LocalDataProperty, setField ? tableRef : null)
                                        }, time);
                                    } else {
                                        onBlur && _onBlur(cvalue, LocalDataProperty, setField ? tableRef : null)
                                    }
                                }
                            })
                        }
                        formRefresh && formRefresh()
                    } else {
                        message.warning('请选择');
                    }
                }}
            >
                <div className='uilab-lookup'>
                    <SmartTable
                        // actionRef={actionRef}
                        use$Search={true}
                        entitySet={collectionPath}
                        search={false}
                        defaultPageSize={5}
                        parentColumns={parentColumns}
                        parentRequest={(option) => request(option)}
                        rowSelection='radio'
                        inLookup={true}
                        // $search={$search}
                        $filter={$filter}
                        onSelect={(item) => {
                            setCurrentSelected(item)
                        }}
                    />
                </div>
            </Modal>
        );
    }

    //失去焦点触发事件
    const _onBlur = (value, path, ref) => {
        onBlur(value, path, currentEntitySetName, PrimaryKeys, ref)
    }

    //渲染入口
    const _render = () => {

        //readonly 1.图片类型 2.table内
        if (isReadOnly && inCell && fieldType !== 'ImageURL' && fieldType !== 'IsImage' && fieldType !== 'QuickViewString') {
            if (fieldType === 'IsBoolean') {
                return currentValue ? '是' : '否'
            }
            if (displayValue instanceof Array) {
                let text = displayValue.length > 0 ? `${displayValue.length}个项目` : ''
                if (displayValue.length === 1) {
                    return <div>{displayValue}</div>
                }
                const content = () => {
                    return (
                        <List
                            size="small"
                            dataSource={displayValue}
                            renderItem={(item) => <List.Item>{item}</List.Item>}
                        />
                    );
                }

                return (
                    <Popover placement="right" content={content} trigger="click">
                        <a onClick={(e) => e.stopPropagation()}>{text}</a>
                    </Popover>
                )
            } else {
                return <div>{displayValue}</div>
            }
        }

        const { name, readonly } = currentFieldProps
        const { TargetValue } = dataPointProperty ? dataPointProperty : {}

        let options

        switch (fieldType) {
            case 'QuickViewString':
                return (
                    <Popover placement="right" title="Quick View" content={QuickViewList()} trigger="click">
                        <Button
                            onClick={(e) => {
                                e.stopPropagation()
                                setQuickViewRequest()
                            }}
                            type="link" >{displayValue}
                        </Button>
                    </Popover>
                )
            case 'Select':
                if (currentFieldProps) {
                    currentFieldProps.fieldProps.loading = selectLoading;
                }
                return (
                    <ProFormSelect
                        {...currentFieldProps}
                        valueEnum={currentValueEnum ? currentValueEnum : { [currentValue]: displayValue }}
                        placeholder="请选择"
                        onChange={(params) => {
                            formRefresh && formRefresh()
                            onBlur && _onBlur(params);
                        }}
                    />
                );
            case 'LookUp':
                const { Parameters } = valueList
                const LocalDataPropertyArr = []
                if (Parameters) {
                    for (let a of Parameters) {
                        const { type, LocalDataProperty, ValueListProperty } = a
                        if (type === 'ValueListParameterIn') {
                            LocalDataPropertyArr.push(LocalDataProperty)
                        }
                    }
                }

                //lookup 弹框图片&按钮
                currentFieldProps.fieldProps.onDropdownVisibleChange = async (bool) => {
                    if (bool) {
                        if (LocalDataPropertyArr.length > 0 && record && record['@odata.id'] && inCell) {
                            await _getLocalDataPropertyValue(LocalDataPropertyArr)
                        }
                        setLookUpVisible(true);
                    }
                };
                currentFieldProps.fieldProps.suffixIcon = (
                    <BlockOutlined onClick={async () => {
                        if (LocalDataPropertyArr.length > 0 && record && record['@odata.id'] && inCell) {
                            await _getLocalDataPropertyValue(LocalDataPropertyArr)
                        }
                        setLookUpVisible(true)
                    }} />
                );
                currentFieldProps.fieldProps.open = false;
                //清除按钮
                currentFieldProps.fieldProps.onClear = () => {
                    if (formRef) {
                        formRef.current.setFieldsValue({
                            [path]: null,
                        });
                    }
                };
                return (
                    <>
                        <ProFormSelect
                            {...currentFieldProps}
                            valueEnum={
                                currentValueEnum ? currentValueEnum : { [currentValue]: displayValue }
                            }
                        />
                        {_renderLookUp()}
                    </>
                );
            case 'Date':
                return (
                    <ProFormDatePicker
                        {...currentFieldProps}
                        onBlur={(params) => {
                            const val = params.target.value
                            const value = val ? moment(params.target.value).format('YYYY-MM-DDTHH:mm:ss.SSSZ') : null
                            onBlur && _onBlur(value);
                        }}
                    />
                );
            case 'DateTime':
                return (
                    !inFilterBar ? < ProFormDateTimePicker
                        {...currentFieldProps}
                        onBlur={(params) => {
                            const val = params.target.value
                            const value = val ? moment(params.target.value).format('YYYY-MM-DDTHH:mm:ss.SSSZ') : null
                            onBlur && _onBlur(value);
                        }}
                    /> : <ProFormDateRangePicker
                        {...currentFieldProps}
                        onBlur={() => {
                            // const value = moment(params).format('YYYY-MM-DDTHH:mm:ss.SSSZ')
                            // onBlur && onBlur({ path: value }, fieldType);
                        }}
                    />
                );
            case 'TextArea':
                return (
                    <ProFormTextArea
                        {...currentFieldProps}
                        onBlur={(params) => {
                            onBlur && _onBlur(params.target.value);
                        }}
                    />
                );
            case 'Number':
                //设置Number类型的最大数字
                currentFieldProps.fieldProps.maxLength = 19

                return (
                    !readonly ? <ProFormDigit
                        {...currentFieldProps}
                        onBlur={(params) => {
                            onBlur && _onBlur(parseFloat(params?.target?.value || params));
                        }}
                    /> : <ProFormText
                        {...currentFieldProps}
                    />
                );
            case 'IsBoolean':
                return (
                    <ProFormSelect
                        {...currentFieldProps}
                        request={async () => [
                            { label: '是', value: true },
                            { label: '否', value: false },
                        ]}
                        placeholder="请选择"
                        onChange={(params) => {
                            formRefresh && formRefresh()
                            onBlur && _onBlur(params);
                        }}
                    />
                );
            case 'Hidden':
                currentFieldProps.initialValue = currentValue;
                return (
                    <div style={{ display: 'none' }}>
                        <ProFormText {...currentFieldProps} />
                    </div>
                );
            case 'ImageURL':
                if (isReadOnly) {
                    let imageProps = {
                        src: '',
                        width: '4.5rem',
                        height: '4.5rem'
                    };
                    if (record) {
                        imageProps.src = currentValue;
                    }
                    if (currentValue === null) {
                        return <Image
                            width={'4.5rem'}
                            height={'4.5rem'}
                            src="error"
                            fallback="data:image/png;base64,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"
                        />
                    }
                    return <Image {...imageProps} style={{ background: '#eee' }} />
                } else {
                    return <ProFormText {...currentFieldProps} />;
                }
            case 'IsImage':
                let imageProps = {
                    src: `${window.location.origin}/${window.serviceUrl}${record['@odata.id']}/${path}`,
                    width: '44px',
                    height: '44px',
                    preview: {
                        maskClassName: 'uilab-imageMask'
                    },
                    fallback: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3PTWBSGcbGzM6GCKqlIBRV0dHRJFarQ0eUT8LH4BnRU0NHR0UEFVdIlFRV7TzRksomPY8uykTk/zewQfKw/9znv4yvJynLv4uLiV2dBoDiBf4qP3/ARuCRABEFAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghgg0Aj8i0JO4OzsrPv69Wv+hi2qPHr0qNvf39+iI97soRIh4f3z58/u7du3SXX7Xt7Z2enevHmzfQe+oSN2apSAPj09TSrb+XKI/f379+08+A0cNRE2ANkupk+ACNPvkSPcAAEibACyXUyfABGm3yNHuAECRNgAZLuYPgEirKlHu7u7XdyytGwHAd8jjNyng4OD7vnz51dbPT8/7z58+NB9+/bt6jU/TI+AGWHEnrx48eJ/EsSmHzx40L18+fLyzxF3ZVMjEyDCiEDjMYZZS5wiPXnyZFbJaxMhQIQRGzHvWR7XCyOCXsOmiDAi1HmPMMQjDpbpEiDCiL358eNHurW/5SnWdIBbXiDCiA38/Pnzrce2YyZ4//59F3ePLNMl4PbpiL2J0L979+7yDtHDhw8vtzzvdGnEXdvUigSIsCLAWavHp/+qM0BcXMd/q25n1vF57TYBp0a3mUzilePj4+7k5KSLb6gt6ydAhPUzXnoPR0dHl79WGTNCfBnn1uvSCJdegQhLI1vvCk+fPu2ePXt2tZOYEV6/fn31dz+shwAR1sP1cqvLntbEN9MxA9xcYjsxS1jWR4AIa2Ibzx0tc44fYX/16lV6NDFLXH+YL32jwiACRBiEbf5KcXoTIsQSpzXx4N28Ja4BQoK7rgXiydbHjx/P25TaQAJEGAguWy0+2Q8PD6/Ki4R8EVl+bzBOnZY95fq9rj9zAkTI2SxdidBHqG9+skdw43borCXO/ZcJdraPWdv22uIEiLA4q7nvvCug8WTqzQveOH26fodo7g6uFe/a17W3+nFBAkRYENRdb1vkkz1CH9cPsVy/jrhr27PqMYvENYNlHAIesRiBYwRy0V+8iXP8+/fvX11Mr7L7ECueb/r48eMqm7FuI2BGWDEG8cm+7G3NEOfmdcTQw4h9/55lhm7DekRYKQPZF2ArbXTAyu4kDYB2YxUzwg0gi/41ztHnfQG26HbGel/crVrm7tNY+/1btkOEAZ2M05r4FB7r9GbAIdxaZYrHdOsgJ/wCEQY0J74TmOKnbxxT9n3FgGGWWsVdowHtjt9Nnvf7yQM2aZU/TIAIAxrw6dOnAWtZZcoEnBpNuTuObWMEiLAx1HY0ZQJEmHJ3HNvGCBBhY6jtaMoEiJB0Z29vL6ls58vxPcO8/zfrdo5qvKO+d3Fx8Wu8zf1dW4p/cPzLly/dtv9Ts/EbcvGAHhHyfBIhZ6NSiIBTo0LNNtScABFyNiqFCBChULMNNSdAhJyNSiECRCjUbEPNCRAhZ6NSiAARCjXbUHMCRMjZqBQiQIRCzTbUnAARcjYqhQgQoVCzDTUnQIScjUohAkQo1GxDzQkQIWejUogAEQo121BzAkTI2agUIkCEQs021JwAEXI2KoUIEKFQsw01J0CEnI1KIQJEKNRsQ80JECFno1KIABEKNdtQcwJEyNmoFCJAhELNNtScABFyNiqFCBChULMNNSdAhJyNSiECRCjUbEPNCRAhZ6NSiAARCjXbUHMCRMjZqBQiQIRCzTbUnAARcjYqhQgQoVCzDTUnQIScjUohAkQo1GxDzQkQIWejUogAEQo121BzAkTI2agUIkCEQs021JwAEXI2KoUIEKFQsw01J0CEnI1KIQJEKNRsQ80JECFno1KIABEKNdtQcwJEyNmoFCJAhELNNtScABFyNiqFCBChULMNNSdAhJyNSiECRCjUbEPNCRAhZ6NSiAARCjXbUHMCRMjZqBQiQIRCzTbUnAARcjYqhQgQoVCzDTUnQIScjUohAkQo1GxDzQkQIWejUogAEQo121BzAkTI2agUIkCEQs021JwAEXI2KoUIEKFQsw01J0CEnI1KIQJEKNRsQ80JECFno1KIABEKNdtQcwJEyNmoFCJAhELNNtScABFyNiqFCBChULMNNSdAhJyNSiEC/wGgKKC4YMA4TAAAAABJRU5ErkJggg=="

                }
                return (
                    <div style={{ width: 44, height: 44, background: 'eee' }} onClick={(e) => {
                        e.stopPropagation()
                    }}>
                        <Image {...imageProps} style={{ background: '#eee' }} />
                    </div>
                )
            case 'Rate':
                options = {
                    name,
                    disabled: readonly,
                    value: currentValue
                }
                return <ProFormRate
                    {...options}
                    onChange={(params) => {
                        onBlur && _onBlur(params);
                    }} />
            case 'Progress':
                options = {
                    name,
                    disabled: readonly,
                    value: currentValue,
                    min: 0,
                    max: parseInt(TargetValue)
                }
                return <ProFormSlider
                    {...options}
                    onChange={lodash.throttle((params) => {
                        onBlur && _onBlur(params);
                    }, 2000)} />
            case 'KeyValue':
                return readonly ? < Typography.Title level={2} style={{ marginLeft: 10 }
                }>
                    {currentValue}
                </Typography.Title > : <ProFormDigit
                    {...currentFieldProps}
                    onBlur={(params) => {
                        onBlur && _onBlur(parseFloat(params.target.value));
                    }}
                />
            default:
                return (
                    <ProFormText
                        {...currentFieldProps}
                        onBlur={(params) => {
                            onBlur && _onBlur(params.target.value);
                        }}
                    />
                );
        }
    }

    return !(!isAvailable && (isReadOnly || Computed)) && inCell ?
        <div onClick={(e) => {
            e.stopPropagation()
        }}>
            {_render()}
        </div> : _render()
};

SmartField.propTypes = {
    entitySet: PropTypes.string.isRequired,
    path: PropTypes.string.isRequired,
};

SmartField.defaultProps = {
    maxLength: 40,
    placeholder: '请输入内容',
    width: 'md',
    multiple: false,
    isReadOnly: false,
    showArrow: true,
    rules: [],
    disabled: false,
};

export default SmartField;