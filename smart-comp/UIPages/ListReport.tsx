/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2022-09-26 17:01:20
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-12-13 10:27:06
 * @FilePath: /uilab-gbms/lib/o3smart-comp/UIPages/ListReport.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import React, { useEffect, useRef, useState, useMemo } from 'react'
import SmartTable from '../UIComp/SmartTable'
import SmartFilterBar from '../UIComp/SmartFilterBar'
import { getConfig } from '../Anotations/ListReport';
import { Skeleton, Space, Tabs } from 'antd';
import { useActivate, Prompt } from "umi";
import KeepAlive, { useAliveController } from 'react-activation';
import { getSource } from '../Process/mergeSource';

const { TabPane } = Tabs
const ListReport = () => {
    const [currentState, setCurrentState] = useState<any>()
    const [searchVal, setSearchVal] = useState<any>({});
    const [currentTabs, setCurrentTabs] = useState<any>(null)
    const [loading, setLoading] = useState(true);
    const [activeTabKey, setActiveTabKey] = useState(0)
    const formRef = useRef();
    const actionRef = useRef();
    const SmartProps = useMemo(() => {
        return getSource("ListReport") || [];
    }, [])
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
    useActivate(() => {
        if (window.uilabKeep) {
            const { tabs } = (currentState || {});
            window.uilabKeep = false
            if (tabs?.length > 0) {
                initTabs()
            }
            actionRef?.current?.reload();
        }
        if (window['SAP-ContextId']) {
            window['SAP-ContextId'] = null
        }
    })
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
            const { entitySet, navigationRoute, title: headerTitle } = currentState
            return (
                <>
                    <div style={{ display: loading ? "" : "none" }}>{_renderSkeleton()}</div>
                    <div id='ListReport' style={{ display: loading ? "none" : "" }}>
                        <SmartFilterBar formRef={formRef} setSearchVal={setSearchVal} entitySet={entitySet} />
                        <div style={{ background: '#fff',padding:'0 24px' }}>

                            {tabs?.length
                                ?
                                (
                                    <Tabs
                                        type="line"
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
                                                                        actionRef={actionRef}
                                                                        entitySet={entitySet}
                                                                        navigationRoute={navigationRoute}
                                                                        searchVal={searchVal}
                                                                        filterDefaultValue={filterDefaultValue}
                                                                        qualifier={qualifier}
                                                                        onLoad={() => {
                                                                            setLoading(false);
                                                                        }}
                                                                        SmartProps={SmartProps}
                                                                        headerTitle={headerTitle}
                                                                    />
                                                                }
                                                            </div>
                                                        </TabPane>
                                                    default:
                                                        break;
                                                }
                                            }
                                        })}
                                    </Tabs>
                                )
                                :
                                (
                                    <SmartTable
                                        actionRef={actionRef}
                                        searchVal={searchVal}
                                        entitySet={entitySet}
                                        navigationRoute={navigationRoute}
                                        onLoad={() => {
                                            setLoading(false);
                                        }}
                                        SmartProps={SmartProps}
                                        headerTitle={headerTitle}
                                    />
                                )
                            }
                        </div>
                    </div>
                </>
            )
        }
    }
    return currentState ? renderContent() : _renderSkeleton();
}

const ExportListReport = () => {
    const { drop } = useAliveController();
    return <KeepAlive
        name="listreport" //可按照name卸载缓存状态下的 <KeepAlive> 节点
        saveScrollPosition="screen" //自动保存共享屏幕容器的滚动位置
        when={true}>
        <>
            <Prompt message={(location) => {
                let index = location.pathname.split("/")
                // 三路由刷新
                if (index.length <= 3) {
                    drop("listreport");
                } else {
                    // 包括第二级且包括第三级就不刷新(刷新取反)
                    if (!(window.location.href.includes(index[1]) && window.location.href.includes(index[2]))) {
                        drop("listreport");
                    }
                }
            }} />
            <ListReport />
        </>
    </KeepAlive>
}
export default ExportListReport;

