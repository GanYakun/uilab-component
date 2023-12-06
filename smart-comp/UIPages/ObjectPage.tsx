/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2022-09-26 17:01:20
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-12-06 12:11:18
 * @FilePath: /uilab-gbms/lib/o3smart-comp/UIPages/ListReport.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { getConfig } from '../Anotations/ObjectPage';
import { PageContainer } from '@ant-design/pro-layout';
import { Card, Image } from 'antd';
import SmartField from '../UIComp/SmartField';
import SmartTable from '../UIComp/SmartTable';
import { ProForm, ProFormGroup } from '@ant-design/pro-components';
import SmartSKeleton from '../UIComp/SmartSKeleton';
import SmartModalForm from '../UIComp/SmartModalForm';
import { useModel } from 'umi';
import { defaultImageUrl, imageFallback } from '../Process/config'
import { mergeSource } from '../../utils/mergeSource';

export default (props) => {
    let { initialState, setInitialState } = useModel('@@initialState');
    const { location } = props;
    const SmartProps = useMemo(() => {
        return props.SmartProps || [];
    }, [props.SmartProps])
    const [currentState, setCurrentState] = useState<{ entitySet: string, HeaderInfo: any, HeaderFacets: any, Facets: any, Identification: any }>()
    //数据暂存
    const [currentRecord, setCurrentRecord] = useState<any>(null);
    // 展示的数据 默认设置为第一条数据的id, 根据id进行展示
    const [activeValue, setActiveValue] = useState("");
    const headerContentRef = useRef<any>();
    const pageContent = useRef<any>();
    const [loading, setLoading] = useState(false)
    //初始化方法
    const init = async () => {
        let result = await getConfig({ location, currentRecord: {} })
        if (result) {
            // 获取数据
            fetch(result).then(async (data) => {
                result = await getConfig({ location, currentRecord: data.data });
                console.log("ObjectPage", {
                    "ObjectPage-getConfig": result,
                    "ObjectPage-data": data
                });

                // 处理父元素的数据
                if (SmartProps?.length) {
                    result.HeaderFacets = [...result.HeaderFacets, ...(mergeSource(SmartProps, "").HeaderFacets || [])];
                }
                // 默认选中第一个不隐藏的数据
                if (result.Facets?.length) {
                    // 过滤隐藏的数据
                    result.Facets = result.Facets.filter((e) => (!e.isHidden));
                    setActiveValue("tabs-" + 0);
                }
                setCurrentState(result)
            });
        }
    }
    useEffect(() => {
        !currentState && init();
    }, [])
    //获取详情页数据
    const fetch = async (saveState) => {
        const { annoRequest, currentEntityTypeData } = saveState;
        setLoading(true)
        const result = await annoRequest()
        if (result) {
            setLoading(false)
            //处理对象的关系树
            initialState.stateTree = {
                [currentEntityTypeData.name]: {
                    data: result.data,
                    navigationProperty: currentEntityTypeData.navigationProperty
                },
            }
            initialState.actionRefObj = {}//需要刷新的钩子 暂存
            setInitialState(initialState)
            setCurrentRecord(result.data)
            return result;
        } else {
            // umiHistory.goBack()
        }
    }
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
                                    const { type, Url, Value, Criticality } = item
                                    switch (type) {
                                        case "UI.DataField":
                                            const option = {
                                                isReadOnly: true,
                                                entitySet: currentState?.entitySet,
                                                path: Value,
                                                record: currentRecord,
                                                showLabel: true,
                                                Criticality
                                            }

                                            return <div id={`target-${index}`} key={`target-${index}-${id}`}>
                                                <ProFormGroup>
                                                    <SmartField {...option} />
                                                </ProFormGroup>
                                            </div>
                                        case "UI.DataFieldForAnnotation":
                                            return <div key={`target-${index}-${id}`}>

                                            </div>
                                        case "UI.DataFieldWithUrl":
                                            const DataFieldWithUrlOption = {
                                                entitySet: currentState?.entitySet,
                                                path: Value,
                                                record: currentRecord,
                                                DataFieldWithUrl: Url
                                            }
                                            return (
                                                <div id={`target-${index}`} key={`target-${index}-${id}`}>
                                                    <ProFormGroup>
                                                        <SmartField {...DataFieldWithUrlOption} />
                                                    </ProFormGroup>
                                                </div>
                                            )
                                        default:
                                            return <div key={`target-${index}-${id}`}></div>;
                                    }
                                })}
                            </div>
                        )
                    }

                case "UI.DataPoint":
                    const { Title, Value, Criticality } = value
                    const option = {
                        dataPoint: value,
                        entitySet: currentState?.entitySet,
                        path: Value,
                        record: currentRecord,
                        Criticality
                    }
                    return {
                        type,
                        label,
                        content: (
                            <div>
                                <div style={{ fontSize: '14px', color: '#000000d9', fontWeight: 600, marginBottom: 10 }}>{Title}</div>
                                <SmartField {...option} />
                            </div>
                        )
                    }
                case "step":
                    return {
                        type,
                        label,
                        content: (
                            <div>{contentValue?.render(location.query?.queryEntity)}</div>
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
                    contents.push(<div key={`headerSection${index}`} style={{ marginRight: 32, marginBottom: 16 }}>{content}</div>);
                }
            })
        }
        return contents
    }, [currentState, currentRecord])

    // 解析tab数据
    const _getObjectPageTabOptions = () => {
        let { Facets } = (currentState || {});
        let arr: any[] = [];
        // 切换的列表大于1时才显示
        Facets?.length > 1 && Facets.forEach((item, i) => {
            !item.isHidden && arr.push({
                tab: item.label,
                key: "tabs-" + i,
                closable: false,
            })
        })
        return arr;
    }
    //解析头数据
    const _getObjectPageHeaderOptions = useMemo(() => {
        const { HeaderInfo, entitySet, Identification } = (currentState || {});
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
            let extra = Identification?.map((item, index) => {
                return item.isHidden ? null : <SmartModalForm
                    key={index}
                    formType={item.type}
                    entitySet={entitySet}
                    content={{
                        title: item.Label,
                        btnText: item.Label
                    }}
                    action={item.Action}
                    fields={item.Action.Fields}
                    onSubmit={async (body) => {
                        await item.Action.annoRequest({ body, path: `${location.query.queryEntity}/${item?.Action?.name}` })
                        setCurrentState(null);
                        init();
                    }}
                />
            })
            return {
                header: {
                    title: Title && <SmartField {...titleOption} />,
                    subTitle: Description && <SmartField {...subTitleOption} />,
                    extra: extra, // 右侧按钮
                },
                content: (
                    <div ref={headerContentRef} style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', padding: '0 24px' }}>
                        <div style={{ marginRight: 32, marginBottom: 16 }}>
                            {
                                ImageUrl && <Image
                                    preview={false}
                                    src={currentRecord[ImageUrl] ? currentRecord[ImageUrl] : imageFallback}
                                    alt="content"
                                    fallback={imageFallback}
                                    height={100}
                                    width={100}
                                    style={{
                                        objectFit: 'cover',
                                        borderRadius: 10,
                                        border: '1px solid #e8e8e8',
                                        padding: 10,
                                        boxShadow: '0 0 10px #e8e8e8',
                                        objectPosition: 'center center'
                                    }}
                                    onClick={() => { }}
                                />
                            }
                        </div>

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
        const { Facets, entitySet } = (currentState || {});
        const _renderSectionContent = (targetData, targetName, index) => {
            switch (targetData?.facetType) {
                case "UI.FieldGroup":
                    let extra = targetData?.Fields?.find((e) => (e.type === "UI.DataFieldForAction"));
                    let renderExtra: any = null;
                    if (extra) {
                        renderExtra = <SmartModalForm
                            key={index}
                            formType={extra.type}
                            entitySet={entitySet}
                            content={{
                                title: extra.Label,
                                btnText: extra.Label,
                                btnType: 'link'
                            }}
                            action={extra.Action}
                            fields={extra.Action.Fields}
                            onSubmit={async (body) => {
                                await extra.Action.annoRequest({ body, path: `${location.query.queryEntity}/${extra?.Action?.name}` })
                                setCurrentState(null);
                                init();
                                //刷新listreport数据
                                window.uilabKeep = true
                            }}
                        />
                    }
                    return <div key={`section-${index}`} style={{ background: "#fff", borderRadius: 2, marginBottom: 12 }}>
                        <Card title={targetName} bordered={false} extra={renderExtra}>
                            <ProForm submitter={false} grid={true}>
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
                                                return <SmartField {...option} key={`card-${childIndex}-${index}`} />
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
                        <SmartTable
                            entitySet={targetData?.targetEntitySet}
                            queryEntity={location?.query?.queryEntity}
                            targetNavigation={targetData?.targetNavigation}
                            qualifier={targetData?.targetQualifier}
                        />
                    </div>
                default:
                    break;
            }
        }

        if (Facets) {
            return Facets.map((item, index) => {
                const { targetData, childfacets } = (item || {});
                if (("tabs-" + index) === activeValue) {
                    // 循环多层
                    if (childfacets) {
                        return <React.Fragment key={`Facets-${index}`}>{childfacets.map((targetItem, targetIndex) => {
                            return <React.Fragment key={`Facets-${index}-${targetIndex}`}>
                                {_renderSectionContent(targetItem.targetData, targetItem.label, index + "-" + targetIndex)}
                            </React.Fragment>
                        })}</React.Fragment>
                    } else {
                        return <React.Fragment key={`Facets-${index}`}>
                            {_renderSectionContent(targetData, item.label, index)}
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
        <div style={{ background: '#F5F7FA' }} id='uilab-ObjectPage-header'>
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
