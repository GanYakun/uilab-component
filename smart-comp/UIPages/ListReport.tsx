/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2022-09-26 17:01:20
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-11-24 09:48:03
 * @FilePath: /uilab-gbms/lib/o3smart-comp/UIPages/ListReport.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import React, { useEffect, useRef, useState } from 'react'
import SmartTable from '../UIComp/SmartTable'
import SmartFilterBar from '../UIComp/SmartFilterBar'
import SmartField from '../UIComp/SmartField';
import { getConfig } from '../Anotations/ListReport';

export default () => {
    const [currentState, setCurrentState] = useState<{ entitySet: string, navigationRoute: string }>()
    const [searchVal, setSearchVal] = useState<any>({});
    const formRef = useRef();
    //初始化方法
    const init = async () => {
        const result = await getConfig()
        if (result) {
            setCurrentState(result)
        }
    }

    useEffect(() => {
        !currentState && init()
    }, [])

    const renderContent = () => {
        if (currentState) {
            const { entitySet, navigationRoute } = currentState
            return (
                <>
                    <SmartFilterBar formRef={formRef} setSearchVal={setSearchVal} entitySet={entitySet} />
                    <SmartTable searchVal={searchVal} entitySet={entitySet} navigationRoute={navigationRoute} />
                </>
            )
        }
    }

    return currentState ? renderContent() : <div>loading...</div>
}
