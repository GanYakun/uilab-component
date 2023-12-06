/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2023-12-06 08:09:21
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-12-06 15:41:47
 * @FilePath: /Uilab-Application/lib/Uilab-Comp/smart-comp/CustComp/Steps/index.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { Steps } from 'ant5';
import Odata from '../../../utils/odata/odata'
import { useEffect, useState } from 'react';

/**
 * @param {type} props.queryEntity 例子：SupplierParties('10602') 
 * @param {type} props.isInline 是否内联 例子：true false
 */
export default (props) => {
    const { queryEntity, isInline } = props
    const [currentRecord, setCurrentRecord] = useState<any>()

    //查询item数据
    async function queryItems() {
        let option = {
            path: `${window.serviceUrl}${queryEntity}/com.dpbird.getProcessFlow()`,
            parameters: {} as any,
        };

        const result = await Odata.read(option)
        if (result) {
            const { value } = result?.data
            let items: any[] = [], current = 0
            value.map((item: any, index: number) => {
                const { nodeName, isActive, nodeDescription } = item
                items.push({
                    title: nodeName,
                    description: nodeDescription,
                    disabled: true
                })
                if (isActive) {
                    current = index
                }
            })
            setCurrentRecord({
                items,
                current
            })
        }
    }

    useEffect(() => {
        !currentRecord && queryItems()
    }, [])

    return (
        <div onClick={(e)=>e.stopPropagation()}>
            <Steps
                type={isInline ? 'inline' : 'default'}
                current={currentRecord?.current}
                items={currentRecord?.items}
                percent={60}
            />
        </div>
    )
}

