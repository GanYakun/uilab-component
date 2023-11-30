/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2022-09-26 17:01:20
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-11-27 14:23:11
 * @FilePath: /uilab-gbms/lib/o3smart-comp/UIPages/ListReport.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { getConfig } from '../Anotations/ObjectPage';
import { PageContainer } from '@ant-design/pro-layout';
import { Card, Space, Skeleton } from 'antd';
import SmartField from '../UIComp/SmartField';
import SmartTable from '../UIComp/SmartTable';
import { ProForm, ProFormGroup } from '@ant-design/pro-components';
import SmartSKeleton from '../UIComp/SmartSKeleton';

export default (props) => {
    const { location } = props;
    const [currentState, setCurrentState] = useState<{ entitySet: string, HeaderInfo: any, HeaderFacets: any, Facets: any }>()
    //数据暂存
    const [currentRecord, setCurrentRecord] = useState(null);
    // 展示的数据 默认设置为第一条数据的id, 根据id进行展示
    const [activeValue, setActiveValue] = useState("");
    const [loading, setLoading] = useState(true);
    const headerContentRef = useRef<any>();
    const pageContent = useRef<any>();
    //初始化方法
    const init = async () => {
        let result = await getConfig({ location, currentRecord: {} })
        if (result) {
            // 获取数据
            const data = await result.annoRequest({});
            console.log("ObjectPage-data", { data });
            let result2 = await getConfig({ location, currentRecord: data.data });
            console.log("ObjectPage-result", { result });
            setCurrentRecord(data.data);
            if (result.Facets?.length) {
                setActiveValue(result.Facets[0].id);
            }
            setCurrentState(result2)
            setLoading(false);
        }
    }
    useEffect(() => {
        !currentState && init();
    }, [])
    //解析并渲染facet内容
    const _renderFacetContents = (sectionItem) => {

        const { id: sectionId, label: sectionLabel, targetData: sectionTargetData } = sectionItem;
        const _renderContent = (contentValue, label, id) => {
            if (!contentValue) return {}
            const { facetType: type, value } = contentValue;
            switch (type) {
                case 'UI.FieldGroup':
                    return {
                        type,
                        label,
                        content: (
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>{label}</div>
                                {sectionTargetData?.Fields?.map((item, index) => {
                                    const option = {
                                        isReadOnly: true,
                                        entitySet: currentState?.entitySet,
                                        path: item.Value,
                                        record: currentRecord,
                                        showLabel: true
                                    }
                                    return (
                                        <div id={`target-${index}`} key={`target-${index}-${id}`}>
                                            <ProFormGroup>
                                                <SmartField {...option} />
                                            </ProFormGroup>
                                        </div>
                                    )
                                })}
                            </div>
                        )
                    }

                case "dataPoint":
                    const { Title, Value } = value
                    const DataPointTitle = Title ? Title : Value
                    return {
                        type,
                        label,
                        content: (
                            <div>
                                <div style={{ whiteSpace: 'nowrap', fontFamily: '"72","72full",Arial,Helvetica,sans-serif', fontSize: '14px', color: '#32363a', fontWeight: 400, marginBottom: 10 }}>( {DataPointTitle} )</div>
                                <ProForm submitter={false} grid={true} key={id} >
                                    <ProFormGroup >

                                    </ProFormGroup>
                                </ProForm>
                            </div>
                        )
                    }
                default:
                    return {};
            }
        };
        return _renderContent(sectionTargetData, sectionLabel, sectionId);
    }
    //头部内容区域
    const _renderHeaderFacetContents = useMemo(() => {
        const contents: any = []
        const { HeaderFacets } = (currentState || {});
        if (HeaderFacets) {
            HeaderFacets.map((item, index) => {
                const { content } = _renderFacetContents(item);
                if (item.targetData) {
                    contents.push(<div key={`headerSection${index}`} style={{ marginRight: '1rem', marginBottom: '1rem' }}>{content}</div>);
                }
            })
        }
        return contents
    }, [currentState, currentRecord])
    // 解析tab数据
    const _getObjectPageTabOptions = () => {
        let { Facets } = (currentState || {});
        let arr: any[] = [];
        Facets.forEach((item) => {
            !item.isHidden && arr.push({
                tab: item.label,
                key: item.id,
                closable: false,
            })
        })
        return arr;
    }
    //解析头数据
    const _getObjectPageHeaderOptions = useMemo(() => {
        const { HeaderInfo, entitySet } = (currentState || {});
        if (HeaderInfo) {
            const { Title, Description } = HeaderInfo;
            const titleOption = {
                isReadOnly: true,
                entitySet: entitySet,
                path: Title.Value,
                record: currentRecord,
            }
            const subTitleOption = {
                isReadOnly: true,
                entitySet: entitySet,
                path: Description.Value,
                record: currentRecord,
            }
            return {
                header: {
                    title: Title && <SmartField {...titleOption} />,
                    subTitle: Description && <SmartField {...subTitleOption} />,
                    extra: [], // 右侧按钮
                },
                content: (
                    <div ref={headerContentRef} style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
                        {_renderHeaderFacetContents}
                    </div>
                ),
                tabList: _getObjectPageTabOptions() || [],
            }
        } else {
            return {};
        }
    }, [currentState, currentRecord])
    //渲染section
    const _renderSection = useMemo(() => {
        const { Facets } = (currentState || {});
        const _renderSectionContent = (targetData, index) => {
            switch (targetData?.facetType) {
                case "UI.FieldGroup":
                    return <div key={`section-${index}`} style={{ background: "#fff", borderRadius: 2, marginBottom: 12 }}>
                        <Card title={targetData.Label} bordered={false}>
                            <ProForm grid={true} submitter={false}>
                                <ProFormGroup>
                                    {
                                        targetData?.Fields?.map((childItem, childIndex) => {
                                            const option = {
                                                isReadOnly: true,
                                                entitySet: currentState?.entitySet,
                                                path: childItem.Value,
                                                record: currentRecord,
                                                showLabel: true
                                            }
                                            if (childItem.type === "UI.DataField") {
                                                return <React.Fragment key={`card-${childIndex}-${index}`}>
                                                    <SmartField {...option} />
                                                </React.Fragment>
                                            } else if (childItem.type === "UI.DataFieldForAction") {
                                                return <React.Fragment key={`card-${childIndex}-${index}`}></React.Fragment>
                                            } else {
                                                return <React.Fragment key={`card-${childIndex}-${index}`}></React.Fragment>
                                            }
                                        })
                                    }
                                </ProFormGroup>
                            </ProForm>
                        </Card>
                    </div>
                case "UI.LineItem":
                    return <div key={`section${index}`} id='vertical' style={{ background: "#fff", borderRadius: 2, marginBottom: 12 }}>
                        <SmartTable entitySet={targetData?.targetEntitySet} />
                    </div>
                default:
                    break;
            }
        }

        if (Facets) {
            return Facets.map((item, index) => {
                const { targetData, childfacets } = (item || {});
                if (item.id === activeValue) {
                    // 循环多层
                    if (childfacets) {
                        return <React.Fragment key={`Facets-${index}`}>{childfacets.map((targetItem, targetIndex) => {
                            return <React.Fragment key={`Facets-${index}-${targetIndex}`}>
                                {_renderSectionContent(targetItem.targetData, index + "-" + targetIndex)}
                            </React.Fragment>
                        })}</React.Fragment>
                    } else {
                        return <React.Fragment key={`Facets-${index}`}>
                            {_renderSectionContent(targetData, index)}
                        </React.Fragment>
                    }
                } else {
                    return <React.Fragment key={`Facets-${index}`}></React.Fragment>
                }
            })
        } else {
            return <div></div>
        }
    }, [currentState, currentRecord, activeValue])

    return (
        <div style={{ background: '#F5F7FA' }} id='uilab-ObjectPage'>
            {loading ? <SmartSKeleton /> : <PageContainer
                onBack={() => window.history.back()}
                style={{ background: "#f0f2f5" }}
                {..._getObjectPageHeaderOptions}
                tabProps={{
                    type: 'editable-card',
                    hideAdd: true,
                    onEdit: (e, action) => console.log(e, action),
                }}
                footer={[
                    // <Button key="3">重置</Button>
                ]}
                onTabChange={(e) => {
                    setActiveValue(e);
                }}
            >
                <div ref={pageContent}>
                    {_renderSection}
                </div>
            </PageContainer>}
        </div>
    )
}
