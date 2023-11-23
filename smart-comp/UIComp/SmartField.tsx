/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2022-09-26 17:01:20
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-11-23 11:07:02
 * @FilePath: /uilab-gbms/lib/o3smart-comp/UIPages/ListReport.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import React, { useRef, useEffect, useState } from 'react';
import { getConfig } from '../Anotations/SmartField'

export default (props) => {
    const { record, entitySet, path, isReadOnly } = props
    const [currentState, setCurrentState] = useState<object>()


    //初始化方法
    const init = async () => {
        const result = await getConfig({ record, entitySet, path, isReadOnly })
    }

    useEffect(() => {
        !currentState && init()
    }, [])

    return (
        <div>SmartField</div>
    )
}
