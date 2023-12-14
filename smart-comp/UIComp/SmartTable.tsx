import React, { useRef, useEffect, useState } from 'react';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { getConfig } from '../Anotations/SmartTable';
import SmartField from './SmartField';
import SmartModalForm from './SmartModalForm';
import SmartContactPopover from './SmartContactPopover'
import { history as umiHistory, FormattedMessage } from 'umi';
import { RightOutlined } from '@ant-design/icons';
import { mergeSource } from "../Process/mergeSource";
import { Steps } from '../CustComp';
import { findLastKey } from '@umijs/deps/compiled/lodash';

type GithubIssueItem = {
    url: string;
    id: number;
    number: number;
    title: string;
    labels: {
        name: string;
        color: string;
    }[];
    state: string;
    comments: number;
    created_at: string;
    updated_at: string;
    closed_at?: string;
};

export default (props: any) => {
    const {
        entitySet,
        searchVal,
        navigationRoute,
        rowSelection,
        onSelect,
        parentColumns,
        filterDefaultValue,
        queryEntity,
        targetNavigation,
        onLoad,
        qualifier,
        SmartProps,
        actionRef: parentActionRef,
        hideSelect,
        headerTitle
    } = props;
    const [currentState, setCurrentState] = useState<any>()
    let [columns, setColumns] = useState<ProColumns<GithubIssueItem>[]>([]);

    //表格选中项
    const [currentRowSelection, setCurrentRowSelection] = useState(rowSelection)
    let [currentRecord, setCurrentRecord] = useState<any>()

    let [currentSelectedRowsItem, setCurrentSelectedRowsItem] = useState([])
    const actionRef = parentActionRef ? parentActionRef : useRef()

    //初始化方法
    const init = async () => {
        const result = await getConfig({ entitySet, qualifier })
        if (result) {
            setCurrentState(result)
            const currentColumns = parentColumns ? parentColumns : result?.columns
            Array.isArray(currentColumns) && currentColumns.forEach((item) => {
                const { path, Label, Criticality, CriticalityIsInt, type, Url, IconUrl, value, CriticalityRepresentation } = item || {};
                switch (type) {
                    case 'UI.DataField':
                        columns?.push({
                            title: Label,
                            key: path,
                            dataIndex: path,
                            render: (text, record) => {
                                const option = {
                                    entitySet,
                                    path,
                                    record,
                                    isReadOnly: true,
                                    Criticality,
                                    CriticalityIsInt,
                                    CriticalityRepresentation
                                }
                                return <SmartField {...option} />
                            },
                            onCell: () => {
                                return {
                                    style: {
                                        maxWidth: 150,
                                        overflow: 'hidden',
                                        whiteSpace: 'wrap',
                                        textOverflow: 'ellipsis',
                                    }
                                }
                            },
                        })
                        break;
                    case 'UI.DataFieldWithUrl':
                        columns?.push({
                            title: Label,
                            key: path,
                            dataIndex: path,
                            render: (text, record) => {
                                const option = {
                                    entitySet,
                                    path,
                                    record,
                                    DataFieldWithUrl: {
                                        Url,
                                        IconUrl
                                    }
                                }
                                return <SmartField {...option} />
                            }
                        })
                        break;
                    case 'UI.DataPoint':
                        columns?.push({
                            title: Label,
                            key: path,
                            dataIndex: path,
                            render: (text, record) => {
                                const option = {
                                    dataPoint: value,
                                    entitySet,
                                    path,
                                    record,
                                }
                                return <SmartField {...option} />
                            }
                        })
                        break;
                    case 'Communication.Contact':
                        columns?.push({
                            title: Label,
                            key: path,
                            dataIndex: path,
                            render: (text, record) => {
                                return (
                                    <SmartContactPopover
                                        record={record}
                                        contact={value}
                                    />
                                )
                            }
                        })
                        break;
                    default:
                        break;
                }
            })
            //inLineBtns
            if (result?.inLineBtns.length > 0) {
                const { inLineBtns } = result
                columns.push({
                    title: <FormattedMessage id="smart.action" />,
                    width: 'auto',
                    hideInSearch: true,
                    dataIndex: 'option',
                    fixed: 'right',
                    align: 'center',
                    key: 'option',
                    render: (_, record) => {
                        //添加行内按钮
                        let ele = [] as any
                        inLineBtns.map((item: any, index: number) => {
                            const { Action, Label, type } = item
                            ele.push(
                                <SmartModalForm
                                    key={index}
                                    formType={type}
                                    entitySet={entitySet}
                                    content={{
                                        title: Label,
                                        btnText: Label,
                                        btnType: 'link'
                                    }}
                                    fields={Action?.Fields}
                                    onSubmit={async (body: any) => {
                                        await Action?.annoRequest({
                                            body,
                                            queryEntity: record['@odata.id']
                                        })
                                        actionRef?.current?.reload();
                                    }}
                                    action={Action}
                                />
                            )
                        })
                        return (
                            ele
                        )
                    },
                })
            }

            //自定义列
            if (SmartProps?.length) {
                let source = mergeSource(SmartProps, "SmartTable", [{
                    name: "columns",
                    value: columns
                }])?.columns;
                if (source) {
                    source.forEach((item: any) => {
                        if (item.comName === "Steps") {
                            item.render = (val) => {
                                return <Steps queryEntity={val["@odata.id"]} isInline={true} />
                            }
                        }
                    })
                }
                columns = [...source];
            }
            //是否需要跳转 添加跳转Icon
            if (navigationRoute) {
                columns.push({
                    title: '',
                    width: 20,
                    hideInSearch: true,
                    dataIndex: 'option',
                    fixed: 'right',
                    key: 'navOptoin',
                    align: 'center',
                    disable: true,
                    render: (_) => {
                        return <RightOutlined
                            style={{ color: '#6a6d70', fontSize: '12px', background: 'transparent' }}
                        />
                    }
                })
            }

            setColumns([...columns]);
            onLoad && onLoad();
        } else {
            onLoad && onLoad();
        }
    }
    useEffect(() => {
        !currentState && init()
    }, [])
    useEffect(() => {
        currentState && actionRef?.current?.reloadAndRest();
    }, [searchVal])
    //判断是否需要多选
    useEffect(() => {
        if (currentState && !currentRowSelection) {
            const { headerBtns } = currentState;
            const hasBoundCollectionAction = headerBtns?.findIndex((item: any) => item.Action.isBound && !item.Action.isCollection) !== -1;
            setCurrentRowSelection(hasBoundCollectionAction ? 'checkbox' : false)
        }
    }, [currentState])
    //页面跳转 判断是否是链接
    const _historyPush = (record: any) => {
        if (navigationRoute) {
            umiHistory.push({
                pathname: navigationRoute,
                query: {
                    queryEntity: record['@odata.id']
                },
            })
        }
    }
    //判断是否需要多选或者单选
    const _rowSelection = () => {
        switch (currentRowSelection) {
            case 'radio':
                return {
                    type: `radio`,
                    onChange: (_: any, selectedRowsItem: React.SetStateAction<never[]>) => {
                        setCurrentSelectedRowsItem(selectedRowsItem)
                        onSelect && onSelect(selectedRowsItem);
                    },
                };
            case 'checkbox':
                return {
                    type: `checkbox`,
                    onChange: (_: any, selectedRowsItem: React.SetStateAction<never[]>) => {
                        setCurrentSelectedRowsItem(selectedRowsItem)
                    },
                    getCheckboxProps: () => {
                        //console.log({ record })
                    }
                }
            default:
                break;
        }
    };
    //设置Criticality
    const _setCriticalityByPath = (data) => {
        const indexArr: any = []
        if (currentState?.Criticality && data) {
            data.map((item, index) => {
                indexArr.push({
                    index,
                    level: item[currentState?.Criticality]
                })
            })
        }
        const pro = document.getElementById("ProTable");
        if (indexArr.length > 0 && pro) {
            const tb = Array.from(pro.getElementsByTagName("table"))[0]
            const trArr = Array.from(tb.getElementsByTagName('tr')).filter((item) => {
                return item.className === 'ant-table-row ant-table-row-level-0'
            })
            const enumObj = {
                1: '#b00',
                2: '#eea76a',
                3: '#107e3e'
            }
            for (let a of indexArr) {
                const { index, level } = a;
                if (trArr[index]) {
                    trArr[index].getElementsByTagName("td")[0].style = `border-left: 5px solid ${enumObj[level]}`;
                }
            }
        }
    }
    return (
        <ProTable<GithubIssueItem>
            id='ProTable'
            columns={columns}
            actionRef={actionRef}
            cardBordered
            scroll={{ x: 'max-content' }} // 设置scroll
            request={async (params, sort, filter) => {
                let option: any = {
                    params, sort, filter
                }
                if (currentState) {
                    if (searchVal) {
                        option.searchVal = searchVal;
                    }
                    if (filterDefaultValue) {
                        option.filterDefaultValue = filterDefaultValue;
                    }
                    const result = await currentState.annoRequest(option, parentColumns, queryEntity, targetNavigation);
                    currentRecord = result
                    setCurrentRecord(result)
                    const { value, msg } = result.data;
                    //1.设置key
                    value.map((item: any) => {
                        item.key = item['@odata.id'];
                    });
                    return {
                        data: value,
                        total: result.data['@odata.count'],
                        success: msg,
                        pageSize: params.pageSize,
                        current: params.current,
                    }

                } else {
                    return {};
                }
            }}
            editable={{
                type: 'multiple',
            }}
            columnsState={{
                persistenceKey: 'pro-table-singe-demos',
                persistenceType: 'localStorage',
                onChange(value) {
                    console.log('value: ', value);
                },
            }}
            rowKey="key"
            search={false}
            onRow={(record) => {
                return {
                    onClick: () => {
                        _historyPush(record);
                    }, // 点击行
                    onDoubleClick: () => { },
                    onContextMenu: () => { },
                    onMouseEnter: () => { }, // 鼠标移入行
                    onMouseLeave: () => { },
                };
            }}
            form={{
                layout: 'vertical',
                syncToUrl: (values, type) => {
                    if (type === 'get') {
                        return {
                            ...values,
                            created_at: [values.startTime, values.endTime],
                        };
                    }
                    return values;
                },
            }}
            pagination={{
                pageSize: 10,
            }}
            dateFormatter="string"
            headerTitle={headerTitle}
            toolBarRender={() => [
                //快速创建按钮
                currentState?.quickCreate && !hideSelect && (
                    <SmartModalForm
                        formType={currentState?.quickCreate?.type}
                        entitySet={entitySet}
                        content={{
                            title: currentState?.quickCreate?.Label,
                            btnText: currentState?.quickCreate?.Label,
                            btnType: 'link'
                        }}
                        fields={currentState?.quickCreate?.Fields}
                        onSubmit={async (body: any) => {
                            await currentState?.quickCreate?.annoRequest?.post({
                                body,
                                queryEntity,
                                targetNavigation
                            });
                            actionRef?.current?.reload();
                        }}
                    />
                ),
                //headerBtns
                currentState?.headerBtns && !hideSelect && (
                    currentState?.headerBtns?.map((item: any, index: number) => {
                        const { type, Label, Action, name: actionName } = item
                        return (
                            <SmartModalForm
                                key={index}
                                formType={type}
                                entitySet={entitySet}
                                content={{
                                    title: Label,
                                    btnText: Label,
                                    btnType: 'link'
                                }}
                                fields={Action?.Fields}
                                onSubmit={async (body: any) => {
                                    await Action.annoRequest({
                                        body,
                                        boundActionData: currentSelectedRowsItem,
                                        currentEntitySet: entitySet,
                                        queryEntity,
                                        targetNavigation
                                    })
                                    actionRef?.current?.reload();
                                }}
                                action={item.Action}
                                disabled={Action?.isBound && currentSelectedRowsItem.length === 0 && !Action?.isCollection}
                            />
                        )
                    })
                )
            ]}
            rowSelection={currentRowSelection ? _rowSelection() : findLastKey}
            onLoad={() => {
                setTimeout(() => {
                    if (currentRecord) {
                        const { value } = currentRecord.data
                        _setCriticalityByPath(value);
                    }
                }, 200)
            }}
        />
    );
};