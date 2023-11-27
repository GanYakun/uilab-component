import React, { useRef, useEffect, useState } from 'react';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { getConfig } from '../Anotations/SmartTable';
import SmartField from './SmartField';
import { history as umiHistory } from 'umi';

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

export default (props) => {
    const {
        entitySet,
        searchVal,
        navigationRoute,
        rowSelection,
        onSelect
    } = props;
    const [currentState, setCurrentState] = useState<{ annoRequest: any }>()
    const [columns, setColumns] = useState<ProColumns<GithubIssueItem>[]>([]);

    //表格选中项
    const [currentRowSelection, setCurrentRowSelection] = useState(rowSelection)
    let [currentSelectedRowsItem, setCurrentSelectedRowsItem] = useState([])

    const actionRef = useRef<ActionType>();
    //初始化方法
    const init = async () => {
        const result = await getConfig({ entitySet })
        if (result) {
            setCurrentState(result)
            Array.isArray(result?.columns) && result?.columns.forEach((item, index) => {
                const { path } = item || {};
                columns?.push({
                    title: item.label,
                    key: path,
                    dataIndex: path,
                    render: (text, record) => {
                        const option = {
                            entitySet,
                            path,
                            record,
                            isReadOnly: true
                        }

                        return <SmartField {...option} />
                    }
                })
                setColumns([...columns]);
            })
        }
    }

    useEffect(() => {
        !currentState && init()
    }, [])
    useEffect(() => {
        currentState && actionRef.current?.reloadAndRest();
    }, [searchVal])

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
                    onChange: (_, selectedRowsItem) => {
                        setCurrentSelectedRowsItem(selectedRowsItem)
                        onSelect && onSelect(selectedRowsItem);
                    },
                };
            case 'checkbox':
                return {
                    type: `checkbox`,
                    onChange: (_, selectedRowsItem) => {
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
    return (
        <ProTable<GithubIssueItem>
            columns={columns}
            actionRef={actionRef}
            cardBordered
            request={async (params, sort, filter) => {
                let option: any = {
                    params, sort, filter
                }
                if (currentState) {
                    if (searchVal) {
                        option.searchVal = searchVal;
                    }

                    const result = await currentState.annoRequest(option);
                    const { value, msg } = result.data;
                    //1.设置key
                    value.map((item) => {
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
            onRow={(record, index) => {
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
                pageSize: 5,
                onChange: (page) => console.log(page),
            }}
            dateFormatter="string"
            headerTitle="高级表格"
            toolBarRender={() => [

            ]}
            rowSelection={currentRowSelection ? _rowSelection() : false}
        />
    );
};