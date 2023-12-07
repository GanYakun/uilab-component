/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2022-09-26 17:01:20
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-12-07 17:19:11
 * @FilePath: /uilab-gbms/lib/o3smart-comp/UIPages/ListReport.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import React, { useEffect, useState } from 'react';
import { getConfig } from '../Anotations/SmartField'
import { ProFormDatePicker, ProFormDateRangePicker, ProFormDateTimePicker, ProFormDigit, ProFormSelect, ProFormText, ProFormUploadButton } from '@ant-design/pro-components';
import moment from 'moment';
import { Modal, Typography, message, Image } from 'antd';
import { Rate, Progress } from 'ant5'
import { BlockOutlined } from '@ant-design/icons';
import SmartTable from './SmartTable';
import "./index.less";
import { Criticality as SmartCriticality, dataPointCriticality } from "../Process/config";
import { FormattedMessage } from "react-intl";
import { useModel } from 'umi';
import { defaultImageUrl, imageFallback } from '../Process/config'
import { FrownOutlined, MehOutlined, SmileOutlined } from '@ant-design/icons';


export default (props: any) => {
    const {
        record,
        entitySet,
        path,
        isReadOnly,
        DataFieldWithUrl,
        formRef, // 表单的钩子函数
        showLabel, // 是否显示label字段，与isReadOnly配合使用
        colProps,
        Criticality,
        action,
        dataPoint,
        rules, // 是否为必填字段
        nullable,
    } = props;
    let { initialState, setInitialState } = useModel('@@initialState');
    const [currentState, setCurrentState] = useState<any>()

    const [lookUpVisible, setLookUpVisible] = useState(false);//lookup 显示状态
    const [currentSelected, setCurrentSelected] = useState<any>(null);//lookup选中项
    const [currentValueEnum, setCurrentValueEnum] = useState<any>(null); //下拉选择框暂存
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
        const result = await getConfig({
            record,
            entitySet,
            path,
            isReadOnly,
            DataFieldWithUrl,
            action,
            dataPoint,
            nullable,
            stateTree: initialState?.stateTree
        })
        if (result) {
            const { Label } = result;
            currentFieldProps.label = Label;
            //设置必填
            if (result.nullable) {
                currentFieldProps.rules = [
                    {
                        required: true,
                        message: <FormattedMessage id="smart.errRule" />,
                    },
                ];
            }
            setCurrentState(result)
        }
    }

    useEffect(() => {
        !currentState && init()
    }, [])
    useEffect(() => {
        if (currentState) {
            if (currentState.fieldType === "Select" && currentState.defaultValue) {
                queryValueEnum();
            }
        }
    }, [currentState])
    /**
        * 获取显示的文本内容
        * DisplayProperty有值显示对应值，否则显示columns
        * @param {*} data 
        * @returns 
        */
    const _getDisplayText = (data: any, DisplayProperty: string, ValueListProperty: string | number) => {
        const { columns } = currentState?.valueListConfig || {};
        //是否配置了显示字段
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
            columns.map((item: { path: any; }) => {
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
                            Parameters.map((item: any) => {
                                const { type, ValueListProperty, LocalDataProperty } = item;
                                if (type === 'ValueListParameterOut' || type === 'ValueListParameterInOut') {

                                    //1.inputValue： 表单值 2.inputDisplayValue：表单显示的值
                                    let inputValue = currentSelected[0][ValueListProperty], inputDisplayValue

                                    //DisplayProperty：是否配置了显示字段 没配置显示inputValue
                                    const DisplayProperty = getValueListPropertyDisplay(ValueListProperty, collectionPath)
                                    inputDisplayValue = DisplayProperty ? _getDisplayText(currentSelected[0], DisplayProperty, ValueListProperty) : inputValue

                                    //是否设置表单值
                                    const setField = path === LocalDataProperty || path.search(LocalDataProperty) !== -1 || LocalDataProperty.search(path) !== -1
                                    if (setField) {
                                        currentFieldProps.value = inputValue;
                                    }
                                    setLookUpVisible(false);

                                    //console.log({ path, inputValue, inputDisplayValue, DisplayProperty })
                                    setCurrentValueEnum({ [inputValue]: inputDisplayValue })

                                    //两种form钩子
                                    if (formRef) {
                                        if (formRef?.current) {
                                            formRef?.current?.setFieldsValue({
                                                [path]: inputValue
                                            });
                                        } else {
                                            formRef?.setFieldsValue({
                                                [path]: inputValue
                                            });
                                        }
                                    }
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
                        onSelect={(item: any) => {
                            setCurrentSelected(item)
                        }}
                        hideSelect={true}
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

            result?.map((item: { value: string | number; label: any; Label: any; }) => {
                obj[item.value] = {
                    text: item.label || item.Label
                }
            })
            setCurrentValueEnum(obj);
        }
    };
    //根据fiedType类型渲染内容
    const renderContent = () => {
        const { fieldType, displayValue, valueListConfig, defaultValue, isMultiple } = (currentState || {})
        //设置默认值
        if (defaultValue) {
            currentFieldProps.initialValue = defaultValue;
        }

        switch (fieldType) {
            case 'ReadOnly':
                currentFieldProps.value = displayValue;
                if (showLabel) {
                    if (record && typeof (record[Criticality]) === "number") {
                        return <div id='label-color'>
                            <div>{currentFieldProps.label}</div>
                            <div style={{ color: SmartCriticality[record[Criticality]]?.color || "" }}>
                                <div style={{ marginRight: 4 }}>{SmartCriticality[record[Criticality]]?.icon}</div>
                                <div>{currentFieldProps.value}</div>
                            </div>
                        </div>
                    } else {
                        return <ProFormText
                            {...currentFieldProps}
                            readonly
                        />
                    }
                } else {
                    return (
                        <div style={{ color: record && SmartCriticality[record[Criticality]]?.color || "", display: "flex" }}>
                            <div style={{ marginRight: 4 }}>{SmartCriticality[record[Criticality]]?.icon}</div>
                            <div>{currentFieldProps.value}</div>
                        </div>
                    )
                }
            case 'Text':
                return <ProFormText {...currentFieldProps} />
            case 'Select':
                currentFieldProps.initialValue = currentState.defaultValue;
                //lookup 弹框图片&按钮
                currentFieldProps.fieldProps.onDropdownVisibleChange = async (bool: any) => {
                    if (bool) {
                        queryValueEnum();
                    }
                };
                currentFieldProps.fieldProps.loading = selectLoading;
                if (isMultiple) {
                    currentFieldProps.mode = "multiple";
                }
                return <ProFormSelect
                    {...currentFieldProps}
                    valueEnum={currentValueEnum ? currentValueEnum : {}}

                />
            case 'LookUp':
                const { Parameters } = valueListConfig
                const LocalDataPropertyArr: any = []
                if (Parameters) {
                    for (let a of Parameters) {
                        const { type, LocalDataProperty } = a
                        if (type === 'ValueListParameterIn') {
                            LocalDataPropertyArr.push(LocalDataProperty)
                        }
                    }
                }
                //lookup 弹框图片&按钮
                currentFieldProps.fieldProps.onDropdownVisibleChange = async (bool: any) => {
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
                            valueEnum={currentValueEnum ? currentValueEnum : {}}
                        />
                        {_renderLookUp(valueListConfig)}
                    </>
                );
            case 'Date':
                return <ProFormDatePicker
                    {...currentFieldProps}
                    onBlur={(params: { target: { value: moment.MomentInput; }; }) => {
                        const val = params.target.value
                        const value = val ? moment(params.target.value).format('YYYY-MM-DDTHH:mm:ss.SSSZ') : null
                        // onBlur && _onBlur(value);
                    }}
                />
            case 'DateTime':
                return <ProFormDateTimePicker {...currentFieldProps} />
            case "Hidden":
                return <ProFormText {...currentFieldProps} hidden />
            case "Upload":
                currentFieldProps.label = "";
                currentFieldProps.title = <FormattedMessage id='smart.upload' />;
                currentFieldProps.fieldProps = {
                    beforeUpload: () => false,
                }
                return (
                    <ProFormUploadButton
                        {...currentFieldProps}
                        b
                        max={1}
                    />
                )
            case "DataPoint":
                return <Typography.Title
                    level={2}
                    style={{ color: record && typeof (record[Criticality]) === "number" ? dataPointCriticality[record[Criticality]] : '#6a6d70', fontSize: 26 }
                    }>
                    {displayValue}
                </Typography.Title>
            case 'Number':
                return <ProFormDigit {...currentFieldProps} />
            case 'IsBoolean':
                return (
                    <ProFormSelect
                        {...currentFieldProps}
                        request={async () => [
                            { label: <FormattedMessage id='smart.true' />, value: true },
                            { label: <FormattedMessage id='smart.false' />, value: false },
                        ]}
                    />
                );
            case 'IsImageURL':
                let imageProps = {
                    src: currentState?.currentValue ? currentState.currentValue : imageFallback,
                    width: 50,
                    height: 50,
                    fallback: imageFallback,
                };
                return (
                    <Image
                        {...imageProps}
                        style={{
                            objectFit: 'cover',
                            borderRadius: 5,
                            border: '1px solid #e8e8e8',
                            padding: 5,
                            boxShadow: '0 0 10px #e8e8e8',
                            objectPosition: 'center center'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    />
                )
            case 'DataFieldWithUrl':
                let pathValue, urlValue;
                //判断是否为多段式
                if (DataFieldWithUrl.search('/') === -1) {
                    pathValue = record[path]
                    urlValue = record[DataFieldWithUrl]
                } else {
                    let pathArr = path.split('/'), urlArr = DataFieldWithUrl.split('/')
                    for (let a of pathArr) {
                        pathValue = pathValue ? pathValue[a] : record[a];
                    }
                    for (let a of urlArr) {
                        urlValue = urlValue ? urlValue[a] : record[a];
                    }
                }
                return <a href={urlValue} target="_blank">{pathValue}</a>
            case 'Rating':
                const customIcons: Record<number, React.ReactNode> = {
                    1: <SmileOutlined />,
                    2: <SmileOutlined />,
                    3: <MehOutlined />,
                    4: <FrownOutlined />,
                    5: <FrownOutlined />,
                };
                return (
                    <Rate
                        defaultValue={record[path]}
                        character={({ index }: { index: number }) => customIcons[index + 1]}
                        disabled={true}
                        style={{ color: '#FFA500', fontWeight: 'bold' }}
                    />
                );
            case 'Progress':
                const { TargetValue } = dataPoint
                return (
                    <>
                        <Progress
                            percent={Number((record[path] / TargetValue * 100).toFixed(2))}
                            steps={TargetValue}
                            showInfo={false}
                        />
                        <span style={{ marginLeft: 5 }}>{record[path]}/{TargetValue}</span>
                    </>
                );
            default:
                return <div></div>
        }
    }

    return currentState ? renderContent() : <div />
}
