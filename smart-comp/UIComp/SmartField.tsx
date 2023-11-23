/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2022-09-26 17:01:20
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-11-23 16:54:19
 * @FilePath: /uilab-gbms/lib/o3smart-comp/UIPages/ListReport.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import React, { useRef, useEffect, useState } from 'react';
import { getConfig } from '../Anotations/SmartField'

export default (props) => {
    const { record, entitySet, path, isReadOnly } = props
    const [currentState, setCurrentState] = useState<{ fieldType: string, displayVlue: any }>()

    //初始化方法
    const init = async () => {
        const result = await getConfig({ record, entitySet, path, isReadOnly })
        if (result) {
            console.log({ result })
            setCurrentState(result)
        }
    }

    useEffect(() => {
        !currentState && init()
    }, [])

    //根据fiedType类型渲染内容
    const renderContent = () => {
        const { fieldType, displayVlue } = currentState
        console.log({ fieldType, displayVlue })
        switch (fieldType) {
            case 'ReadOnly':
                return <div>123{displayVlue}</div>
            case 'Text':
                return <div>{displayVlue}</div>
        }
    }

    return currentState?renderContent():<div/>
}
