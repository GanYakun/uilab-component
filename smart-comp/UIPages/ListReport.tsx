/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2022-09-26 17:01:20
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-12-04 14:54:29
 * @FilePath: /uilab-gbms/lib/o3smart-comp/UIPages/ListReport.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import React, { useEffect, useRef, useState, useMemo } from 'react'
import SmartTable from '../UIComp/SmartTable'
import SmartFilterBar from '../UIComp/SmartFilterBar'
import { getConfig } from '../Anotations/ListReport';
import { Skeleton, Space, Tabs } from 'antd';
const { TabPane } = Tabs
export default (props) => {
    const [currentState, setCurrentState] = useState<{ entitySet: string, navigationRoute: string, tabs: any, annoRequest: Function }>()
    const [searchVal, setSearchVal] = useState<any>({});
    const [currentTabs, setCurrentTabs] = useState<any>(null)
    const [loading, setLoading] = useState(true);
    const [activeTabKey, setActiveTabKey] = useState(0)
    const formRef = useRef();
    const SmartProps = useMemo(() => {
        return props.SmartProps || [];
    }, [props.SmartProps])
    //初始化方法
    const init = async () => {
        const result = await getConfig()
        if (result) {
            setCurrentState(result);
        } else {
            setLoading(false);
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
    const _renderSkeleton = () => {
        return <div>
            <div style={{ backgroundColor: '#fff', padding: 24 }}>
                <Space>
                    <Skeleton.Input size="large" active />
                </Space>
                <br />
                <br />
                <Skeleton active />
            </div>
            <div style={{ backgroundColor: '#fff', padding: 24, marginTop: 10 }}>
                <br />
                <br />
                <Skeleton active />
                <br />
                <br />
                <Skeleton active />
                <br />
                <br />
                <Skeleton active />
                <br />
                <br />
                <Skeleton active />
            </div>
        </div>
    }
    const renderContent = () => {
        const { tabs } = (currentState || {});
        if (currentState) {
            const { entitySet, navigationRoute } = currentState
            return (
                <>
                    <div style={{ display: loading ? "" : "none" }}>{_renderSkeleton()}</div>
                    <div style={{ display: loading ? "none" : "" }}>
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
                                    const { term, qualifier } = Visualizations
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
                                                            qualifier={qualifier}
                                                            onLoad={() => {
                                                                setLoading(false);
                                                            }}
                                                            SmartProps={SmartProps}
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
                            <SmartTable
                                searchVal={searchVal}
                                entitySet={entitySet}
                                navigationRoute={navigationRoute}
                                onLoad={() => {
                                    setLoading(false);
                                }}
                                SmartProps={SmartProps}
                            />}
                    </div>
                </>
            )
        }
    }
    return currentState ? renderContent() : _renderSkeleton();
}
