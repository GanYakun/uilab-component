/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2023-12-06 08:09:21
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-12-06 10:00:17
 * @FilePath: /Uilab-Application/lib/Uilab-Comp/smart-comp/CustComp/Steps/index.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { Steps } from 'ant5';
const description = 'This is a description.';
import Odata from '../../../utils/odata/odata'
import React,{ useEffect, useState } from 'react';

/**
 * @param {type} props.queryEntity 例子：SupplierParties('10602') 
 * @param {type} props.isInline 是否内联 例子：true false
 */
export default (props) => {
    const { queryEntity,isInline } = props
    const [currentRecord, setCurrentRecord] = useState()

    //查询item数据
    async function queryItems() {
        let option = {
            path: `officeauto/control/odataAppSvc/supplierApproveService/SupplierParties('10602')/com.dpbird.getProcessFlow()`,
            parameters: {} as any,
        };

        const res = await Odata.read(option)
        console.log({res})
        //setCurrentRecord(res.data.data)
    }

    useEffect(() => {
        //queryItems()
        console.log({ queryEntity, isInline })
    }, [])

    return (
        <Steps
            type={isInline?'inline':'default'}
            current={1}
            items={[
                {
                    title: 'Finished',
                    description,
                },
                {
                    title: 'In Progress',
                    description,
                    subTitle: 'Left 00:00:08',
                },
                {
                    title: 'Waiting',
                    description,
                },
            ]}
        />
    )
}

