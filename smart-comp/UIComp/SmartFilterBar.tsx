/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2022-09-26 17:01:20
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-11-27 13:58:56
 * @FilePath: /uilab-gbms/lib/o3smart-comp/UIPages/ListReport.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import React, { useEffect, useState } from 'react';
import { getConfig } from '../Anotations/SmartFilterBar'
// import { DownOutlined, UpOutlined } from '@ant-design/icons';
import { ProFormTreeSelect, QueryFilter } from '@ant-design/pro-components';
import SmartField from './SmartField';

type AdvancedSearchProps = {
    setSearchVal?: (params: any) => void;
    entitySet?: any;
};
export default (props: AdvancedSearchProps) => {
    const { entitySet, setSearchVal } = props
    const [currentState, setCurrentState] = useState<any>()

    //初始化方法
    const init = async () => {
        const result = await getConfig({ entitySet })
        if (result) {
            setCurrentState(result);
        }
    }

    useEffect(() => {
        !currentState && init()
    }, [])
    return (
        <div style={{ background: '#fff', padding: '24px', marginBottom: 10, borderRadius: 2 }}>
            <QueryFilter
                layout='vertical'
                defaultCollapsed
                split
                onFinish={async (values) => {
                    if (setSearchVal) {
                        setSearchVal(values)
                    }
                }} onReset={async () => {
                    if (setSearchVal) {
                        setSearchVal("")
                    }
                }}>
                <>
                    {currentState && currentState.annoSelectionFields?.map((item, index) => {
                        const option = {
                            entitySet,
                            path: item.path,
                            recode: item.label
                        }
                        return <SmartField key={index} {...option} />
                    })}
                </>
            </QueryFilter>
        </div >
    )
}
