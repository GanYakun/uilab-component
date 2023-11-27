/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2022-09-26 17:01:20
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-11-24 19:31:48
 * @FilePath: /uilab-gbms/lib/o3smart-comp/UIPages/ListReport.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import React, { useEffect, useState } from 'react';
import { getConfig } from '../Anotations/SmartField'
import { ProFormDatePicker, ProFormDateRangePicker, ProFormDateTimePicker, ProFormSelect } from '@ant-design/pro-components';
import moment from 'moment';
import { Modal } from 'antd';
import Odata from '../../utils/odata/odata';
import { BlockOutlined } from '@ant-design/icons';
import SmartTable from './SmartTable';

export default (props) => {
    const {
        record,
        entitySet,
        path,
        isReadOnly,
    } = props;
    const [currentState, setCurrentState] = useState<{ fieldType: string, displayValue: any }>()

    const [lookUpVisible, setLookUpVisible] = useState(false);//lookup 显示状态
    const [currentSelected, setCurrentSelected] = useState<any>(null);//lookup选中项

    //字段相关显示属性
    let [currentFieldProps, setCurrentFieldProps] = useState<any>({
        //1.tabel内不显示label 2.优先使用父级传递的label
        name: path,
        fieldProps: {
        }
    });

    //初始化方法
    const init = async () => {
        const result = await getConfig({ record, entitySet, path, isReadOnly })
        if (result) {
            const { label } = result || {};
            currentFieldProps.label = label;
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

        const { columns } = currentState.valueListConfig;

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
        const { lookUpTitle, collectionPath, columns: parentColumns, Parameters, request, getValueListPropertyDisplay } = valueListConfig;
        console.log(lookUpTitle, collectionPath, parentColumns, Parameters, request, getValueListPropertyDisplay);
        return (
            <Modal
                title={lookUpTitle}
                width={'65%'}
                visible={lookUpVisible}
                onCancel={() => setLookUpVisible(false)}
                bodyStyle={{ padding: 0 }}
                onOk={async () => {
                    console.log(currentSelected, Parameters);

                    if (currentSelected && currentSelected.length > 0) {
                        return;

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

                                    //是否设置表单值
                                    const setField = path === LocalDataProperty || path.search(LocalDataProperty) !== -1 || LocalDataProperty.search(path) !== -1

                                    //设置表单内的值
                                    if (setField) {
                                        // if (formRef) {
                                        //     //action modalForm内的lookup
                                        //     formRef.current.setFieldsValue({
                                        //         [path]: cvalue
                                        //     });
                                        // } else {
                                        //     //设置当前字段的值
                                        //     currentFieldProps.value = value
                                        // }
                                    }
                                    // setCurrentValueEnum({ [cvalue]: value })
                                    setLookUpVisible(false);

                                    //stickySession  更新字段 
                                    // const time = 200 * outTime
                                    // if (outTime > 2) {
                                    //     setTimeout(() => {
                                    //         onBlur && _onBlur(cvalue, LocalDataProperty, setField ? tableRef : null)
                                    //     }, time);
                                    // } else {
                                    //     onBlur && _onBlur(cvalue, LocalDataProperty, setField ? tableRef : null)
                                    // }
                                }
                            })
                        }
                        // formRefresh && formRefresh()
                    } else {
                        // message.warning('请选择');
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
                        // $filter={$filter}
                        onSelect={(item) => {
                            setCurrentSelected(item)
                        }}
                    />
                </div>
            </Modal>
        )

    }
    //根据fiedType类型渲染内容
    const renderContent = () => {
        const { fieldType, displayValue, valueListConfig, label } = currentState || {}

        switch (fieldType) {
            case 'ReadOnly':
                return <div>{displayValue}</div>
            case 'Text':
                return <div>{displayValue}</div>
            case 'Select':
                return <ProFormSelect
                    {...currentFieldProps}
                    request={async () => {
                        const result = await valueListConfig.annoRequest()
                        return result
                    }} />
            case 'LookUp':
                console.log({ fieldType, displayValue, valueListConfig, label });

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
                        // valueEnum={
                        //     currentValueEnum ? currentValueEnum : { [currentValue]: displayValue }
                        // }
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
                return (
                    <ProFormDateRangePicker
                        {...currentFieldProps}
                    />
                );
            default:
                return <div></div>
        }
    }

    return currentState ? renderContent() : <div />
}
