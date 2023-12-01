/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2022-09-26 17:01:20
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-12-01 18:02:54
 * @FilePath: /uilab-gbms/lib/o3smart-comp/UIPages/ListReport.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import React, { useEffect, useState } from 'react';
import { getConfig } from '../Anotations/SmartField'
import { ProFormDatePicker, ProFormDateRangePicker, ProFormSelect, ProFormText, ProFormUploadButton } from '@ant-design/pro-components';
import moment from 'moment';
import { Modal, Typography, message } from 'antd';
import { BlockOutlined } from '@ant-design/icons';
import SmartTable from './SmartTable';
import "./index.less";
import { Criticality, dataPointCriticality } from "../Process/config";
import { FormattedMessage } from "react-intl";

export default (props) => {
    const {
        record,
        entitySet,
        path,
        isReadOnly,
        formRef, // 表单的钩子函数
        showLabel, // 是否显示label字段，与isReadOnly配合使用
        colProps,
        valueColor,
        action,
        dataPoint,
        rules, // 是否为必填字段
        nullable,
    } = props;
    const [currentState, setCurrentState] = useState<{ fieldType: string, displayValue: any, valueListConfig: any, defaultValue: string, label: string }>()

    const [lookUpVisible, setLookUpVisible] = useState(false);//lookup 显示状态
    const [currentSelected, setCurrentSelected] = useState<any>(null);//lookup选中项
    const [currentValueEnum, setCurrentValueEnum] = useState(null); //下拉选择框暂存
    const [selectLoading, setSelectLoading] = useState(false);//下拉框是否加载中

    //字段相关显示属性
    let [currentFieldProps, setCurrentFieldProps] = useState<any>({
        //1.tabel内不显示label 2.优先使用父级传递的label
        name: path,
        colProps: colProps || { md: 8, xl: 6 },
        fieldProps: {
        },
        width: "lg",
        rules
    });

    //初始化方法
    const init = async () => {
        const result = await getConfig({ record, entitySet, path, isReadOnly, action, dataPoint, nullable })
        if (result) {
            const { label } = result || {};
            currentFieldProps.label = label;
            //设置必填
            if (result.nullable) {
                currentFieldProps.rules = [
                    {
                        required: true,
                        message: <FormattedMessage id="smart.required" />,
                    },
                ];
            }
            setCurrentState(result)
        }
    }

    useEffect(() => {
        !currentState && init()
    }, [])

    /**
        * 获取显示的文本内容
        * DisplayProperty有值显示对应值，否则显示columns
        * @param {*} data 
        * @returns 
        */
    const _getDisplayText = (data, DisplayProperty, ValueListProperty) => {

        const { columns } = currentState?.valueListConfig || {};

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
    //渲染lookUp
    const _renderLookUp = (valueListConfig: any) => {
        const { lookUpTitle, collectionPath, columns: parentColumns, Parameters, getValueListPropertyDisplay } = valueListConfig;
        return (
            <Modal
                title={lookUpTitle}
                width={'65%'}
                visible={lookUpVisible}
                onCancel={() => setLookUpVisible(false)}
                bodyStyle={{ padding: 0 }}
                onOk={async () => {
                    if (currentSelected && currentSelected.length > 0) {
                        if (Parameters) {
                            Parameters.map((item) => {
                                const { type, ValueListProperty, LocalDataProperty } = item;
                                if (type === 'ValueListParameterOut' || type === 'ValueListParameterInOut') {
                                    let cvalue, value, DisplayProperty//cvalue:currentSelected 中的值 value：显示的值
                                    cvalue = currentSelected[0][ValueListProperty]

                                    //判断选中的值 显示字段
                                    DisplayProperty = getValueListPropertyDisplay ? getValueListPropertyDisplay(ValueListProperty, collectionPath) : false;
                                    value = DisplayProperty ? _getDisplayText(currentSelected[0], DisplayProperty, ValueListProperty) : cvalue

                                    //是否设置表单值
                                    const setField = path === LocalDataProperty || path.search(LocalDataProperty) !== -1 || LocalDataProperty.search(path) !== -1
                                    //设置表单内的值
                                    if (setField) {
                                        currentFieldProps.value = value;
                                    }
                                    setLookUpVisible(false);
                                    formRef.current.setFieldsValue({
                                        [path]: value
                                    });

                                }
                            })
                        }
                    } else {
                        message.warning('请选择');
                    }
                }}
            >
                <div className='uilab-lookup'>
                    <SmartTable
                        entitySet={collectionPath}
                        parentColumns={parentColumns}
                        rowSelection='radio'
                        onSelect={(item) => {
                            setCurrentSelected(item)
                        }}
                    />
                </div>
            </Modal>
        )
    }
    //下拉框请求数据
    const queryValueEnum = async () => {
        if (!currentValueEnum) {
            const { valueListConfig } = (currentState || {});
            setSelectLoading(true);
            let obj: any = {};
            const result = await valueListConfig.annoRequest();
            setSelectLoading(false);
            result?.map((item) => {
                obj[item.value] = {
                    text: item.label
                }
            })
            setCurrentValueEnum(obj);
        }
    };
    //根据fiedType类型渲染内容
    const renderContent = () => {
        const { fieldType, displayValue, valueListConfig, defaultValue } = (currentState || {})

        switch (fieldType) {
            case 'ReadOnly':
                currentFieldProps.value = displayValue;
                if (showLabel) {
                    if (record && typeof (record[valueColor]) === "number") {
                        return <div id='label-color'>
                            <div>{currentFieldProps.label}</div>
                            <div style={{ color: Criticality[record[valueColor]] || "" }}>{currentFieldProps.value}</div>
                        </div>
                    } else {
                        return <ProFormText
                            {...currentFieldProps}
                            readonly
                        />
                    }
                } else {
                    return <div>{displayValue}</div>
                }
            case 'Text':
                return <ProFormText {...currentFieldProps} />
            case 'Select':
                //lookup 弹框图片&按钮
                currentFieldProps.fieldProps.onDropdownVisibleChange = async (bool) => {
                    if (bool) {
                        queryValueEnum();
                    }
                };
                currentFieldProps.fieldProps.loading = selectLoading;
                return <ProFormSelect
                    {...currentFieldProps}
                    valueEnum={currentValueEnum ? currentValueEnum : {}}
                // request={async () => {
                //     const result = await valueListConfig.annoRequest()
                //     return result
                // }} 
                />
            case 'LookUp':
                const { Parameters } = valueListConfig
                const LocalDataPropertyArr: any = []
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
                        setLookUpVisible(true);
                    }
                };
                currentFieldProps.fieldProps.suffixIcon = (
                    <BlockOutlined onClick={async () => {
                        setLookUpVisible(true)
                    }} />
                );
                currentFieldProps.fieldProps.open = false;
                return (
                    <>
                        <ProFormSelect
                            {...currentFieldProps}
                            request={async () => {
                                const result = await valueListConfig.annoRequest()
                                return result
                            }}
                        />
                        {_renderLookUp(valueListConfig)}
                    </>
                );
            case 'Date':
                return <ProFormDatePicker
                    {...currentFieldProps}
                    onBlur={(params) => {
                        const val = params.target.value
                        const value = val ? moment(params.target.value).format('YYYY-MM-DDTHH:mm:ss.SSSZ') : null
                        // onBlur && _onBlur(value);
                    }}
                />
            case 'DateTime':
                return <ProFormDateRangePicker {...currentFieldProps} />
            case "Hidden":
                currentFieldProps.initialValue = defaultValue;
                return <ProFormText {...currentFieldProps} hidden />
            case "Upload":
                currentFieldProps.label = "";
                currentFieldProps.title = <FormattedMessage id='smart.upload' />;
                return <ProFormUploadButton
                    {...currentFieldProps}
                    max={1}
                />
            case "DataPoint":
                return <Typography.Title
                    level={2}
                    style={{ marginLeft: 10, color: record && typeof (record[valueColor]) === "number" ? dataPointCriticality[record[valueColor]] : '#6a6d70', fontSize: 26 }
                    }>
                    {displayValue}
                </Typography.Title>
            default:
                return <div></div>
        }
    }

    return currentState ? renderContent() : <div />
}
