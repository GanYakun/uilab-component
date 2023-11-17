/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2022-09-20 10:33:25
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-10-07 12:04:00
 * @FilePath: /uilab-gbms/lib/o3smart-comp/UIComponents/AntDesignPro/SmartTable.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { useEffect, useState, useRef, useMemo } from 'react';
import { ProTable } from '@ant-design/pro-components';
import { getConfig } from '../../Anotations/SmartTable';
import { SmartField, SmartModalForm, DataPoint } from '../config';
import { Button, Space, Popover, List, Input } from 'antd'
import { history as umiHistory, useIntl, useModel } from 'umi';
import SmartChart from "./SmartChart";
import { RightOutlined, SortAscendingOutlined, SortDescendingOutlined, DashOutlined, DownloadOutlined, PlusOutlined, CloseOutlined } from '@ant-design/icons';
import lodash from 'lodash'
import moment from 'moment';
import { getObjectDiff, urlencode, getTextByI18n } from '../../../utils/util'
import XLSX from 'xlsx'

let currentTableActiveIndex = null
const SmartTable = (props) => {
    let {
        entitySet,
        search,
        defaultPageSize,
        $filter,
        qualifier,
        actionRef,
        navigation,
        queryEntity,
        targetPath,
        parentColumns,
        parentRequest,
        rowSelection: parentRowSelection,
        onSelect,
        $search: parent$Search,
        parentPage,
        headerTitle,
        pageMode,
        onBlur,
        onAdd,
        onDelete,
        parentPrimaryKeys,
        inLookup,
        onRowPress,
        defaultOrderby,
        SmartFilterBarRef,
        use$Search,
        parentEditHidden,
    } = props

    let { initialState, setInitialState } = useModel('@@initialState');
    const { variantConfig, onVarientChange } = initialState ? initialState : {}

    let {
        annoColumns,
        inLineBtns,
        headerBtns,
        annoRequest,
        stickySession,
        Deletable,
        Insertable,
        Updatable,
        UnSortable,
        PrimaryKeys,
        getPathValue,
        currentEntityTypeData,
        stickSessionCreateData,
        CriticalityPath,
        CreateHidden,
        DeleteHidden,
        LaucnPadConfig,
        rowSelection,
        QuickCreateFacets,
        getBatchPath,
        filterDefaultValue
    } = getConfig({ entitySet, qualifier, queryEntity, targetPath })
    const { formatMessage } = useIntl();
    let [currentRecord, setCurrentRecord] = useState(null)
    //excel 导出
    const [exporting, setExporting] = useState(false)

    //CreateHidden
    const [currentCreateHidden, setCurrentCreateHidden] = useState()

    //action modal
    const [currentActionName, setCurrentActionName] = useState(null)
    const [currentActionPath, setCurrentActionPath] = useState(null)
    const [currentModalVisible, setCurrentModalVisible] = useState(false)
    const [currentModalTitle, setCurrentModalTitle] = useState(null)
    const [currentModalParams, setCurrentModalParams] = useState(null)
    const [currentMediaUploadLink, setCurrentMediaUploadLink] = useState(null)
    const [currentMediaUploadKey, setCurrentMediaUploadKey] = useState(null)
    const [currentActionCollection, setCurrentActionCollection] = useState(null)
    const [currentIsQuickCreateAction, setCurrentIsQuickCreateAction] = useState(false)
    const [currentIsQuickCreateActionType, setCurrentIsQuickCreateActionType] = useState(null)
    const [currentModalRecord, setCurrentModalRecord] = useState(null)

    //$search
    let [$search, set$Search] = useState(parent$Search ? parent$Search : null)

    //表格选中项
    const [currentRowSelection, setCurrentRowSelection] = useState(parentRowSelection ? parentRowSelection : rowSelection)
    let [currentSelectedRowsItem, setCurrentSelectedRowsItem] = useState([])

    //配置table项
    let [columns, setColumns] = useState([])
    const targetColumns = parentColumns ? parentColumns : annoColumns//如果传递列配置项优先
    const isLinkToPage = navigation && (parentPage === 'listReport' && navigation[entitySet] || parentPage === 'objectPage' && navigation[targetPath])
    const _setTableColumns = (refreshType = 'init') => {
        columns = []

        //循环拼接 ant 的colums格式
        for (let row of targetColumns) {
            const { path,
                displayText,
                label,
                type,
                value,
                navigationPropertyPath,
                show,
                semanticObject,
                action,
                url
            } = row
            //判断当前字段是否显示
            let variantColumnArr = [], variantShow = show
            if (columnsStateMap && refreshType !== 'init') {
                variantShow = columnsStateMap[path].show
            }

            //是否存在对应的variant配置
            if (variantConfig && refreshType === 'init' && parentPage === 'listReport') {
                const { defaultVariantIndex, value: variantValue } = variantConfig
                variantValue[defaultVariantIndex].children.map((item) => {
                    const { content, changeType } = item
                    const { name } = content
                    if (name === path) {
                        if (changeType === 'removeColumn' || changeType === 'addColumn' || changeType === 'moveColumn') {
                            variantColumnArr.push(item)
                        }
                    }
                })

                //列相关设置
                if (variantColumnArr.length > 0) {
                    const { changeType } = variantColumnArr[variantColumnArr.length - 1]
                    //查找最后一个
                    switch (changeType) {
                        case 'removeColumn':
                            variantShow = false
                            break;
                        case 'addColumn':
                            variantShow = true
                            break;
                        case 'moveColumn':
                            variantShow = true
                            break;
                        default:
                            break;
                    }
                }
            }

            switch (type) {
                case 'UI.DataField':
                    //字段的排序、分组 配置
                    const getColumnSearchProps = (dataIndex, displayText) => {
                        if (inLookup) return {}

                        const hide = UnSortable && UnSortable.findIndex((item) => item === dataIndex) !== -1
                        const json = {
                            filterDropdown: ({ confirm }) => {

                                //正序
                                const _renderAsc = () => {
                                    let text = '正序', isCancel = false
                                    if (currentSorterTarget) {
                                        const { name, target } = currentSorterTarget
                                        if ((dataIndex === name || displayText === name) && target === 'asc') {
                                            text = '取消正序'
                                            isCancel = true
                                        }
                                    }

                                    return (
                                        <Button
                                            type={isCancel ? 'dashed' : 'primary'}
                                            onClick={() => _setTableSortAndGroup(displayText ? displayText : dataIndex, 'asc', confirm, isCancel)}
                                            icon={<SortAscendingOutlined />}
                                            size="small"
                                            style={{
                                                width: 90,
                                            }}
                                        >
                                            {text}
                                        </Button>
                                    )
                                }

                                //倒序
                                const _renderDesc = () => {
                                    let text = '倒序', isCancel = false
                                    if (currentSorterTarget) {
                                        const { name, target } = currentSorterTarget
                                        if ((dataIndex === name || displayText === name) && target === 'desc') {
                                            text = '取消倒序'
                                            isCancel = true
                                        }
                                    }

                                    return (
                                        <Button
                                            type={isCancel ? 'dashed' : 'primary'}
                                            onClick={() => _setTableSortAndGroup(displayText ? displayText : dataIndex, 'desc', confirm, isCancel)}
                                            icon={<SortDescendingOutlined />}
                                            size="small"
                                            style={{
                                                width: 90,
                                            }}
                                        >
                                            {text}
                                        </Button>
                                    )
                                }

                                //分组
                                const _renderGroup = () => {
                                    let text = '分组', isCancel = false
                                    if (currentGroupTarget) {
                                        if (dataIndex === currentGroupTarget || displayText === currentGroupTarget) {
                                            text = '取消分组'
                                            isCancel = true
                                        }
                                    }

                                    return (
                                        <Button
                                            type={isCancel ? 'dashed' : 'primary'}
                                            onClick={() => _setTableSortAndGroup(displayText ? displayText : dataIndex, 'group', confirm, isCancel)}
                                            icon={<SortDescendingOutlined />}
                                            size="small"
                                            style={{
                                                width: 90,
                                            }}
                                        >
                                            {text}
                                        </Button>
                                    )
                                }

                                return (
                                    <div
                                        style={{
                                            padding: 8,
                                        }}
                                        onKeyDown={(e) => e.stopPropagation()}
                                    >
                                        <Space>
                                            {_renderAsc()}
                                            {_renderDesc()}
                                            {_renderGroup()}
                                        </Space>
                                    </div>
                                )
                            },
                            filterIcon: (filtered) => {
                                if (currentSorterTarget && (currentSorterTarget.name === path || currentSorterTarget.name === displayText)) {
                                    switch (currentSorterTarget.target) {
                                        case 'asc':
                                            return (
                                                <SortAscendingOutlined
                                                    style={{
                                                        color: filtered ? '#1890ff' : undefined,
                                                    }}
                                                />

                                            )
                                        case 'desc':
                                            return (
                                                <SortDescendingOutlined
                                                    style={{
                                                        color: filtered ? '#1890ff' : undefined,
                                                    }}
                                                />
                                            )
                                        default:
                                            break;
                                    }


                                } else {
                                    return (
                                        <DashOutlined
                                            style={{
                                                color: filtered ? '#1890ff' : undefined,
                                            }}
                                        />
                                    )
                                }
                            },
                        }

                        return hide ? {} : json
                    }

                    //添加到显示
                    columns.push({
                        ...getColumnSearchProps(path, displayText),
                        title: getTextByI18n(label, formatMessage, path),
                        key: path,
                        dataIndex: path,
                        show: variantShow,
                        displayText,
                        type,
                        render: (_, record) => {
                            const option = {
                                record,
                                entitySet,
                                path,
                                queryEntity,
                                isReadOnly: pageMode !== 'edit' || !Updatable,
                                inCell: true,
                                inCellName: record['@odata.id'] + '_' + path,
                                pageMode,
                                tableRef: actionRef,
                                onBlur: (value, bacthPath, entitySet, PrimaryKeys, tableRef) => {
                                    //console.log({ value, path, record, entitySet, PrimaryKeys })
                                    onBlur(value, bacthPath ? bacthPath : path, record, entitySet, PrimaryKeys, tableRef)
                                }
                            }
                            return <SmartField {...option} />
                        },
                        renderFormItem: () => {
                            const option = {
                                entitySet,
                                path,
                                isReadOnly: false,
                                isAvailable: true,
                                inFilterBar: true,
                                inCell: true
                            }

                            return <SmartField {...option} />
                        }
                    })
                    break;
                case 'UI.Chart':
                    columns.push({
                        title: getTextByI18n(label, formatMessage, path),
                        key: path,
                        type,
                        value,
                        render: (_, record) => {
                            return (
                                <SmartChart
                                    entitySet={value.targetEntitySet}
                                    isSet={value.isSet}
                                    target={value.target}
                                    chartAnnotation={value.chartAnnotation}
                                    queryEntity={queryEntity}
                                    record={record}
                                    mode="LineItem"
                                />
                            )
                        }
                    })
                    break;
                case 'UI.DataPoint':
                    columns.push({
                        title: getTextByI18n(label, formatMessage, path),
                        key: path,
                        type,
                        value,
                        render: (_, record) => {
                            return (
                                <DataPoint
                                    entitySet={entitySet}
                                    isReadOnly={pageMode === 'detail'}
                                    property={value}
                                    record={record}
                                    onBlur={async (params) => {
                                    }}
                                />
                            )
                        }
                    })
                case 'UI.DataFieldWithNavigationPath':
                    columns.push({
                        title: getTextByI18n(label, formatMessage, path),
                        key: path,
                        dataIndex: path,
                        show: variantShow,
                        type,
                        value,
                        render: (_, record) => {
                            //显示的内容
                            const arr = record[navigationPropertyPath]
                            if (arr) {
                                let text = `${arr.length}个项目`
                                const content = () => {
                                    const data = []
                                    if (arr && arr.length) {
                                        arr.map((item) => {
                                            const currentRecord = lodash.cloneDeep(record)
                                            currentRecord[navigationPropertyPath] = item
                                            const { readonlyTextValue } = getPathValue(path, currentRecord)
                                            if (readonlyTextValue) {
                                                data.push(readonlyTextValue)
                                            } else {
                                                data.push('null')
                                            }
                                        })
                                    }

                                    return (
                                        <List
                                            size="small"
                                            dataSource={data}
                                            renderItem={(item) => <List.Item>{item}</List.Item>}
                                        />
                                    );
                                }

                                return (
                                    <Popover placement="right" content={content} trigger="click">
                                        <a onClick={(e) => e.stopPropagation()}>{text}</a>
                                    </Popover>
                                )
                            }
                        },
                    })
                    break;
                case 'UI.DataFieldForIntentBasedNavigation':
                    columns.push({
                        title: '应用跳转',
                        key: path,
                        dataIndex: path,
                        show: variantShow,
                        type,
                        value,
                        render: (_, record) => {
                            return <a
                                onClick={(e) => {
                                    e.stopPropagation()
                                    let route, menuPath, index = LaucnPadConfig.findIndex((LaucnPadItem) => LaucnPadItem.semanticObject === semanticObject && LaucnPadItem.semanticAction === action)
                                    if (index !== -1) {
                                        route = LaucnPadConfig[index].route
                                        menuPath = LaucnPadConfig[index].groupObj.path
                                        window.sendRecord = record
                                        window.history.pushState(null, '', `${menuPath}${route}`)
                                    }
                                }}>{getTextByI18n(label, formatMessage, path)}</a>
                        },
                    })
                    break;
                case 'UI.DataFieldWithUrl':
                    columns.push({
                        title: getTextByI18n(label, formatMessage, path),
                        key: path,
                        dataIndex: path,
                        type,
                        value,
                        url,
                        render: (_, record) => {
                            const { currentValue } = getPathValue(path, record)
                            const { currentValue: currentUrl } = getPathValue(url, record)
                            return <a onClick={(e) => {
                                e.stopPropagation()
                                window.location.href = currentUrl;
                            }}>{currentValue}</a>
                        },
                    })
                    break;
                default:
                    break;
            }
        }

        //添加行内按钮
        if (!inLookup && inLineBtns && inLineBtns.length > 0 && pageMode !== 'edit' || QuickCreateFacets && parentPage === 'objectPage') {
            columns.push({
                title: '操作',
                width: 'auto',
                hideInSearch: true,
                dataIndex: 'option',
                fixed: 'right',
                align: 'center',
                key: 'option',
                render: (_, record) => {
                    //添加行内按钮
                    let ele = []
                    inLineBtns.map((item, index) => {
                        const { Action, Label, HiddenPath, MediaUploadLink } = item
                        !record[HiddenPath] && ele.push(
                            <a
                                style={{ padding: '0 5px', fontSize: 12, fontWeight: 600 }}
                                key={`${index}-inlineBtn`}
                                type="primary"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    const { queryEntity } = _setRowActionPath(record)
                                    const path = `${queryEntity}/${Action}`
                                    setCurrentActionName(Action)
                                    setCurrentActionPath(path)
                                    setCurrentModalVisible(!currentModalVisible)
                                    setCurrentModalTitle(Label)
                                    setCurrentMediaUploadLink(MediaUploadLink)
                                    setCurrentMediaUploadKey(record['@odata.id'])
                                    setCurrentModalRecord(record)
                                }}
                            >
                                {Label}
                            </a>)
                    })

                    //QuickCreateFacets 编辑删除
                    if (QuickCreateFacets) {
                        let { Label, Fields, ImmutableFields } = QuickCreateFacets
                        //删除配置Immutable的字段
                        Fields = Fields.filter((item) => {
                            return ImmutableFields.findIndex((d) => d === item) == -1
                        })
                        if (Label && !parentEditHidden && parentPage !== 'listReport') {
                            Fields.length > 0 && ele.push(
                                Updatable&&<a
                                    key="QuickCreateFacets-edit"
                                    style={{ padding: '0 5px', fontSize: 12, fontWeight: 600 }}
                                    onClick={() => {
                                        setCurrentModalRecord(record)
                                        setCurrentActionPath(record['@odata.id'])
                                        setCurrentModalTitle('编辑')
                                        setCurrentModalVisible(!currentModalVisible)
                                        setCurrentModalParams(Fields)
                                        setCurrentIsQuickCreateAction(true)
                                        setCurrentIsQuickCreateActionType('edit')
                                    }}>
                                    编辑
                                </a>,
                                Deletable &&<a
                                    key="QuickCreateFacets-delete"
                                    style={{ padding: '0 5px', fontSize: 12, fontWeight: 600 }}
                                    onClick={() => {
                                        setCurrentActionPath(record['@odata.id'])
                                        setCurrentModalTitle('删除')
                                        setCurrentModalVisible(!currentModalVisible)
                                        setCurrentIsQuickCreateAction(true)
                                        setCurrentIsQuickCreateActionType('delete')
                                    }}>
                                    删除
                                </a>,
                            )
                        }
                    }
                    return (
                        ele
                    )
                },
            })
        }

        //是否需要跳转 添加跳转Icon
        if (isLinkToPage) {
            columns.push({
                title: '',
                width: 'auto',
                hideInSearch: true,
                dataIndex: 'option',
                fixed: 'right',
                key: 'navOptoin',
                align: 'center',
                disable: true,
                render: (_, record) => {
                    return <RightOutlined
                        style={{ color: '#6a6d70', fontSize: '12px', background: 'transparent' }}
                    />
                }
            })
        }

        //设置table 初始化选中项
        if (refreshType === 'init') {
            setColumnsStateMap(
                columns.reduce((obj, d) => {
                    // 初始化受控列状态需要指定column.key
                    obj[d.key || d.dataIndex] = {
                        show: "show" in d ? d.show : true,
                        fixed: d.fixed
                    };
                    return obj;
                }, {})
            )
        }

        //处理annotation中的默认排序
        if (defaultOrderby && (refreshType === 'init' || !currentSorterTarget)) {
            const { name } = defaultOrderby
            if (UnSortable.findIndex((item) => item === name) === -1) {
                setCurrentSorterTarget(defaultOrderby)
            }
        }

        setColumns(lodash.cloneDeep(columns))
    }

    //查询是否需要隐藏stick创建按钮
    const queryCurrentCreateHidden = async () => {
        if (typeof CreateHidden === 'boolean') {
            setCurrentCreateHidden(CreateHidden)
        } else {
            const result = await CreateHidden()
            if (result) {
                setCurrentCreateHidden(result.data.value)
            }
        }
    }

    //列变化 重新加载数据
    useEffect(() => {
        if (columns.length === 0) {
            _setTableColumns()
        }
        if (columns.length > 0 && actionRef) {
            actionRef.current.reload()
        }
        if (initialState && initialState.actionRefObj) {
            initialState.actionRefObj[targetPath] = actionRef
        }
        if (!currentCreateHidden) {
            queryCurrentCreateHidden()
        }
    }, [])

    //variant 列设置
    let [columnsStateMap, setColumnsStateMap] = useState(null);

    //当variantConfig配置变化时
    useEffect(() => {
        if (variantConfig && columns.length > 0 && parentPage === 'listReport') {
            _setTableColumns()
            _setSortAndGroupByVariantConfig()
        }
    }, [variantConfig])

    //监听table列变化
    const _onColumnsStateChange = (map) => {
        if (JSON.stringify(map) !== '{}') {
            for (let a of columns) {
                const { dataIndex: path } = a
                for (let key of Object.keys(map)) {
                    if (path === key) {
                        a.show = map[key].show
                    }
                }
            }
            setColumns(lodash.cloneDeep(columns))

            //判断修改的内容 并添加到change
            const difference = getObjectDiff(columnsStateMap, map)
            const changes = []
            if (difference && difference.length > 0) {
                for (let name of difference) {
                    const { show } = map[name]
                    const changeType = show ? "addColumn" : 'removeColumn'
                    changes.push({
                        changeType,
                        content: { name },
                        selectorType: `InvoicesList--fe::table::AllForSatus::LineItem`
                    })
                }
            }
            onVarientChange && onVarientChange(changes)
            setColumnsStateMap(map)
            actionRef && actionRef.current.reload()
        }
    }

    //根据variantConfig初始化排序
    const _setSortAndGroupByVariantConfig = () => {
        //处理variantConfig中的默认排序
        let sort = null, group = null
        if (variantConfig && parentPage === 'listReport') {
            const variantSortArr = [], variantGroupArr = []
            const { defaultVariantIndex, value: variantValue } = variantConfig
            variantValue[defaultVariantIndex].children.map((item) => {
                const { changeType } = item
                if (changeType === 'removeSort' || changeType === 'addSort') {
                    variantSortArr.push(item)
                }
                if (changeType === 'removeGroup' || changeType === 'addGroup') {
                    variantGroupArr.push(item)
                }
            })

            //sort
            if (variantSortArr.length > 0) {
                const { changeType, content } = variantSortArr[variantSortArr.length - 1]
                const { name, descending } = content
                //查找最后一个
                switch (changeType) {
                    case 'removeSort':
                        break;
                    case 'addSort':
                        sort = {
                            name: name,
                            target: descending ? 'desc' : 'asc'
                        }
                        break;
                    default:
                        break;
                }

            }

            //group
            if (variantGroupArr.length > 0) {
                const { changeType, content } = variantGroupArr[variantGroupArr.length - 1]
                const { name } = content
                //查找最后一个
                switch (changeType) {
                    case 'removeGroup':
                        break;
                    case 'addGroup':
                        group = name
                        break;
                    default:
                        break;
                }
            }
        }
        setCurrentSorterTarget(sort)
        setCurrentGroupTarget(group)
    }

    //正序、倒序、分组  
    const [currentSorterTarget, setCurrentSorterTarget] = useState(null)
    const [currentGroupTarget, setCurrentGroupTarget] = useState(null)
    const _setTableSortAndGroup = (dataIndex, type, confirm, isCancel) => {
        switch (type) {
            case 'asc':
                if (isCancel) {
                    setCurrentSorterTarget(null)
                } else {
                    setCurrentSorterTarget(lodash.cloneDeep({
                        name: dataIndex,
                        target: 'asc'
                    }))
                }
                const ascChangeType = isCancel ? 'removeSort' : "addSort"

                onVarientChange && onVarientChange([{
                    changeType: ascChangeType,
                    content: { name: dataIndex, descending: false },
                    selectorType: `InvoicesList--fe::table::AllForSatus::LineItem`
                }])
                break;
            case 'desc':
                if (isCancel) {
                    setCurrentSorterTarget(null)
                } else {
                    setCurrentSorterTarget(lodash.cloneDeep({
                        name: dataIndex,
                        target: 'desc'
                    }))
                }
                const descChangeType = isCancel ? 'removeSort' : "addSort"
                onVarientChange && onVarientChange([{
                    changeType: descChangeType,
                    content: { name: dataIndex, descending: true },
                    selectorType: `InvoicesList--fe::table::AllForSatus::LineItem`
                }])
                break;
            case 'group':
                if (isCancel) {
                    setCurrentGroupTarget(null)
                } else {
                    setCurrentGroupTarget(dataIndex)
                }
                const gtoupChangeType = isCancel ? 'removeGroup' : "addGroup"
                onVarientChange && onVarientChange([{
                    changeType: gtoupChangeType,
                    content: { name: dataIndex, descending: true },
                    selectorType: `InvoicesList--fe::table::AllForSatus::LineItem`
                }])
                break;
            default:
                break;
        }
        confirm({
            closeDropdown: true,
        });
    }
    //当排序、分组修改时
    useEffect(() => {
        _setTableColumns('change')
        actionRef && actionRef.current.reload()
    }, [currentSorterTarget, currentGroupTarget])

    //分组头显示
    const _onAddTR = (row, unm) => {
        const { index, title, value } = row
        const pro = document.getElementById("ProTable");
        if (pro) {
            const tb = Array.from(pro.getElementsByTagName("table"))[0]
            const newTr = tb.insertRow(index + unm + 1);//添加新行，trIndex就是要添加的位置
            newTr.className = "TableTd";
            const newTd1 = newTr.insertCell();
            newTd1.colSpan = columns.length;
            newTd1.innerHTML = `${title} : ${value}`
        }
    }

    //设置行内action 绑定的主对象
    const _setRowActionPath = (record) => {
        const { key } = currentEntityTypeData
        let result, str = ''
        if (key[0].propertyRef.length === 1) {
            str = `'${record[key[0].propertyRef[0].name]}'`
        } else {
            key[0].propertyRef.map((item, index) => {
                const { name } = item
                const val = name === 'fromDate' ? `${name}=${record[name]}` : `${name}='${record[name]}'`
                str += index === 0 ? val : `,${val}`
            })
        }
        str = urlencode(str)
        if (queryEntity && targetPath) {
            result = {
                queryEntity: `${queryEntity}/${targetPath}(${str})`,
                pathchEntity: `${entitySet}(${str})`
            }
        } else {
            result = {
                queryEntity: `${entitySet}(${str})`,
                pathchEntity: `${entitySet}(${str})`
            }
        }
        return result
    }

    //判断当前table,是否在可视区域
    const ref = useRef()
    let [inView, setInView] = useState(false)
    if (!actionRef) {
        actionRef = useRef()
    }
    let objectPageElem = document.getElementById('objectPage')
    const resizeWindow = () => {
        const elementInView = (element) => {
            const rect = element.getBoundingClientRect()
            const yInView = rect.top < window.innerHeight && rect.bottom > 0
            const xInView = rect.left < window.innerWidth && rect.right > 0
            return yInView && xInView
        }
        if (ref && ref.current) {
            if (elementInView(ref.current) && !currentRecord && !inView) {
                !inView && actionRef && actionRef.current.reload()
                setInView(true)
            }
        }
    }

    //监听窗口变化
    useEffect(() => {
        if (!currentRecord) {
            objectPageElem = document.getElementById('objectPage')
            if (objectPageElem) {
                objectPageElem.addEventListener('scroll', resizeWindow)
            }
            //标记需要优化11.15
            setTimeout(() => {
                resizeWindow()
            }, 500);
        }
        return () => {
            objectPageElem && objectPageElem.removeEventListener('scroll', resizeWindow)
        };
    }, [currentRecord])

    //设置master-Detail table 选中项 监听键盘事件
    useEffect(() => {
        if (currentRecord && parentPage === 'listReport') {
            let currentData = currentRecord.data.value
            document.onkeydown = function (e) {
                const keyCode = e.keyCode

                if (keyCode === 38) {
                    // 38: 键盘上
                    if (currentTableActiveIndex > 0) {
                        currentTableActiveIndex--;
                    }
                } else if (keyCode === 40) {
                    // 40: 键盘下
                    if (currentTableActiveIndex < currentData.length - 1) {
                        currentTableActiveIndex++;
                    }
                }

                //e.preventDefault setTableSelect
                if (keyCode === 38 || keyCode === 40) {
                    e.preventDefault()
                    _setTableSelect(currentTableActiveIndex)
                }

                //回车键
                if (keyCode === 13 && currentTableActiveIndex !== null) {
                    _historyPush(currentData[currentTableActiveIndex], currentTableActiveIndex)
                }
            }
        }
    }, [currentRecord, currentTableActiveIndex])

    //设置键盘选中
    const _setTableSelect = (value) => {
        currentTableActiveIndex = value
        let father = document.getElementById('master-list')
        const elems = father ? father.getElementsByTagName('tr') : null

        if (elems) {
            if (elems[value].offsetTop < father.scrollTop) {
                father.scrollTop = elems[value].offsetTop
            } else if (elems[value].offsetTop > father.scrollTop + 75) {
                father.scrollTop = elems[value].offsetTop - 75
            }

            if (elems[value].offsetTop > father.scrollTop + 75) {
                father.scrollTop = elems[value].offsetTop - 75
            } else if (elems[value].offsetTop < father.scrollTop) {
                father.scrollTop = elems[value].offsetTop
            }

            const arr = Array.from(elems).filter((item) => item && item.dataset.rowKey)
            arr.map((item, index) => {
                if (index === value) {
                    item.style.background = '#E6F4FF'
                } else {
                    item.style.background = 'transparent'
                }
            })
        }
    }

    //页面跳转 判断是否是链接
    const _historyPush = (record) => {
        if (isLinkToPage) {
            let pathname, currentQueryEntity, isChildPage = false
            const { queryEntity, pathchEntity } = _setRowActionPath(record)
            if (parentPage === 'listReport') {
                //查看详情页
                const { detail } = navigation[entitySet]
                pathname = detail.route
            } else {
                //查看子详情页
                const { detail } = navigation[targetPath]
                pathname = detail.route
                isChildPage = true
            }
            //console.log({ pathname, queryEntity, pathchEntity, isChildPage })
            if (pathname, queryEntity) {
                onRowPress && onRowPress(pathname, queryEntity, pathchEntity, isChildPage)
            }
        }
    }

    //判断是否需要多选或者单选
    const _rowSelection = () => {
        switch (currentRowSelection) {
            case 'radio':
                return {
                    type: `radio`,
                    onChange: (_, selectedRowsItem) => {
                        setCurrentSelectedRowsItem(selectedRowsItem)
                        onSelect && onSelect(selectedRowsItem);
                    },
                };
            case 'checkbox':
                return {
                    type: `checkbox`,
                    onChange: (_, selectedRowsItem) => {
                        setCurrentSelectedRowsItem(selectedRowsItem)
                    },
                    getCheckboxProps: () => {
                        //console.log({ record })
                    }
                }
            default:
                break;
        }
    };

    //数据excel 导出
    const _exportExcelByDoubleDimensArray = (workSheetData, fileName = 'example.xlsx') => {
        const ws = XLSX.utils.aoa_to_sheet(workSheetData);
        const workSheetName = '表格';
        const workbook = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(workbook, ws, workSheetName);

        // 获取第一个工作表
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];

        // 获取所有单元格的范围
        const range = XLSX.utils.decode_range(worksheet['!ref']);

        // 创建样式对象
        const headerStyle = {
            font: {
                bold: true, // 加粗
                size: 22, // 字号
                italic: true // 斜体
            }
        };

        // 将样式应用于头部的所有单元格
        for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col });
            const cell = worksheet[cellAddress];

            if (!cell) {
                continue; // 如果单元格不存在，跳过该单元格
            }

            if (!cell.s) {
                cell.s = {}; // 如果单元格没有样式对象，创建一个新的样式对象
            }

            cell.s = { ...cell.s, ...headerStyle }; // 合并样式对象
        }

        return XLSX.writeFile(workbook, fileName, { type: 'binary' });
    };

    //渲染toolBarRender
    const _renderToolBarRender = useMemo(() => () => {
        const result = []

        //stickSession 新建按钮
        if (stickySession) {
            const { NewAction } = stickySession
            if (NewAction && !currentCreateHidden) {
                result.push(
                    <Button
                        key="button"
                        type="dashed"
                        size='small'
                        icon={<PlusOutlined />}
                        onClick={() => {
                            let pathname
                            if (parentPage === 'listReport') {
                                const { detail } = navigation[entitySet]
                                pathname = detail.route
                            }
                            if (pathname) {
                                umiHistory.push({
                                    pathname,
                                    query: {},
                                })
                            }
                        }}>
                        新建
                    </Button>
                )
            }
        }

        //QuickCreateFacets 创建
        if (QuickCreateFacets) {
            let { Label, Fields } = QuickCreateFacets
            Label = Label && (Label.search('@i18n>') === -1 ? Label : formatMessage({ id: Label }))

            if (Label && Insertable && !parentEditHidden) {
                result.push(
                    <Button
                        key="QuickCreateFacets"
                        size='small'
                        type="dashed"
                        icon={<PlusOutlined />}
                        onClick={() => {
                            let path
                            if (queryEntity && targetPath) {
                                path = `${queryEntity}/${targetPath}`
                            } else {
                                path = `${entitySet}`
                            }
                            setCurrentActionPath(path)
                            setCurrentModalTitle(Label)
                            setCurrentModalVisible(!currentModalVisible)
                            setCurrentModalParams(Fields)
                            setCurrentIsQuickCreateAction(true)
                            setCurrentIsQuickCreateActionType('create')
                        }}>
                        {Label}
                    </Button>
                )
            }
        }

        //stickSession 关联对象添加 删除按钮
        if (pageMode === 'edit') {
            result.push(
                Insertable && <Button
                    key="add"
                    type="dashed"
                    size='small'
                    icon={<PlusOutlined />}
                    onClick={() => {
                        const path = `${queryEntity}/${targetPath}`
                        let modalParams = []
                        //调用newAction的参数
                        stickSessionCreateData.map((item) => {
                            const { text, hidden } = item
                            if (!hidden) {
                                modalParams.push(text)
                            }
                        })
                        setCurrentActionPath(path)
                        setCurrentModalTitle('添加项')
                        setCurrentModalVisible(!currentModalVisible)
                        setCurrentModalParams(modalParams)
                    }}
                >
                    添加项
                </Button>,
                Deletable && !DeleteHidden && <Button
                    key="delete"
                    size='small'
                    type='dashed'
                    icon={< CloseOutlined /> }
                    disabled={currentSelectedRowsItem.length === 0}
                    onClick={() => {

                        onDelete && onDelete({ selectedRowsItem: currentSelectedRowsItem, targetRef: actionRef, PrimaryKeys, entitySet })
                        //选中清空
                        setCurrentSelectedRowsItem([])
                    }}
                >
                    删除项
                </Button>)
        }

        //lineItem 中的 headerBtns
        if (!inLookup && headerBtns && headerBtns.length > 0 && pageMode !== 'edit') {
            headerBtns.map((item, index) => {
                let { Action, Label, MediaUploadLink, isBound, isCollection } = item
                Label = Label && (Label.search('@i18n>') === -1 ? Label : formatMessage({ id: Label }))

                //console.log({ Action, Label, MediaUploadLink, isBound, isCollection, item })
                result.push(
                    <Button
                        type="dashed"
                        size='small'
                        style={{ padding: '0 5px' }}
                        key={`${index}-inlineBtn`}
                        disabled={isBound && currentSelectedRowsItem.length === 0 && !isCollection}
                        onClick={(e) => {
                            e.stopPropagation()
                            let path
                            //console.log({ queryEntity, targetPath, Action, isBound, isCollection })
                            if (queryEntity && targetPath) {
                                path = isCollection ? `${queryEntity}/${targetPath}/${Action}` : Action
                            } else {
                                path = isCollection ? `${entitySet}/${Action}` : Action
                            }
                            console.log({ path, isCollection })
                            setCurrentActionName(Action)
                            setCurrentActionPath(path)
                            setCurrentModalVisible(!currentModalVisible)
                            setCurrentModalTitle(Label)
                            setCurrentMediaUploadLink(MediaUploadLink)
                            setCurrentMediaUploadKey(queryEntity)
                            setCurrentActionCollection(isCollection)
                        }}
                    >
                        {Label}
                    </Button>)
            })
        }

        //listReport excel导出
        if (parentPage === 'listReport') {
            result.push(
                <Button
                    key="excel"
                    type="dashed"
                    size='small'
                    icon={< DownloadOutlined />}
                    loading={exporting}
                    onClick={async () => {
                        setExporting(true)
                        const headers = []
                        const headersKeys = []
                        const datas = []
                        columns.map((item) => {
                            const { show, title, dataIndex } = item
                            if (show) {
                                headers.push(title)
                                headersKeys.push(dataIndex)
                            }
                        })

                        const result = await annoRequest({ option: {}, columns })
                        if (result) {
                            const { value } = result.data
                            for (let a of value) {
                                const rows = []
                                for (let b of headersKeys) {
                                    const { readonlyTextValue } = getPathValue(b, a)
                                    rows.push(readonlyTextValue)
                                }
                                datas.push(rows)
                            }
                            const workSheetData = [
                                headers,
                                ...datas,
                            ];
                            //console.log({ workSheetData,annoColumns, annoRequest, columns, result, getPathValue })
                            await _exportExcelByDoubleDimensArray(workSheetData, `${headerTitle}.xlsx`)
                            setTimeout(() => {
                                setExporting(false)
                            }, 3000);
                        }
                    }}>
                    数据导出
                </Button>
            )
        }

        return result
    }, [stickySession, currentSelectedRowsItem, exporting])

    //SmartModalForm
    const _modalForm = useMemo(() => {
        return <SmartModalForm
            entitySet={entitySet}
            record={currentModalRecord}
            actionName={currentActionName}
            actionPath={currentActionPath}
            boundActionData={currentSelectedRowsItem}
            mediaUploadLink={currentMediaUploadLink}
            mediaUploadKey={currentMediaUploadKey}
            actionCollection={currentActionCollection}
            isQuickCreateAction={currentIsQuickCreateAction}
            isQuickCreateActionType={currentIsQuickCreateActionType}
            visible={currentModalVisible}
            params={currentModalParams}
            title={currentModalTitle}
            onCancel={() => {
                //console.log({ parentPage })
                setCurrentActionName(null)
                setCurrentModalVisible(!currentModalVisible)
                setCurrentModalParams(null)
                setCurrentIsQuickCreateAction(false)
                setCurrentIsQuickCreateActionType(null)
                setCurrentModalRecord(null)
                //stickSession模式中的action 执行后的逻辑
                if (!queryEntity && stickySession && parentPage !== 'listReport') {
                    umiHistory.goBack()
                }
            }}
            onFinish={(value) => {
                setCurrentActionName(null)
                setCurrentModalVisible(!currentModalVisible)
                setCurrentModalParams(null)
                setCurrentIsQuickCreateAction(false)
                setCurrentIsQuickCreateActionType(null)
                setCurrentModalRecord(null)
                setCurrentSelectedRowsItem([])

                //判断是否为创建页面 stickSession模式中的action 执行后的逻辑
                if (!queryEntity && stickySession && parentPage !== 'listReport') {
                    if (value && PrimaryKeys) {
                        let key, data, entity
                        if (PrimaryKeys.length === 1) {
                            key = PrimaryKeys[0]
                            data = value[key]
                        }
                        entity = `${entitySet}('${data}')`
                        setQueryEntity(entity)
                        setPageMode('edit')
                    }
                }

                //判断是否为创建页面 跳转到详情页
                if (QuickCreateFacets && parentPage === 'listReport') {
                    let pathname = navigation?.[entitySet]?.detail?.route
                    const queryEntity = getBatchPath({ entitySet, record: value, PrimaryKeys })
                    if (pathname && queryEntity) {
                        umiHistory.push({
                            pathname,
                            query: {
                                queryEntity: queryEntity,
                            },
                        })
                    } else {
                        console.log(`${ entitySet } QuickCreateFacets 没有配置详情页`)
                        //console.error(`${entitySet} QuickCreateFacets 配置错误`)
                    }
                }

                //刷新数据
                actionRef?.current?.reloadAndRest()
            }}
        />
    }, [currentModalVisible, currentModalRecord])

    //判断用户是否在选中内容
    const getSelected = () => {
        if (window.getSelection) {
            //ie9以上及其他
            return window.getSelection().toString()
        } else {
            //ie9以下
            const selection = document.selection?.createRange() // 这里需要注意  有时候这个?会报错  报错的时候去掉就好了
            if (selection.text) {
                return selection.text.toString()
            }
            return ''
        }
    }

    //设置Criticality
    const _setCriticalityByPath = (data) => {
        const indexArr = []
        if (CriticalityPath && data) {
            data.map((item, index) => {
                indexArr.push({
                    index,
                    level: item[CriticalityPath]
                })
            })
        }
        const pro = document.getElementById("ProTable");
        if (indexArr.length > 0 && pro) {
            const tb = Array.from(pro.getElementsByTagName("table"))[0]
            const trArr = Array.from(tb.getElementsByTagName('tr')).filter((item) => item.className === 'ant-table-row ant-table-row-level-0')
            const enumObj = {
                1: '#b00',
                2: '#eea76a',
                3: '#107e3e'
            }
            for (let a of indexArr) {
                const { index, level } = a
                trArr[index].style = `border-left: 5px solid ${enumObj[level]}`
            }
        }

    }

    //渲染主表格
    const _renderTable = useMemo(() => {
        return (
            <ProTable
                editable
                fixed
                id='ProTable'
                columns={columns}
                search={search}
                debounceTime={50}
                actionRef={actionRef}
                scroll={{ x: 'max-content' }} // 设置scroll
                form={{
                    layout: 'vertical'
                }}
                request={async (params) => {
                    //处理是否默认查询
                    if (!inView || (parentPage === 'objectPage' && !queryEntity)) return

                    //处理应用跳转后的参数问题
                    if (SmartFilterBarRef && SmartFilterBarRef.current && window.sendRecord) {
                        const filterBarVal = SmartFilterBarRef.current.getFieldsValue()
                        if (filterBarVal) {
                            for (let key of Object.keys(filterBarVal)) {
                                if (filterBarVal[key] && !params[key]) {
                                    params[key] = filterBarVal[key]
                                }
                            }
                        }
                    }

                    const { pageSize, current, ...fiterParams } = params
                    const option = {
                        $top: pageSize,
                        $skip: pageSize * (current - 1),
                        $count: true
                    }

                    //处理filter
                    if ($filter) {
                        option.$filter = $filter
                    }
                    //处理默认过滤条件
                    if (filterDefaultValue){
                        if (!option.$filter){
                            option.$filter = filterDefaultValue
                        }else{
                            option.$filter += ` and ${filterDefaultValue}`
                        }
                    }
                    //处理fiterbar的过滤条件
                    if (JSON.stringify(fiterParams) !== '{}') {
                        let onSearchFilter, url
                        for (let key of Object.keys(fiterParams)) {
                            if (fiterParams[key] !== '' && fiterParams[key] != null) {

                                if (fiterParams[key] instanceof Array) {
                                    //处理 dataTime类型的时间筛选
                                    url = `${key} gt ${moment(`${fiterParams[key][0]} 00:00:00`).format('YYYY-MM-DDTHH:mm:ss.SSSZ')} and ${key} lt ${moment(`${parmas[key][0]} 23:59:59`).format('YYYY-MM-DDTHH:mm:ss.SSSZ')}`
                                } else {
                                    url =
                                        key.search('Id') == -1
                                            ? `contains(${key}, '${fiterParams[key]}')`
                                            : `${key} eq '${fiterParams[key]}'`;
                                }

                                //页面搜索条件的过滤条件
                                if (!onSearchFilter) {
                                    onSearchFilter = url;
                                } else {
                                    onSearchFilter += ` and ${url}`;
                                }
                            }
                        }
                        if (onSearchFilter) {
                            option.$filter = onSearchFilter
                        } else {
                            option.$filter = null
                        }
                    }

                    //处理$search
                    if (parent$Search) {
                        option.$search = `"${parent$Search}"`
                    }
                    if ($search) {
                        option.$search = `"${$search}"`
                    }

                    //处理sort,group
                    let orderby = ''
                    if (currentGroupTarget) {
                        orderby = `${currentGroupTarget}`
                    }
                    if (currentSorterTarget) {
                        const { name, target } = currentSorterTarget
                        if (orderby === '') {
                            orderby = `${name} ${target}`
                        } else {
                            if (currentGroupTarget === name) {
                                orderby = `${name} ${target}`
                            } else {
                                orderby += `,${name} ${target}`
                            }
                        }
                    }
                    if (orderby !== '') {
                        option.$orderby = orderby
                    }

                    const result = parentRequest ? await parentRequest({ option }) : await annoRequest({ option, columns })

                    if (result) {
                        currentRecord = result
                        setCurrentRecord(result)
                        //处理对象的关系树
                        if (parentPage === 'objectPage' && initialState.stateTree) {
                            if (!initialState.stateTree[currentEntityTypeData.name]) {
                                initialState.stateTree[currentEntityTypeData.name] = {
                                    data: result.data,
                                    navigationProperty: currentEntityTypeData.navigationProperty
                                }
                                setInitialState(initialState)
                            } else {
                                initialState.stateTree[currentEntityTypeData.name] = {
                                    ...initialState.stateTree[currentEntityTypeData.name],
                                    data: result.data,
                                    navigationProperty: currentEntityTypeData.navigationProperty
                                }
                                setInitialState(initialState)
                            }
                        }

                        const { value, msg } = result.data;
                        //1.设置key
                        value.map((item) => {
                            item.key = item['@odata.id'];
                        });

                        const obj = {
                            data: value,
                            total: result.data['@odata.count'],
                            success: msg,
                            pageSize: params.pageSize,
                            current: params.current,
                        };
                        console.log({ tableResult: obj, result });
                        window.sendRecord = null//释放传值
                        return obj;
                    }
                }}
                onLoad={() => {
                    if (currentRecord && !inLookup) {
                        const { value } = currentRecord.data

                        //处理设置Criticality
                        _setCriticalityByPath(value)

                        //循环处理数据
                        let groupIndexArr = [], currentGroupIndexValue = null
                        value.map((item, index) => {
                            //处理group分组显示
                            if (currentGroupTarget) {
                                //主对象的字段
                                const { readonlyTextValue, currentValue } = getPathValue(currentGroupTarget, item)
                                if (currentValue !== currentGroupIndexValue) {
                                    currentGroupIndexValue = currentValue
                                    const titleIndex = columns.findIndex((item) => item.dataIndex === currentGroupTarget || item.displayText === currentGroupTarget)
                                    groupIndexArr.push({
                                        index: index,
                                        title: columns[titleIndex].title,
                                        value: readonlyTextValue
                                    })
                                }
                            }
                        });

                        //先删除
                        const removeElem = Array.from(document.getElementsByClassName('TableTd'))
                        removeElem.map((item) => {
                            item.remove()
                        })
                        //在添加
                        if (groupIndexArr.length > 0) {
                            groupIndexArr.map((item, index) => {
                                _onAddTR(item, index + 1)
                            })
                        }
                    }
                }}
                rowSelection={currentRowSelection ? _rowSelection() : false}
                rowKey="key"
                pagination={{
                    showSizeChanger: true,
                    showQuickJumper: true,
                    defaultPageSize: defaultPageSize,
                }}
                // dateFormatter="string"
                headerTitle={headerTitle}
                toolBarRender={_renderToolBarRender}
                toolbar={{
                    search: use$Search ? {
                        placeholder: '请输入搜索内容',
                        onSearch: (value) => {
                            $search = value
                            set$Search($search)
                            actionRef?.current?.reloadAndRest()
                        },
                        onChange: (val) => {
                            set$Search(val.target.value)
                        }
                    } : null,
                }}
                onRow={(record, index) => {
                    return {
                        onClick: () => {
                            if (!getSelected()) {
                                !inLookup && _setTableSelect(index)
                                _historyPush(record, index)
                            }
                        }, // 点击行
                        onDoubleClick: () => { },
                        onContextMenu: () => { },
                        onMouseEnter: () => { }, // 鼠标移入行
                        onMouseLeave: () => { },
                    };
                }}
                columnsStateMap={columnsStateMap ? columnsStateMap : {}}
                onColumnsStateChange={(map, state) => _onColumnsStateChange(map, state)}
            />
        )
    }, [columnsStateMap, inView, currentSorterTarget, currentGroupTarget, $filter, $search, parent$Search, columns, currentSelectedRowsItem, exporting, currentRowSelection, initialState])

    return (
        <div ref={ref}>
            {_renderTable}
            {_modalForm}
        </div>
    );
};

SmartTable.propTypes = {};

SmartTable.defaultProps = {
    search: false,
    defaultPageSize: 10,
    isLoad: true,
};

export default SmartTable