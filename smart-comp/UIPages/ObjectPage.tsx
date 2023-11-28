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
import { Card } from 'antd';
import SmartField from '../UIComp/SmartField';
import SmartTable from '../UIComp/SmartTable';
import { ProForm, ProFormGroup, useIntl } from '@ant-design/pro-components';

export default (props) => {
    const { location } = props;
    const { formatMessage } = useIntl();
    const [currentState, setCurrentState] = useState<{ entitySet: string, HeaderInfo: any, HeaderFacets: any, Facets: any }>()
    //数据暂存
    const [currentRecord, setCurrentRecord] = useState(null);

    const headerContentRef = useRef<any>();
    const pageContent = useRef<any>();
    //初始化方法
    const init = async () => {
        const result = await getConfig({ location })
        if (result) {
            setCurrentState(result)
            const data = await result.annoRequest({});
            setCurrentRecord(data.data);
        }
    }

    useEffect(() => {
        !currentState && init();
    }, [])
    //解析并渲染facet内容
    const _renderFacetContents = (sectionItem) => {

        const { label: sectionLabel, targetData: sectionTargetData } = sectionItem;
        const _renderContent = (contentValue, label) => {
            label = label && (label.search('@i18n>') === -1 ? label : formatMessage({ id: label }))

            if (!contentValue) return {}
            const { facetType: type } = contentValue;
            switch (type) {
                case 'UI.FieldGroup':
                    return {
                        type,
                        label,
                        content: (
                            <div>
                                <div>( {label} )</div>
                                {sectionTargetData?.Fields?.map((item, index) => {
                                    const option = {
                                        isReadOnly: true,
                                        entitySet: currentState?.entitySet,
                                        path: item.Value,
                                        record: currentRecord,
                                        showLabel: true
                                    }
                                    return (
                                        <div id={`target-${index}`}>
                                            <ProFormGroup>
                                                <SmartField {...option} />
                                            </ProFormGroup>
                                        </div>
                                    )
                                })}
                            </div>
                        )
                    }
                default:
                    return {
                        content: <></>
                    };
            }
        };

        return _renderContent(sectionTargetData, sectionLabel);
    }
    //头部内容区域
    const _renderHeaderFacetContents = useMemo(() => {
        const contents: any = []
        const { HeaderFacets } = (currentState || {});
        if (HeaderFacets) {
            HeaderFacets.map((item, index) => {
                const { content } = _renderFacetContents(item);
                contents.push(<div key={`headerSection${index}`} style={{ marginRight: '1rem', marginBottom: '1rem' }}>{content}</div>);

            })
        }
        return contents
    }, [currentState, currentRecord])
    // 解析tab数据
    const _getObjectPageTabOptions = () => {
        let { Facets } = (currentState || {});
        let arr: any[] = [];
        Facets.forEach((item) => {
            arr.push({
                tab: item.label,
                key: item.label,
                closable: false,
            })
        })
        return arr;
    }
    //解析头数据
    const _getObjectPageHeaderOptions = useMemo(() => {
        const { HeaderInfo, entitySet } = (currentState || {});
        if (HeaderInfo) {
            const { Title, Description, ImageUrl } = HeaderInfo;
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
                    extra: [
                        // <Button key="1">次要按钮</Button>
                    ], // 右侧按钮
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
    }, [currentRecord])
    //渲染section
    const _renderSection = useMemo(() => {
        const { Facets } = (currentState || {});
        if (Facets) {
            return Facets.map((item, index) => {
                const { targetData } = (item || {});
                switch (targetData.facetType) {
                    case "UI.FieldGroup":
                        return <div key={`section${index}`} id='vertical'>
                            {targetData.facetType === "UI.FieldGroup" ? <Card title={targetData.Label} bordered={false}>
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
                                                return <React.Fragment key={`card-${childIndex}`}>
                                                    <SmartField {...option} />
                                                </React.Fragment>
                                            })

                                        }
                                    </ProFormGroup>
                                </ProForm>
                            </Card> : ""}
                        </div>

                    default:
                        break;
                }
            })
        } else {
            return <div></div>
        }
    }, [currentRecord])
    return (
        <div
            style={{
                background: '#F5F7FA',
            }}
            id='uilab-ObjectPage'
        >
            <PageContainer
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
            >
                <div ref={pageContent} style={{ background: "#fff", padding: 12, borderRadius: 2 }}>
                    {_renderSection}
                </div>
            </PageContainer>
        </div>
    )
}
