/*
 * @Author: lx.jin
 * @Date: 2022-01-19 12:32:12
 * @LastEditTime: 2023-10-09 14:54:12
 * @LastEditors: lx.jin 308561217@qq.com
 * @Description: 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 * @FilePath: /BANFF/pms3.0-banff/src/pages/ListReport/index.jsx
 */
import { useEffect, useState, useRef, useMemo } from 'react';
import { Tabs, Col, Row } from 'antd';
import { SmartTable, SmartFilterBar, ObjectPage, ViewVaraint } from '../config';
import { getConfig } from '../../Anotations/ListReport';
import moment from 'moment';
import { history, useModel, useIntl, useActivate } from 'umi';
import { RightOutlined, LeftOutlined } from '@ant-design/icons';
import { getTextByI18n } from '../../../utils/util'
import './index.less'
const isDev = process.env.NODE_ENV === 'development'

const ListReport = () => {
    const {
        entitySet,
        tabs,
        annoRequest,
        showCounts,
        navigation,
        autoRefresh,
        controlAggregation,
        appId
    } = getConfig({})

    //参数准备
    const { formatMessage } = useIntl();
    const [currentTabs, setCurrentTabs] = useState(null)
    const [activeTabKey, setActiveTabKey] = useState(0)
    let [$filterValue, set$FilterValue] = useState(null)
    let [$searchValue, set$SearchValue] = useState(null)
    const actionRef = useRef()
    const SmartFilterBarRef = useRef()
    const [queryEntity, setQueryEntity] = useState(null)

    const { initialState } = useModel('@@initialState');
    const { variantConfig, onVarientChange } = initialState ? initialState : {}

    //master-detail
    const [Aggregation, setAggregation] = useState(null)
    let [spaceDirectionRight, setSpaceDirectionRight] = useState(true)

    //切换视图清空内容
    useEffect(() => {
        if (variantConfig) {
            onReset()
            SmartFilterBarRef && SmartFilterBarRef.current && SmartFilterBarRef.current.resetFields()
            actionRef?.current?.reloadAndRest()

        }
    }, [variantConfig])

    //循环查询列表数据
    let currentInterval
    useEffect(() => {
        if (autoRefresh && !isDev) {
            const { duration } = autoRefresh
            if (currentInterval) {
                clearInterval(currentInterval)
            }
            currentInterval = setInterval(() => {
                actionRef?.current?.reload()

            }, duration);
        }

        return () => {
            currentInterval && clearInterval(currentInterval)
        };
    }, [entitySet])

    useActivate(() => {
        console.log('useActivate', window.uilabKeep)
        if (window.uilabKeep) {
            window.uilabKeep = false
            if (tabs.length > 0) {
                initTabs()
            }
            actionRef?.current?.reload();
        }
        if (window['SAP-ContextId']) {
            window['SAP-ContextId'] = null
        }
    })

    //处理tab初始化 
    useEffect(() => {
        if (!currentTabs && tabs.length > 0) {
            initTabs()
        }
    }, [currentTabs]);
    const initTabs = async () => {
        const result = await annoRequest()
        if (result) {
            result.map((item, index) => {
                let { text, Presentation } = tabs[index]
                let tabText = getTextByI18n(text || Presentation?.text, formatMessage)
                tabs[index].text = `${tabText} (${item.data['@odata.count']})`
                tabs[index].key = `tabkey${index}`
            })
            setCurrentTabs(tabs)
        }
    }

    //filerBar 确定查询
    const onSearch = (parmas, collectionAavigationArr = []) => {

        //获取查询语句
        const _getFilterUrl = (url, value, key, isLambdaEntitySet) => {
            if (value instanceof Array && value.length > 1) {
                //处理 dataTime类型的时间筛选
                url = `${key} ge ${moment(`${value[0]} 00:00:00`).format('YYYY-MM-DDTHH:mm:ss.SSSZ')} and ${key} le ${moment(`${value[1]} 23:59:59`).format('YYYY-MM-DDTHH:mm:ss.SSSZ')}`
            } else {
                if (isLambdaEntitySet) {
                    url =
                        key.search('Id') == -1
                            ? `${isLambdaEntitySet}/any(L1:contains(L1/${key},'${value}'))`
                            : `${isLambdaEntitySet}/any(L1:L1/${key} eq '${value}')`;
                } else {
                    url =
                        key.search('Id') == -1
                            ? `contains(${key}, '${value}')`
                            : `${key} eq '${value}'`;

                }
            }
            return url
        }

        if (parmas) {
            let onSearchFilter, url
            for (let key of Object.keys(parmas)) {
                if (key === '$search') {
                    $searchValue = parmas[key]
                } else {
                    if (parmas[key] !== '' && parmas[key] != null) {

                        //是否为关联对象的字段
                        if (key.search('/') === -1) {
                            url = _getFilterUrl(url, parmas[key], key)
                        } else {
                            const arr = key.split("/")
                            //关联对象的字段目前只处理2段式
                            if (collectionAavigationArr && collectionAavigationArr.includes(arr[0])) {
                                if (arr.length < 3) {
                                    url = _getFilterUrl(url, parmas[key], arr[1], arr[0])
                                } else {
                                    console.error('smartFilerBar==>lambda目前只支持两段式', key)
                                }
                            } else {
                                url = _getFilterUrl(url, parmas[key], key)
                            }
                        }

                        //页面搜索条件的过滤条件
                        if (!onSearchFilter) {
                            onSearchFilter = url;
                        } else {
                            onSearchFilter += ` and ${url}`;
                        }
                    }
                }
            }

            $filterValue = onSearchFilter
        }
        set$SearchValue($searchValue)
        set$FilterValue($filterValue)
        actionRef?.current?.reloadAndRest()
    }

    //重置
    const onReset = (type) => {
        if (type === 'search') {
            set$SearchValue(null)
            return
        }
        $searchValue = null
        $filterValue = null
        set$SearchValue($searchValue)
        set$FilterValue($filterValue)
        actionRef?.current?.reloadAndRest()
        SmartFilterBarRef?.current?.resetFields()
    }

    //渲染fiterBar
    const _filterBar = useMemo(() => {
        return <SmartFilterBar
            formRef={SmartFilterBarRef}
            entitySet={entitySet}
            onSearch={onSearch}
            onReset={onReset}
            tabs={tabs}
        />
    }, [entitySet])

    //列表点击事件
    const _onRowPress = (pathname, queryEntity) => {
        if (controlAggregation) {
            setQueryEntity(queryEntity)
            if (!Aggregation) {
                if (spaceDirectionRight) {
                    setAggregation({
                        beginColumnPages: 8,
                        midColumnPages: 16,
                        endColumnPages: 0
                    })
                } else {
                    setAggregation({
                        beginColumnPages: 16,
                        midColumnPages: 8,
                        endColumnPages: 0
                    })
                }
            }
        } else {
            history.push({
                pathname,
                query: {
                    queryEntity: queryEntity,
                },
            })
        }
    }

    //内容区域
    const _content = useMemo(() => {
        return tabs.length > 0 ? <Tabs
            style={{ padding: '0 10px' }}
            type="card"
            size='middle'
            items={currentTabs && currentTabs.map((item, i) => {
                const { text, Selection, Presentation } = item
                //console.log({ text, Selection, Presentation })
                if (Presentation) {
                    const { orderby, Visualizations } = Presentation
                    const { term, qualifier } = Visualizations

                    switch (term) {
                        case '@UI.LineItem':
                            let $filter
                            //filterBar 生成的过滤条件
                            if ($filterValue) {
                                $filter = $filterValue
                            }
                            //SelectionPresentationVariant 配置的默认过滤条件
                            if (Selection && Selection.filter) {
                                $filter = $filter ? `${$filter} and ${Selection.filter}` : Selection.filter
                            }
                            return {
                                label: text,
                                key: i,
                                children: (<div key={`table${i}`}>
                                    {
                                        activeTabKey === i && <SmartTable
                                            entitySet={entitySet}
                                            $filter={$filter}
                                            $search={$searchValue}
                                            defaultOrderby={orderby}
                                            qualifier={qualifier}
                                            actionRef={actionRef}
                                            navigation={navigation}
                                            autoRefresh={autoRefresh}
                                            parentPage='listReport'
                                            onRowPress={_onRowPress}
                                            headerTitle={window.micrAppTitle}
                                        />
                                    }
                                </div>)
                            };
                        default:
                            break;
                    }
                }
            })}
            onChange={(params) => {
                setActiveTabKey(params)
            }}
        /> : <SmartTable
            entitySet={entitySet}
            actionRef={actionRef}
            $filter={$filterValue}
            $search={$searchValue}
            navigation={navigation}
            parentPage='listReport'
            onRowPress={_onRowPress}
            headerTitle={window.micrAppTitle}
            SmartFilterBarRef={SmartFilterBarRef}
        />

    }, [currentTabs, activeTabKey, $filterValue, $searchValue, Aggregation, spaceDirectionRight])

    //master-detail 分割线
    const _renderSpace = useMemo(() => {
        const _onClick = () => {
            if (spaceDirectionRight) {
                setAggregation({
                    beginColumnPages: 16,
                    midColumnPages: 8,
                    endColumnPages: 0
                })
            } else {
                setAggregation({
                    beginColumnPages: 8,
                    midColumnPages: 16,
                    endColumnPages: 0
                })
            }
            setSpaceDirectionRight(!spaceDirectionRight)
        }

        return (
            <div className='space'>
                <div className='upCompact'></div>
                <div className='icon' onClick={_onClick}>
                    {spaceDirectionRight ? <RightOutlined /> : <LeftOutlined />}
                </div>
                <div className='downCompact'></div>
            </div>
        )
    }, [spaceDirectionRight])

    return (
        <div className='uilab-page-container' >
            <Row>
                <Col span={Aggregation ? Aggregation.beginColumnPages : 24} >
                    <ViewVaraint
                        appId={appId}
                    />
                    <div className='listReport-master'>
                        <div className='list' id='master-list'>
                            {_filterBar}
                            {_content}
                        </div>
                        {
                            Aggregation && Aggregation.midColumnPages !== 0 && _renderSpace
                        }
                    </div>
                </Col>
                <Col span={Aggregation ? Aggregation.midColumnPages : 0} className='listReport-detail'>
                    {Aggregation && queryEntity && <ObjectPage
                        queryEntity={queryEntity}
                        onClose={() => {
                            setAggregation(null)
                        }}
                        onFullWindow={(isFullWindow) => {
                            if (!isFullWindow) {
                                setAggregation({
                                    beginColumnPages: 0,
                                    midColumnPages: 24,
                                    endColumnPages: 0
                                })
                            } else {
                                if (spaceDirectionRight) {
                                    setAggregation({
                                        beginColumnPages: 8,
                                        midColumnPages: 16,
                                        endColumnPages: 0
                                    })
                                } else {
                                    setAggregation({
                                        beginColumnPages: 16,
                                        midColumnPages: 8,
                                        endColumnPages: 0
                                    })
                                }
                            }
                        }}
                    />}
                </Col>
                <Col span={Aggregation ? Aggregation.endColumnPages : 0}>endColumnPages</Col>
            </Row>
        </div>
    );
};

export default ListReport;
