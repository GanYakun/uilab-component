/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2023-12-11 13:17:09
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-12-11 15:16:27
 * @FilePath: /Uilab-Application/lib/Uilab-Comp/smart-comp/UIComp/SmartContactPopover.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import React, { useState, useEffect } from 'react';
import { Popover, Avatar, Button } from 'antd';
import SmartField from './SmartField';

export default (props) => {
    const { contact, record } = props as any
    const [currentValue, setCurrentValue] = useState<any>(null)
    const [currentRecord, setCurrentRecord] = useState<any>(null)
    const [open, setOpen] = useState(false);

    const init = async () => {
        const { annoRequest, entityType } = contact
        if (annoRequest) {
            const path = `${record['@odata.id']}/${entityType}`
            const result = await annoRequest(path)
            if (result) {
                setCurrentRecord(result?.data)
            }
        }
    }

    const getCurrentValue = () => {
        const { path } = contact
        let val: any = null
        if (path.search('/') === -1) {
            val = record[path]
        } else {
            val = record
            const arr = path.split('/')
            for (let a of arr) {
                val = val[a]
            }
        }
        setCurrentValue(val)
    }

    useEffect(() => {
        if (!currentValue) {
            getCurrentValue()
        }
    }, [])

    useEffect(() => {
        open && init()
    }, [open])

    const title = () => {
        return (
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <Avatar src={contact?.photo} size="large" />
                <div>{currentValue}</div>
            </div>
        )
    }

    const content = () => {
        const { Cells, entitySet } = contact
        const arr: any = []
        if (Cells) {
            Cells.map((item: any, index: number) => {
                const { type, value, label } = item
                const option = {
                    entitySet,
                    path: value,
                    record: currentRecord,
                    isReadOnly: true,
                    showLabel: true,
                    label
                }
                arr.push(<SmartField {...option} key={index} />)
            })
        }
        return arr
    }

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen);
    };

    return (
        <div onClick={(e) => e.stopPropagation()}>
            <Popover
                placement="right"
                title={title}
                content={currentRecord && content}
                trigger="click"
                arrowPointAtCenter
            >
                <a
                    onClick={(e) => {
                        e.stopPropagation()
                        handleOpenChange(!open)
                    }}
                >
                    {currentValue}
                </a>
            </Popover>
        </div>

    )
}
