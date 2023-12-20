/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2022-09-26 17:01:20
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-12-20 11:11:51
 * @FilePath: /uilab-gbms/lib/o3smart-comp/UIPages/ListReport.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { useEffect, useState } from 'react';
import { getConfig } from '../Anotations/SmartFilterBar'
import { QueryFilter } from '@ant-design/pro-components';
import SmartField from './SmartField';

type AdvancedSearchProps = {
    setSearchVal?: (params: any) => void;
    entitySet?: any;
    formRef?: any;
};
export default (props: AdvancedSearchProps) => {
    const { entitySet, setSearchVal, formRef } = props
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
        <div id='uilab-SmartFilterbar' style={{ background: '#fff', padding: '24px', marginBottom: 10, borderRadius: 2 }}>
            <QueryFilter
                formRef={formRef}
                layout='vertical'
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
                {currentState ? currentState.annoSelectionFields?.map((item: { path: any; label: any; }, index: any) => {
                    const { path, label } = item
                    const option = {
                        entitySet,
                        path,
                        formRef,
                        label,
                        inFilterBar:true
                    }
                    return <div key={`filter-${index}`}>
                        <SmartField {...option} />
                    </div>
                }) : null}
            </QueryFilter>
        </div >
    )
}
