/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2022-09-26 17:01:20
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-12-20 13:59:20
 * @FilePath: /uilab-gbms/lib/o3smart-comp/UIPages/ListReport.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import React, { useEffect, useRef, useState, useMemo } from 'react'
import SmartTable from '../UIComp/SmartTable'
import SmartFilterBar from '../UIComp/SmartFilterBar'
import { getConfig } from '../Anotations/ListReport';
import { Skeleton, Space, Tabs } from 'antd';
import { useActivate, Prompt } from "umi";

const ObjectFormPage = () => {
    const [currentState, setCurrentState] = useState<any>()
   
    return (
        <div>ObjectFormPage</div>
    )
}
export default ObjectFormPage;

