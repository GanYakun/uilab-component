/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2022-09-26 17:01:20
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-11-27 14:23:11
 * @FilePath: /uilab-gbms/lib/o3smart-comp/UIPages/ListReport.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import React, { useEffect, useMemo, useState } from 'react'
import { getConfig } from '../Anotations/ObjectPage';
import { PageContainer } from '@ant-design/pro-layout';
import { Button, Dropdown } from 'antd';
import { EllipsisOutlined } from '@ant-design/icons';
import SmartField from '../UIComp/SmartField';
import SmartTable from '../UIComp/SmartTable';
import { useIntl } from '@ant-design/pro-components';

export default (props) => {
    const { location } = props;
    const { formatMessage } = useIntl();
    const [currentState, setCurrentState] = useState<{ entitySet: string, HeaderInfo: any }>()
    const [loading, setLoading] = useState(false)
    //初始化方法
    const init = async () => {
        const result = await getConfig({ location })
        if (result) {
            setCurrentState(result)
        }
    }

    useEffect(() => {
        !currentState && init();
    }, [])
    useEffect(() => {
        currentState && fetch();
    }, [currentState])
    //获取详情页数据
    const fetch = async () => {
        setLoading(true)
        const result = await currentState.annoRequest()
        console.log({ ObjectPageResult: result })

    }
    //解析并渲染facet内容
    const _renderFacetContents = (item, isHeaderFacets) => {
        const { id: sectionId, label: sectionLabel, childfacets, targetData: sectionTargetData } = item;
        const _renderContent = (contentValue, id, label, isCollectionFacet) => {
            label = label && (label.search('@i18n>') === -1 ? label : formatMessage({ id: label }))

            if (!contentValue) return {}
            const { facetType: type, value, formEntityPrimaryKeys } = contentValue;
            console.log(type);
            
            switch (type) {
                case 'UI.FieldGroup':
                    return {
                        type,
                        label,
                        content: (
                            <div>
                                
                            </div>
                        )
                    }
                default:
                    break;
            }
        };

        const _renderChildfacets = (childfacets) => {
            let arr = [], returnId, returnLabel;
            for (let a of childfacets) {
                const { id, label } = a;
                returnId = id
                returnLabel = label

            }
            return arr;
        };

        //判断是否内容嵌套 ReferenceFacet CollectionFacet
        if (childfacets) {
            const arr = _renderChildfacets(childfacets);
            const content = []
            arr.map((item) => { content.push(item.content) })
            return { content }
        } else {
            return _renderContent(sectionTargetData, sectionId, sectionLabel);
        }
    }
    const _renderHeaderFacetContents = useMemo(() => {
        const contents = []
        const { HeaderFacets } = (currentState || {});
        if (HeaderFacets) {
            HeaderFacets.map((item) => {
                const { content } = _renderFacetContents(item, true)
            })
        }
    }, [])

    //解析头数据
    const _getObjectPageHeaderOptions = useMemo(() => {
        const { HeaderInfo, entitySet } = (currentState || {});
        if (HeaderInfo) {
            const { Title, Description, ImageUrl } = HeaderInfo;
            return {
                header: {
                    title: Title && <SmartField isReadOnly={true} entitySet={entitySet} path={Title.Value} />,
                    subTitle: Description && <SmartField isReadOnly={true} entitySet={entitySet} path={Description.Value} />,

                    extra: [<Button key="1">次要按钮</Button>], // 右侧按钮
                }
            }
        } else {
            return {};
        }
    }, [currentState])

    return (
        <div
            style={{
                background: '#F5F7FA',
            }}
        >
            <PageContainer
                {..._getObjectPageHeaderOptions}
                content="123" // 页面描述数据
                //   tabBarExtraContent="测试tabBarExtraContent"
                tabList={[
                    {
                        tab: '基本信息',
                        key: 'base',
                        closable: false,
                    },
                    {
                        tab: '详细信息',
                        key: 'info',
                    },
                ]}
                tabProps={{
                    type: 'editable-card',
                    hideAdd: true,
                    onEdit: (e, action) => console.log(e, action),
                }}
                footer={[
                    <Button key="3">重置</Button>
                ]}
            >
            </PageContainer>
        </div>
    )
}
