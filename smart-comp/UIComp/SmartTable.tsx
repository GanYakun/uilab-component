import React, { useRef, useEffect, useState } from 'react';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { ProTable, TableDropdown } from '@ant-design/pro-components';
import { Space, Tag } from 'antd';
import { getConfig } from '../Anotations/SmartTable';

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

// const columns: ProColumns<GithubIssueItem>[] = [
//     {
//         dataIndex: 'index',
//         valueType: 'indexBorder',
//         width: 48,
//     },
//     {
//         title: '标题',
//         dataIndex: 'title',
//         copyable: true,
//         ellipsis: true,
//         tip: '标题过长会自动收缩',
//         formItemProps: {
//             rules: [
//                 {
//                     required: true,
//                     message: '此项为必填项',
//                 },
//             ],
//         },
//     },
//     {
//         disable: true,
//         title: '状态',
//         dataIndex: 'state',
//         filters: true,
//         onFilter: true,
//         ellipsis: true,
//         valueType: 'select',
//         valueEnum: {
//             all: { text: '超长'.repeat(50) },
//             open: {
//                 text: '未解决',
//                 status: 'Error',
//             },
//             closed: {
//                 text: '已解决',
//                 status: 'Success',
//                 disabled: true,
//             },
//             processing: {
//                 text: '解决中',
//                 status: 'Processing',
//             },
//         },
//     },
//     {
//         disable: true,
//         title: '标签',
//         dataIndex: 'labels',
//         search: false,
//         renderFormItem: (_, { defaultRender }) => {
//             return defaultRender(_);
//         },
//         render: (_, record) => (
//             <Space>
//                 {record.labels.map(({ name, color }) => (
//                     <Tag color={color} key={name}>
//                         {name}
//                     </Tag>
//                 ))}
//             </Space>
//         ),
//     },
//     {
//         title: '创建时间',
//         key: 'showTime',
//         dataIndex: 'created_at',
//         valueType: 'date',
//         sorter: true,
//         hideInSearch: true,
//     },
//     {
//         title: '创建时间',
//         dataIndex: 'created_at',
//         valueType: 'dateRange',
//         hideInTable: true,
//         search: {
//             transform: (value) => {
//                 return {
//                     startTime: value[0],
//                     endTime: value[1],
//                 };
//             },
//         },
//     },
//     {
//         title: '操作',
//         valueType: 'option',
//         key: 'option',
//         render: (text, record, _, action) => [
//             <a
//                 key="editable"
//                 onClick={() => {
//                     action?.startEditable?.(record.id);
//                 }}
//             >
//                 编辑
//             </a>,
//             <a href={record.url} target="_blank" rel="noopener noreferrer" key="view">
//                 查看
//             </a>,
//             <TableDropdown
//                 key="actionGroup"
//                 onSelect={() => action?.reload()}
//                 menus={[
//                     { key: 'copy', name: '复制' },
//                     { key: 'delete', name: '删除' },
//                 ]}
//             />,
//         ],
//     },
// ];

export default (props) => {
    const { entitySet } = props;
    const [currentState, setCurrentState] = useState<object>()
    const [columns, setColumns] = useState<ProColumns<GithubIssueItem>[]>([]);
    //初始化方法
    const init = async () => {
        const result = await getConfig({ entitySet })
        if (result) {
            setCurrentState(result)
            Array.isArray(result.columns) && result.columns.forEach((item, index) => {
                const { path } = item || {};
                columns?.push({
                    title: item.label,
                    key: path,
                    dataIndex: path,
                })
                setColumns([...columns]);
            })
        }
    }

    useEffect(() => {
        !currentState && init()
    }, [])

    const actionRef = useRef<ActionType>();
    return (
        <ProTable<GithubIssueItem>
            columns={columns}
            actionRef={actionRef}
            cardBordered
            request={async (params, sort, filter) => {
                if (currentState) {
                    const result = await currentState.annoRequest();
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
            rowKey="id"
            search={false}
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
        />
    );
};