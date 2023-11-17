/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2022-09-26 11:23:21
 * @LastEditors: error: error: git config user.name & please set dead value or install git && error: git config user.email & please set dead value or install git & please set dead value or install git
 * @LastEditTime: 2023-08-01 17:00:27
 * @FilePath: /uilab-gbms/lib/o3smart-comp/UIComponents/AntDesignPro/SmartFilterBar.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { useEffect, useState, useMemo, useRef } from 'react';
import { QueryFilter, ModalForm } from '@ant-design/pro-components';
import { Input, Button, Table } from 'antd';
import { getConfig } from '../../Anotations/SmartFilterBar';
import { SmartField } from '../config';
import { debounce } from '../../../utils/util'
import { useIntl, useModel } from 'umi';
import { getObjectDiff } from '../../../utils/util'

const SmartFilterBar = (props) => {
    const {
        entitySet,
        onSearch,
        formRef,
        onReset,
        tabs
    } = props
    const {
        annoSelectionFields,
        collectionAavigationArr
    } = getConfig({ entitySet,tabs })

    const { initialState } = useModel('@@initialState');
    const { variantConfig, onVarientChange } = initialState ? initialState : {}

    //参数准备
    const [searchText, setSearchText] = useState(null)
    const [currentCols, setCurrentCols] = useState(null)
    const [currentCollapse, setCurrentCollapse] = useState(false)
    const [selectionFields, setSelectionFields] = useState([])
    const [sendRecord, setSendRecord] = useState(window.sendRecord)
    const { formatMessage } = useIntl();

    //调整过滤器
    const [filterModalVisit, setFilterModalVisit] = useState(false)
    const filterModelFormRef = useRef()
    let [filterModelData, setFilterModelData] = useState([])
    const [selectedRowKeys, setSelectedRowKeys] = useState([])

    //监听窗口变化 改变列数
    const resizeWindow = () => {
        let base = 58, cols = 4
        let screenWidth = document.body.offsetWidth - base
        if (screenWidth >= 1352) {
            cols = 4
        } else if (screenWidth >= 1062 && screenWidth < 1353) {
            cols = 3
        } else if (screenWidth >= 701 && screenWidth < 1063) {
            cols = 2
        } else if (screenWidth >= 513 && screenWidth < 701) {
            cols = 1
        } else {
            cols = 1
        }
        debounce(setCurrentCols(cols))
    }
    useEffect(() => {
        window.addEventListener('resize', resizeWindow)
        return () => {
            window.removeEventListener('resize', resizeWindow)
        }
    }, [])

    //当variantConfig配置变化时
    const _onVariantConfigChange = () => {

        //判断当前字段在Variant中显示
        const _getPathVariantShow = (path) => {
            let variantFilterArr = [], variantShow = '_NA_'
            const { defaultVariantIndex, value: variantValue } = variantConfig
            variantValue[defaultVariantIndex].children.map((item) => {
                const { content, changeType } = item
                const { name } = content
                if (name === path) {
                    if (changeType === 'addFilter' || changeType === 'removeFilter') {
                        variantFilterArr.push(item)
                    }
                }
            })

            //列相关设置
            if (variantFilterArr.length > 0) {
                const { changeType } = variantFilterArr[variantFilterArr.length - 1]
                //查找最后一个
                switch (changeType) {
                    case 'removeFilter':
                        variantShow = false
                        break;
                    case 'addFilter':
                        variantShow = true
                        break;
                    default:
                        break;
                }
            }

            return variantShow
        }

        const _selectionFields = [], _filterModelData = [], _selectedRowKeys = []
        annoSelectionFields.map((item) => {
            const { key, path } = item
            const inVariantShow = _getPathVariantShow(path)
            if (inVariantShow !== '_NA_') {
                item.show = inVariantShow
            }
            if (item.show) {
                _selectedRowKeys.push(key)
                _selectionFields.push(item)
            }
            _filterModelData.push(item)
        })
        setSelectedRowKeys(_selectedRowKeys)
        setSelectionFields(_selectionFields)
        setFilterModelData(_filterModelData)
    }

    //初始化 处理selectionFields 
    useEffect(() => {
        if (variantConfig) {
            _onVariantConfigChange()
        }
    }, [variantConfig])

    //保存过滤器调整内容
    const _onFilterModalSave = () => {
        //1.设置页面显示
        const _filterModelData = [], _selectionFields = []
        filterModelData.map((item) => {
            const { key } = item
            const show = selectedRowKeys.findIndex((d) => d === key) !== -1
            _filterModelData.push({ ...item, show })
            if (show) {
                _selectionFields.push({ ...item, show })
            }
        })

        //2.判断修改的内容  并添加到change
        let object1 = {}, object2 = {}
        for (let a of _filterModelData) {
            const { path, show } = a
            object1[path] = show
        }
        for (let b of filterModelData) {
            const { path, show } = b
            object2[path] = show
        }
        const difference = getObjectDiff(object1, object2)
        const changes = []
        if (difference && difference.length > 0) {
            for (let name of difference) {
                const changeType = object1[name] ? "addFilter" : 'removeFilter'
                changes.push({
                    changeType,
                    content: { name },
                    selectorType: `InvoicesList--fe::FilterBar::Invoices`
                })
            }
        }
        onVarientChange && onVarientChange(changes)

        setCurrentCollapse(false)
        setFilterModelData(_filterModelData)
        setSelectionFields(_selectionFields)
        setFilterModalVisit(false)
    }

    //调整过滤器modal
    const _filterViewModal = useMemo(() => {
        const columns = [
            {
                title: '字段',
                dataIndex: 'path',
                render: (_, record) => {
                    const { label } = record
                    return label.search('@i18n>') === -1 ? label : formatMessage({ id: label })
                }
            },
        ];

        const rowSelection = {
            onChange: (selectedRowKeys, selectedRows) => {
                setSelectedRowKeys(selectedRowKeys)
            },
            getCheckboxProps: (record) => ({
                disabled: record.name === 'Disabled User',
                // Column configuration not to be checked
                name: record.name,
            }),
        };

        return (
            <ModalForm
                formRef={filterModelFormRef}
                width={600}
                title="调整过滤器"
                open={filterModalVisit}
                onFinish={async (params) => {
                    _onFilterModalSave()
                }}
                onOpenChange={setFilterModalVisit}
            >
                <Table
                    dataSource={filterModelData}
                    columns={columns}
                    pagination={false}
                    size='small'
                    scroll={{ y: 600 }}
                    rowSelection={{
                        type: 'check-box',
                        ...rowSelection,
                        selectedRowKeys: selectedRowKeys
                    }}
                />
            </ModalForm>
        )
    }, [filterModalVisit, filterModelData, selectedRowKeys])

    //渲染FilterBar
    const _renderQueryFilter = useMemo(() => {
        let arr = []
        selectionFields.map((item, index) => {
            const { path, show, key } = item
            if (show) {
                const display = index + 1 <= currentCols || !currentCollapse ? '' : 'none'
                arr.push(<div key={key} style={{ display: display }}>
                    <SmartField
                        entitySet={entitySet}
                        path={path}
                        key={`filter-${key}`}
                        formRef={formRef}
                        isAvailable={true}
                        inFilterBar={true}
                        record={sendRecord}
                    />
                </div>)
            }
        })

        return (
            <QueryFilter
                formRef={formRef}
                defaultCollapsed
                collapsed={currentCollapse}
                split
                layout='vertical'
                onFinish={(parmas) => {
                    if (searchText) {
                        parmas['$search'] = searchText
                    }else{
                        parmas['$search'] = null
                    }
                    onSearch(parmas, collectionAavigationArr)
                }}
                onCollapse={(parmas) => {
                    resizeWindow()
                    setCurrentCollapse(parmas)
                }}
                onReset={() => {
                    window.sendRecord = null
                    setSendRecord(null)
                    setSearchText(null);
                    onReset()
                }}
            >
                {arr}
            </QueryFilter>
        )
    }, [currentCollapse, currentCols, selectionFields, sendRecord, searchText])

    return (
        <div id='uilab-SmartFilterbar' style={{ background: '#fff', padding: '24px', marginBottom: 10, borderRadius: 2 }}>
            <div style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <Input.Search
                    placeholder="请输入搜索内容"
                    value={searchText}
                    onChange={(e) => {
                        const value = e.target.value
                        if (value === '') {
                            setSearchText(null);
                            onReset('search')
                        }else{
                            setSearchText(value);
                        }
                    }}
                    onSearch={(value) => {
                        onSearch({ $search: value, ...formRef.current.getFieldFormatValue() })
                    }}
                    style={{ minWidth: 200, width: '24%', marginBottom: 10 }}
                />
                <Button
                    type="link"
                    onClick={() => {
                        setFilterModalVisit(true)
                    }}
                >
                    调整过滤器
                </Button>
            </div>
            {annoSelectionFields.length > 0 && _renderQueryFilter}
            {_filterViewModal}
        </div>
    )
}


SmartFilterBar.propTypes = {};

SmartFilterBar.defaultProps = {};

export default SmartFilterBar;