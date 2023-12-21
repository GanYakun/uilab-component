/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2023-12-20 15:39:58
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-12-21 11:16:23
 * @FilePath: /Uilab-Application/lib/Uilab-Comp/smart-comp/UIComp/SmartEditableTable.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import React, { useState, useEffect, useRef } from 'react';
import { EditableProTable, ProForm } from '@ant-design/pro-components';
import { getConfig } from '../Anotations/SmartTable';
import SmartField from './SmartField';
import { FormattedMessage } from "react-intl";

export default (props: any) => {
    const {
        entitySet,
        targetNavigation,
        parentColumns,
        qualifier,
    } = props;
    const [currentState, setCurrentState] = useState<any>()
    let [columns, setColumns] = useState<any>([]);

    //初始化方法
    const init = async () => {
        const result = await getConfig({ entitySet, qualifier })
        if (result) {
            setCurrentState(result)
            const currentColumns = parentColumns ? parentColumns : result?.columns
            Array.isArray(currentColumns) && currentColumns.forEach((item) => {
                const { path, Label, Criticality, CriticalityIsInt, type, CriticalityRepresentation } = item || {};
                switch (type) {
                    case 'UI.DataField':
                        columns?.push({
                            title: Label,
                            key: path,
                            dataIndex: path,
                            renderFormItem: (text: any, record: any) => {
                                const option = {
                                    entitySet,
                                    path,
                                    showLabel: false,
                                    name: `${path}-${record.recordKey}`
                                }
                                return <SmartField {...option} />
                            },
                        })
                        break;
                    default:
                        break;
                }
            })
            setColumns([
                ...columns,
                {
                    title: <FormattedMessage id="smart.action" />,
                    valueType: 'option',
                }
            ]);
        }
    }
    useEffect(() => {
        !currentState && init()
    }, [])

    return (
        <ProForm.Item
            name={targetNavigation}
        >
            <EditableProTable
                rowKey="id"
                toolBarRender={false}
                columns={columns}
                recordCreatorProps={{
                    newRecordType: 'dataSource',
                    creatorButtonText: <FormattedMessage id="smart.addRow" />,
                    record: () => {
                        if (columns) {
                            const obj = {
                                id: Date.now(),
                            }
                            columns?.forEach((item: any) => {
                                const { dataIndex, valueType } = item || {};
                                if (valueType !== 'option') obj[dataIndex] = ''
                            })
                            return obj
                        }
                    },
                }}
                editable={{
                    type: 'multiple',
                    actionRender: (row, _, dom) => {
                        return [dom.delete];
                    },
                }}
            />
        </ProForm.Item>
    );
};