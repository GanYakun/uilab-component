/*
 * @Author: lx.jin
 * @Date: 2022-01-19 12:32:12
 * @Description: 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 * @FilePath: /BANFF/pms3.0-banff/src/pages/ObjectPage/index.jsx
 */
import { useEffect, useState, useRef, useMemo } from 'react';
import { history as umiHistory, Prompt, useModel, useIntl } from 'umi';
import { PageContainer } from '@ant-design/pro-layout';
import { ProForm, ProFormGroup } from '@ant-design/pro-components';
import { Card, BackTop, Tabs, Popconfirm, Button, Modal, Space, Skeleton } from 'antd';
import { SmartTable, SmartField, SmartChart, SmartModalForm, DataPoint, SmartChartSingle } from '../config';
import { getConfig } from '../../Anotations/ObjectPage';
import { FullscreenOutlined, FullscreenExitOutlined, CloseOutlined, EditOutlined } from '@ant-design/icons';
const isDev = process.env.NODE_ENV === 'development'
import './index.less'
import { getTextByI18n } from '../../../utils/util';
const ObjectPage = (props) => {
    let {
        location,
        queryEntity: parentQueryEntity,
        pageMode: parentPageMode,
        onClose,
        onFullWindow
    } = props;

    let sendQueryEntity, sendPatchQuery, currentPatchEntity, sendIsChildPage, sendIsStickySessionCreate, sendPageMode
    //传递参数
    if (location && location.query) {
        sendQueryEntity = location.query.queryEntity
        sendPatchQuery = location.query.patchEntity
        sendPageMode = location.query.pageMode
        sendIsChildPage = location.query.isChildPage
        sendIsStickySessionCreate = location.query.isStickySessionCreate
    } else {
        sendQueryEntity = parentQueryEntity
        sendPageMode = parentPageMode
    }

    //设置当前对象的 patch对象
    currentPatchEntity = sendPatchQuery ? sendPatchQuery : sendQueryEntity

    //参数准备
    const { formatMessage } = useIntl();
    let { initialState, setInitialState } = useModel('@@initialState');
    const { pageMode } = initialState ? initialState : {}
    const [queryEntity, setQueryEntity] = useState(sendQueryEntity ? sendQueryEntity : null)
    const [isFullWindow, setIsFullWindow] = useState(false)//是否全屏模式
    const [loading, setLoading] = useState(false)

    //按钮modal
    const [currentActionName, setCurrentActionName] = useState(null)
    const [currentActionPath, setCurrentActionPath] = useState(null)
    const [currentModalTitle, setCurrentModalTitle] = useState(null)
    const [currentModalVisible, setCurrentModalVisible] = useState(false)
    const [currentMediaUploadLink, setCurrentMediaUploadLink] = useState(null)
    const [currentModalParams, setCurrentModalParams] = useState(null)
    const [currentIsQuickCreateAction, setCurrentIsQuickCreateAction] = useState(false)
    const [currentIsQuickCreateActionType, setCurrentIsQuickCreateActionType] = useState(null)

    //数据暂存
    const [currentRecord, setCurrentRecord] = useState(null)
    const headerContentRef = useRef()
    const pageContent = useRef()
    let currentInterval

    //config
    const {
        entitySet,
        navigation,
        annoRequest,
        Facets,
        HeaderFacets,
        HeaderInfo,
        Identification,
        autoRefresh,
        content,
        currentRouteName,
        stickySession,
        PrimaryKeys,
        discard,
        save,
        edit,
        patch,
        add,
        delete: deleteRow,
        controlAggregation,
        editHidden,
        editableHeaderContent,
        currentEntityTypeData,
        QuickCreateFacets
    } = getConfig({ queryEntity, currentRecord })

    //监听窗口变化 改变列数
    let objectPageElem = document.getElementById('objectPage')

    //定义需要拦截的内容
    const interceptContent = {
        eventsClass: ['ant-pro-right-content', 'ant-pro-top-nav-header-main-left'],
        clickClass: ['ant-menu-overflow-item']
    }
    const [isIntercept, setIsIntercept] = useState(false)

    //拦截监听函数
    const _interceptListener = (e) => {
        setIsIntercept(true)
        const bool = confirm('此页面包含未保存的数据。是否确定要离开页面？')
        if (bool) {
            _discard()
        } else {
            e.preventDefault();
            e.stopPropagation();
            setIsIntercept(false)
        }
    }

    //拦截浏览器关闭、刷新
    const beforeunload = (ev) => {
        if (ev) {
            ev.returnValue = '此页面包含未保存的数据。是否确定要离开页面？';
        }
    }

    //编辑时的拦截
    const _intercept = () => {
        const { eventsClass, clickClass } = interceptContent
        //a.处理禁用的信息
        eventsClass.map((item) => {
            const ele = document.getElementsByClassName(item)
            if (ele && ele[0]) {
                ele[0].style = `pointer-events: none`
            }
        })

        //b.处理拦截点击事件
        clickClass.map((item) => {
            const ele = document.getElementsByClassName(item)
            if (ele && ele[0]) {
                ele[0].addEventListener('click', _interceptListener)
            }
        })
    }

    //删除拦截
    const _removeIntercept = () => {
        const { eventsClass, clickClass } = interceptContent

        //a.处理禁用的信息
        eventsClass.map((item) => {
            const ele = document.getElementsByClassName(item)
            if (ele && ele[0]) {
                ele[0].style = `pointer-events: auto`
            }
        })

        //b.处理拦截点击事件
        clickClass.map((item) => {
            const ele = document.getElementsByClassName(item)
            if (ele && ele[0]) {
                ele[0].removeEventListener('click', _interceptListener)
            }
        })
    }

    //获取详情页数据
    const fetch = async () => {
        setLoading(true)
        const result = await annoRequest()
        console.log({ ObjectPageResult: result })
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
        } else {
            umiHistory.goBack()
        }
    }

    //处理拦截
    useEffect(() => {
        //编辑时拦截header的点击事件
        if (pageMode === 'edit') {
            _intercept()
            window.addEventListener('beforeunload', beforeunload)
        }

        return () => {
            _removeIntercept()
            window.removeEventListener('beforeunload', beforeunload)
        };
    }, [pageMode])

    //处理请求
    useEffect(() => {

        //请求详情页数据
        if (queryEntity) {
            fetch()
        }

        //stickySession调用NewAction
        if (!queryEntity && stickySession) {
            const { NewAction } = stickySession
            const path = `${entitySet}/${NewAction}`
            setCurrentActionName(NewAction)
            setCurrentModalTitle('新建')
            setCurrentActionPath(path)
            setCurrentModalVisible(!currentModalVisible)
        }

    }, [queryEntity, parentQueryEntity]);

    //循环查询数据
    useEffect(() => {
        //是否定时刷新
        if (autoRefresh && !isDev) {
            const { duration } = autoRefresh
            if (currentInterval) {
                clearInterval(currentInterval)
            }
            currentInterval = setInterval(async () => {
                await fetch(false)
            }, duration);
        }

        //清理监听、定时器
        return () => {
            currentInterval && clearInterval(currentInterval)
        };
    }, [])

    //列表点击事件
    const _onRowPress = (pathname, queryEntity, patchEntity, isChildPage) => {

        //判断是否为master-detail,或跳转页面
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
            umiHistory.push({
                pathname,
                query: {
                    queryEntity,
                    patchEntity,
                    pageMode,
                    isChildPage,
                },
            })
        }
    }

    //解析并渲染facet内容
    const _renderFacetContents = (sectionItem, isHeaderFacets) => {
        const { id: sectionId, label: sectionLabel, childfacets, targetData: sectionTargetData } = sectionItem;

        const _renderContent = (contentValue, id, label, isCollectionFacet) => {
            label = label && (label.search('@i18n>') === -1 ? label : formatMessage({ id: label }))

            if (!contentValue) return {}
            const { type, value, formEntityPrimaryKeys } = contentValue;
            var { targetEntitySet, targetPath, targetQualifier, targetNavigation, targetOrderby } = value;

            let isReadOnly = pageMode !== 'edit'
            if (isHeaderFacets && !editableHeaderContent) {
                isReadOnly = true
            }

            switch (type) {
                case 'table':
                    return {
                        type,
                        label,
                        content: (
                            <SmartTable
                                key={id}
                                // headerTitle={label && `( ${label} )`}
                                entitySet={targetEntitySet}
                                queryEntity={queryEntity}
                                qualifier={targetQualifier}
                                defaultOrderby={targetOrderby}
                                search={false}
                                use$Search={true}
                                pageMode={pageMode}
                                navigation={navigation}
                                targetPath={targetPath}
                                parentPage='objectPage'
                                onRowPress={_onRowPress}
                                parentPrimaryKeys={PrimaryKeys}
                                parentEditHidden={editHidden}
                                rowSelection={stickySession && pageMode === 'edit' ? 'checkbox' : null}
                                onBlur={async (value, path, record, entitySet, PrimaryKeys, tableRef) => {
                                    //console.log({ path, value, record, currentPatchEntity, entitySet, PrimaryKeys })
                                    const result = await patch({ path, value, record, queryEntity: currentPatchEntity, entitySet, PrimaryKeys })

                                    //stickySession 更新字段完成 刷新table数据
                                    if (result) {
                                        tableRef?.current?.reload()
                                    }
                                }}
                                onAdd={async (params) => {
                                    const { path, targetRef } = params
                                    const result = await add(path)
                                    if (result) {
                                        targetRef && targetRef.current.reload();
                                    }
                                }}
                                onDelete={async (params) => {
                                    const { selectedRowsItem, targetRef, PrimaryKeys, entitySet } = params
                                    const result = await deleteRow({ data: selectedRowsItem, entitySet, PrimaryKeys })
                                    if (result) {
                                        targetRef && targetRef.current.reload();
                                    }
                                }}
                            />
                        )
                    }
                case 'form':
                    const elem = value.map((item, index) => {
                        const { label, record, hiddenPath } = item;
                        const { path } = record;

                        //是否隐藏该字段
                        let isHidden = hiddenPath && currentRecord && currentRecord[hiddenPath]
                        return (
                            !isHidden && <SmartField
                                key={`field-${index}`}
                                entitySet={entitySet}
                                path={path}
                                label={label}
                                isReadOnly={isReadOnly}
                                record={currentRecord}
                                onBlur={async (value, batchPath, sfEntitySetName, sfPrimaryKeys) => {
                                    let prEntitySet, prPrimaryKeys
                                    if (!targetEntitySet) {
                                        prEntitySet = sfEntitySetName
                                        prPrimaryKeys = sfPrimaryKeys
                                    } else {
                                        prEntitySet = targetEntitySet
                                        prPrimaryKeys = formEntityPrimaryKeys
                                    }
                                    const result = await patch({
                                        path: path,//form 类型只out 当前字段
                                        value,
                                        record: currentRecord,
                                        queryEntity: currentPatchEntity,
                                        entitySet: prEntitySet,
                                        PrimaryKeys: prPrimaryKeys
                                    })
                                }}
                            />
                        );
                    })
                    return {
                        type,
                        label,
                        content: isHeaderFacets && pageMode !== 'edit' ?
                            <ProForm submitter={false} style={{ marginRight: 60 }} key={id} layout='horizontal' >
                                {label && <div style={{ fontSize: 14, fontWeight: 400, marginBottom: 10 }}>( {label} )</div>}
                                {elem}
                            </ProForm > : (
                                <ProForm submitter={false} grid={true} key={id} >
                                    <ProFormGroup label={isCollectionFacet && label ? `( ${label} )` : null}>
                                        {elem}
                                    </ProFormGroup>
                                </ProForm>
                            )
                    }
                case 'chart':
                    var { isSet, chartAnnotation, target } = value;
                    let inSction = false
                    if (isHeaderFacets == false) {
                        inSction = true
                    }
                    return {
                        type,
                        label,
                        content: (
                            <div key={`SmartChart${id}`}>
                                <div style={{
                                    display: 'block',
                                    whiteSpace: 'nowrap',
                                    fontFamily: '"72","72full",Arial,Helvetica,sans-serif',
                                    fontSize: '1rem',
                                    color: '#32363a',
                                    fontWeight: 'normal',
                                    marginBottom: 0
                                }}>
                                    {label}
                                </div>
                                {
                                    isHeaderFacets ? <SmartChart
                                        key={id}
                                        entitySet={targetEntitySet}
                                        isSet={isSet}
                                        target={target}
                                        chartAnnotation={chartAnnotation}
                                        queryEntity={queryEntity}
                                        record={currentRecord}
                                        inSection={inSction}
                                    /> :
                                        <SmartChartSingle
                                            entitySet={targetEntitySet}
                                            queryEntity={queryEntity}
                                            qualifier={targetQualifier}
                                            targetPath={targetNavigation}
                                        />
                                }
                            </div>
                        )
                    }
                case 'dataPoint':
                    const { Title, Value } = value
                    const DataPointTitle = Title && Title.search('@i18n>') === -1 ? Title ? Title : Value : Title ? formatMessage({ id: Title }) : Value
                    return {
                        type,
                        label,
                        content: (
                            <div key={`DataPoint${id}`}>
                                <div style={{ whiteSpace: 'nowrap', fontFamily: '"72","72full",Arial,Helvetica,sans-serif', fontSize: '14px', color: '#32363a', fontWeight: 400, marginBottom: 10 }}>( {DataPointTitle} )</div>
                                <ProForm submitter={false} grid={true} key={id} >
                                    <ProFormGroup >
                                        <DataPoint
                                            key={id}
                                            entitySet={entitySet}
                                            isReadOnly={isReadOnly}
                                            property={value}
                                            record={currentRecord}
                                            onBlur={async (params) => {
                                                const result = await patch({ path: value.Value, value: params, record: currentRecord, queryEntity: currentPatchEntity, entitySet: targetEntitySet, PrimaryKeys: formEntityPrimaryKeys })
                                            }}
                                        />
                                    </ProFormGroup>
                                </ProForm>
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
                const { childfacets, targetData, id, label } = a;
                returnId = id
                returnLabel = label
                if (childfacets) {
                    for (let b of childfacets) {
                        const { childfacets, targetData, id: bid, label: blabel } = b;
                        bid ? returnId = bid : returnId
                        blabel ? returnLabel = blabel : returnLabel
                        if (childfacets) {
                            //四层暂不支持，后期优化
                        } else {
                            //三层的情况
                            arr.push(_renderContent(targetData, returnId, returnLabel, true));
                        }
                    }
                } else {
                    //二层的情况
                    arr.push(_renderContent(targetData, returnId, returnLabel, true));
                }
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
    };

    //头部内容区域
    const _renderHeaderFacetContents = useMemo(() => {
        const contents = []
        const { sections } = HeaderFacets
        if (sections && currentRecord) {
            sections.map((sectionItem, index) => {
                const { isHidden } = sectionItem
                const { content } = _renderFacetContents(sectionItem, true)
                !isHidden && contents.push(<div key={`headerSection${index}`} style={{ marginRight: '1rem', marginBottom: '1rem' }}>{content}</div>)
            });
        }
        return contents

    }, [currentRecord, pageMode])

    //解析头数据
    const _getObjectPageHeaderOptions = useMemo(() => {
        const { Title, Description, ImageUrl } = HeaderInfo
        let imgHidden = false
        if (HeaderInfo.Initials === null && HeaderInfo.ImageUrl === null) {
            imgHidden = true
        }
        const defaultImageUrl = 'https://gw.alipayobjects.com/zos/antfincdn/K%24NnlsB%26hz/pageHeader.svg'

        //extra 头部按钮
        const extra = []
        if (onFullWindow) {
            extra.push(
                <Button key='isFullWindow' type='dashed' size='large' icon={!isFullWindow ? <FullscreenOutlined /> : <FullscreenExitOutlined />} onClick={() => {
                    onFullWindow(isFullWindow)
                    setIsFullWindow(!isFullWindow)
                }} />
            )
        }
        if (onClose) {
            extra.push(
                <Button key='close' type='dashed' size='large' icon={<CloseOutlined />} onClick={() => onClose()} />
            )
        }

        //stickSession 编辑按钮
        if (stickySession && stickySession.EditAction && pageMode !== 'edit' && !sendIsChildPage) {
            !editHidden && extra.push(
                <Button
                    key="editAction"
                    type="primary"
                    icon={<EditOutlined />}
                    onClick={async () => {
                        const result = await edit()
                        if (result) {
                            setInitialState({
                                ...initialState,
                                pageMode: 'edit'
                            })
                            setCurrentRecord(result.data)
                        }
                    }}
                >
                    编辑
                </Button>
            )
        }

        //QuickCreateFacets 编辑按钮
        if (QuickCreateFacets) {
            let { Label, Fields, ImmutableFields } = QuickCreateFacets
            //删除配置Immutable的字段
            Fields = Fields.filter((item) => {
                return ImmutableFields.findIndex((d) => d === item) == -1
            })
            if (Label) {
                Fields.length > 0 && !editHidden && extra.push(
                    <Button
                        key="QuickCreateFacets"
                        type="primary"
                        icon={<EditOutlined />}
                        onClick={() => {
                            let path = queryEntity
                            setCurrentActionPath(path)
                            setCurrentModalTitle('编辑')
                            setCurrentModalVisible(!currentModalVisible)
                            setCurrentModalParams(Fields)
                            setCurrentIsQuickCreateAction(true)
                            setCurrentIsQuickCreateActionType('edit')
                            setCurrentActionName(null)
                        }}>
                        编辑
                    </Button>
                )
            }
        }

        //Identification
        if (Identification && pageMode !== 'edit') {
            Identification.map((item, index) => {
                const { Action, DataFieldType, Label, isHidden, MediaUploadLink } = item
                const currentLabel = getTextByI18n(Label, formatMessage)
                currentRecord && !isHidden && extra.push(
                    <Button
                        key={`Identification${index}`}
                        type="primary"
                        onClick={async () => {
                            const path = `${queryEntity}/${Action}`
                            setCurrentModalTitle(currentLabel)
                            setCurrentActionName(Action)
                            setCurrentActionPath(path)
                            setCurrentModalVisible(!currentModalVisible)
                            setCurrentMediaUploadLink(MediaUploadLink)
                        }}
                    >
                        {currentLabel}
                    </Button>
                )
            })
        }

        return {
            header: {
                title: Title && Title.value,
                subTitle: Description && Description.value && Description.value,
                avatar: ImageUrl && ImageUrl.value && {
                    src: ImageUrl.value,
                    shape: 'square'
                },
                onBack: !parentQueryEntity ? () => {
                    umiHistory.goBack()
                } : null,
                extra: extra,
            },
            content: (
                <div ref={headerContentRef} style={{ display: pageMode === 'edit' ? 'none' : 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>
                    <img
                        src={ImageUrl && ImageUrl.value ? ImageUrl.value : defaultImageUrl}
                        style={{ display: imgHidden ? 'none' : '', marginRight: '1rem', marginBottom: '1rem' }}
                        alt="content"
                        width={150}
                        height={150}
                    />
                    {_renderHeaderFacetContents}
                </div>
            ),
        };
    }, [currentRecord, pageMode, isFullWindow])

    //渲染section
    const _renderSection = useMemo(() => {
        const { sections } = Facets
        const { sections: headerSections } = HeaderFacets

        const contents = [];
        //解析facets
        if (sections) {
            if (pageMode === 'edit') {
                //处理headerInfo的可编辑字段
                let objectInfo = null, objectInfoTargetData = null, ObjectInfovalue = []
                for (let key of Object.keys(HeaderInfo)) {
                    if (HeaderInfo[key] && HeaderInfo[key].type === 'DataField') {
                        ObjectInfovalue.push({
                            type: "UI.DataField",
                            record: HeaderInfo[key]
                        })
                    }
                }
                objectInfoTargetData = {
                    type: 'form',
                    value: ObjectInfovalue
                }
                //if (editableHeaderContent !== false) {
                objectInfo = {
                    id: 'objectInfo',
                    label: "主要信息",
                    targetData: objectInfoTargetData
                }
                //}
                //处理headerFacet的可编辑字段
                const headerInfo = []
                headerSections.map((item) => {
                    const { childfacets, isHidden } = item
                    if (!isHidden) {
                        const _push = (data) => {
                            const { targetData } = data
                            if (targetData && (targetData.type === 'form' || targetData.type === 'dataPoint')) {
                                headerInfo.push(data)
                            }
                        }

                        if (childfacets) {
                            childfacets.map((cItem) => {
                                _push(cItem)
                            })
                        } else {
                            _push(item)
                        }
                    }
                })
                sections.unshift({
                    id: 'header',
                    label: '主要内容',
                    childfacets: [
                        ObjectInfovalue.length > 0 && editableHeaderContent ? objectInfo : {},
                        ...headerInfo
                    ]
                })

            }

            sections.map((sectionItem, index) => {
                const { label, id, isHidden } = sectionItem
                if (!isHidden) {
                    const { content } = _renderFacetContents(sectionItem, id === 'header')
                    const key = `sectionItem${index}`;
                    const cardTitle = label && (label.search('@i18n>') === -1 ? label : formatMessage({ id: label }))

                    contents.push(
                        <Card
                            id={key}
                            key={key}
                            title={cardTitle}
                            style={{
                                marginTop: 24,
                            }}
                            bordered={true}
                        >
                            {content}
                        </Card>
                    )
                }
            });
        }
        return contents;
    }, [currentRecord, pageMode])

    //渲染自定义组件
    const _renderCustSection = useMemo(() => {
        const result = [];

        //自定义section
        if (content && content.body) {
            const { sections } = content.body
            for (let key of Object.keys(sections)) {
                const { name, position, title, component } = sections[key]
                const { placement, anchor } = position
                const sectionKey = `sectionItem${name}`;
                const cardTitle = title.search('@i18n>') === -1 ? title : formatMessage({ id: title })
                const elem = (
                    <Card
                        id={sectionKey}
                        key={sectionKey}
                        title={cardTitle}
                        style={{
                            marginBottom: 24,
                        }}
                        bordered={true}
                    >
                        {component({ record: currentRecord, queryEntity, Facets, entitySet, currentRouteName })}
                    </Card>
                )
                placement === 'Before' ? result.unshift(elem) : result.push(elem)
            }
        }

        return result
    }, [content])

    //编辑时底部按钮
    const _renderFooter = useMemo(() => {
        const result = sendIsChildPage ? [
            <Button
                key="2"
                type="primary"
                onClick={() => umiHistory.goBack()}
            >
                应用
            </Button>
        ] : [
            <Popconfirm
                key="Popconfirm"
                placement="top"
                title={`是否放弃所有修改`}
                onConfirm={() => _discard(sendIsStickySessionCreate === 'true')}
                okText="放弃"
                cancelText="取消"
            >
                <Button>取消</Button>
            </Popconfirm >,
            <Button
                key="2"
                type="primary"
                onClick={() => _save()}
            >
                保存
            </Button>,
        ]
        return result
    }, [pageMode, sendIsChildPage])

    //stickSestion save
    const _save = async () => {
        const result = await save();
        if (result) {
            _scollToTop()
            setInitialState({
                ...initialState,
                pageMode: 'detail'
            })
            setCurrentRecord({ ...currentRecord, ...result.data })
            //刷新listreport
            window.uilabKeep = true
        }
    }

    //返回顶部
    const _scollToTop = () => {
        objectPageElem.scrollTop = 0
    }

    //SmartModalForm
    const _modalForm = useMemo(() => {
        return <SmartModalForm
            title={currentModalTitle}
            record={currentRecord}
            entitySet={entitySet}
            actionName={currentActionName}
            actionPath={currentActionPath}
            mediaUploadLink={currentMediaUploadLink}
            mediaUploadKey={queryEntity}
            isQuickCreateAction={currentIsQuickCreateAction}
            isQuickCreateActionType={currentIsQuickCreateActionType}
            visible={currentModalVisible}
            params={currentModalParams}
            onCancel={() => {
                setCurrentModalVisible(!currentModalVisible)
                setCurrentModalParams(null)
                setCurrentIsQuickCreateAction(false)
                setCurrentIsQuickCreateActionType(null)
                if (!queryEntity && stickySession) {
                    umiHistory.goBack()
                }
            }}
            onFinish={(value) => {
                setCurrentModalVisible(!currentModalVisible)
                setCurrentModalParams(null)
                setCurrentIsQuickCreateAction(false)
                setCurrentIsQuickCreateActionType(null)

                //判断是否为stickySession创建页面
                if (!queryEntity && stickySession) {
                    setInitialState({
                        ...initialState,
                        pageMode: 'edit'
                    })
                    if (value && PrimaryKeys) {
                        let key, data, entity
                        if (PrimaryKeys.length === 1) {
                            key = PrimaryKeys[0]
                            data = value[key]
                        }
                        entity = `${entitySet}('${data}')`
                        setQueryEntity(entity)
                        //忘记什么逻辑了  后期补全！
                        const newurl = `${window.location.href}?queryEntity=${entity}&isStickySessionCreate=true`
                        window.history.replaceState('', '', newurl);
                    }
                } else {
                    fetch()
                }

                //刷新listreport数据
                window.uilabKeep = true
            }}
        />
    }, [currentModalVisible])

    //加载骨架
    const _renderSkeleton = () => {
        return (
            <div style={{ backgroundColor: '#fff', padding: 24 }}>
                <br />
                <Space>
                    <Skeleton.Button active={true} size='default' shape='default' block={false} />
                    <Skeleton.Avatar active={true} size='default' shape='circle' />
                    <Skeleton.Input active={true} size='default' />
                </Space>
                <br />
                <br />
                <Space>
                    <Skeleton.Button active={true} size='default' shape='default' block={false} />
                </Space>
                <br />
                <br />
                <Space>
                    <Skeleton.Image active={true} />
                    <Skeleton.Input active={true} size='default' />
                    <Skeleton.Input active={true} size='default' />
                    <Skeleton.Input active={true} size='default' />
                    <Skeleton.Input active={true} size='default' />
                    <Skeleton.Input active={true} size='default' />
                </Space>
                <br />
                <br />
                <br />
                <br />
                <Skeleton />
                <br />
                <br />
                <Skeleton />
                <br />
                <br />
                <Skeleton />
                <br />
                <br />
                <Skeleton />
                <br />
                <br />
                <Skeleton />
                <br />
                <br />
                <Skeleton />
            </div>
        )
    }

    //stickSestion discard 
    const _discard = async (isback = false) => {
        const result = await discard();
        if (result) {
            _scollToTop()
            setInitialState({
                ...initialState,
                pageMode: 'detail'
            })
            //1.为新建页面时的--取消  2.返回拦截时
            if (!sendQueryEntity || isback) {
                console.log({ sendQueryEntity, isback })
                umiHistory.goBack()
            }
        }
    }

    return (
        <div className='listReport-detail' id='objectPage'>
            {
                loading ? _renderSkeleton() : currentRecord && <PageContainer
                    {..._getObjectPageHeaderOptions}
                    affixProps={{ offsetTop: 48 }}
                    footer={pageMode === 'edit' && _renderFooter}
                >
                    <div ref={pageContent}>
                        {_renderSection}
                    </div>
                    {_renderCustSection}
                    <BackTop />
                    <Prompt
                        when={pageMode === 'edit' && !isIntercept}
                        message={(location, action) => {
                            console.log({ location, action })
                            if (location.pathname === '/' || location.pathname.search('menu') !== -1 || location.pathname === '/launchPad' || location.pathname === '/dashboard') {
                                _discard(false)
                                return true
                            } else {
                                if (action === 'POP' && !sendIsChildPage) {
                                    Modal.confirm({
                                        content: '此页面包含未保存的数据。是否确定要离开页面？',
                                        okText: '确定',
                                        cancelText: '取消',
                                        onOk: () => _discard(true),
                                    });
                                    return false;
                                }
                            }
                        }}
                    />
                </PageContainer>

            }
            {_modalForm}
        </div>
    );
};

export default ObjectPage;
