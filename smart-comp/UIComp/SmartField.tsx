/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2022-09-26 17:01:20
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-11-23 17:39:02
 * @FilePath: /uilab-gbms/lib/o3smart-comp/UIPages/ListReport.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import React, { useEffect, useState } from 'react';
import { getConfig } from '../Anotations/SmartField'
import { ProFormSelect } from '@ant-design/pro-components';

export default (props) => {
    const { record, entitySet, path, isReadOnly } = props
    const [currentState, setCurrentState] = useState<{ fieldType: string, displayValue: any }>()

    //初始化方法
    const init = async () => {
        const result = await getConfig({ record, entitySet, path, isReadOnly })
        if (result) {
            setCurrentState(result)
        }
    }

    useEffect(() => {
        !currentState && init()
    }, [])

    //根据fiedType类型渲染内容
    const renderContent = () => {
        const { fieldType, displayValue, valueListConfig } = currentState
        console.log({ fieldType, displayValue, valueListConfig })
        switch (fieldType) {
            case 'ReadOnly':
                return <div>{displayValue}</div>
            case 'Text':
                return <div>{displayValue}</div>
            case 'Select':
                console.log("Select");
                
                return <ProFormSelect request={async () => {
                   console.log(111);
                   
                    const result = await valueListConfig.annoRequest()
                    console.log({ result }, "test");

                    return []
                }} />
            default:
                return <div></div>
        }
    }

    return currentState ? renderContent() : <div />
}
