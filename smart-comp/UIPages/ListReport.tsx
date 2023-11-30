/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2022-09-26 17:01:20
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-11-28 14:52:41
 * @FilePath: /uilab-gbms/lib/o3smart-comp/UIPages/ListReport.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import React, { useEffect, useRef, useState } from 'react'
import SmartTable from '../UIComp/SmartTable'
import SmartFilterBar from '../UIComp/SmartFilterBar'
import { getConfig } from '../Anotations/ListReport';
import { Skeleton, Space, Tabs } from 'antd';
const { TabPane } = Tabs
export default () => {
    const [currentState, setCurrentState] = useState<{ entitySet: string, navigationRoute: string, tabs: any, annoRequest: Function }>()
    const [searchVal, setSearchVal] = useState<any>({});
    const [currentTabs, setCurrentTabs] = useState<any>(null)
    
    const [activeTabKey, setActiveTabKey] = useState(0)
    const formRef = useRef();
    //初始化方法
    const init = async () => {
        const result = await getConfig()
        if (result) {
            setCurrentState(result);
        }
    }

    useEffect(() => {
        !currentState && init()
    }, [])
    useEffect(() => {
        if (currentState && currentState.tabs?.length) {
            initTabs()
        }
    }, [currentState])

    const initTabs = async () => {
        const { tabs } = (currentState || {});
        const result = await currentState?.annoRequest()
        if (result) {
            result.map((item, index) => {
                tabs[index].text = item.data['@odata.count'] ? `(${item.data['@odata.count']})` : ``;
                tabs[index].key = `tabkey${index}`
            })
            setCurrentTabs(tabs)
        }
    }

    const renderContent = () => {
        const { tabs } = (currentState || {});
        if (currentState) {
            const { entitySet, navigationRoute } = currentState
            return (
                <>
                    <SmartFilterBar formRef={formRef} setSearchVal={setSearchVal} entitySet={entitySet} />
                    {tabs?.length ? <Tabs
                        type="card"
                        size='middle'
                        onChange={(params) => {
                            setActiveTabKey(Number(params))
                        }}>
                        {currentTabs && currentTabs.map((item, i) => {
                            const { text, Selection, Presentation } = item
                            if (Presentation) {
                                const { Visualizations } = Presentation
                                const { term } = Visualizations
                                switch (term) {
                                    case '@UI.LineItem':
                                        let filterDefaultValue
                                        if (Selection && Selection.filter) {
                                            filterDefaultValue = filterDefaultValue ? `${filterDefaultValue} and ${Selection.filter}` : Selection.filter
                                        }
                                        return <TabPane tab={<>
                                            {tabs[i].Text} {text}
                                        </>} key={i}>
                                            <div key={`table${i}`}>
                                                {
                                                    activeTabKey === i && <SmartTable
                                                        entitySet={entitySet}
                                                        navigationRoute={navigationRoute}
                                                        searchVal={searchVal}
                                                        filterDefaultValue={filterDefaultValue}
                                                    />
                                                }
                                            </div>
                                        </TabPane>
                                    default:
                                        break;
                                }
                            }
                        })}
                    </Tabs> :
                        <SmartTable searchVal={searchVal} entitySet={entitySet} navigationRoute={navigationRoute} />}
                </>
            )
        }
    }

    return currentState ? renderContent() : <div style={{ backgroundColor: '#fff', padding: 24 }}>
        <Space>
            <Skeleton.Input size="large" active />
        </Space>
        <br />
        <br />
        <Skeleton active />
    </div>
}
