/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2022-09-20 10:33:25
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-02-01 11:37:45
 * @FilePath: /uilab-gbms/lib/o3smart-comp/UIComponents/AntDesignPro/SmartTable.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { useEffect, useState, useMemo, useRef } from 'react';
import { Button, Popover, List, Space, Table, Input, message, Form } from 'antd';
import lodash from 'lodash'
import { getAppVariantConfig, saveVariantConfig } from '../../../services/index'
import { CaretDownOutlined } from '@ant-design/icons';
import { useModel } from 'umi'
import {
    ModalForm,
    ProForm,
    ProFormText,
    ProFormCheckbox
} from '@ant-design/pro-components';

const ViewVaraint = (props) => {
    const {
        appId
    } = props

    //设置视图变体配置文件
    const [variantOpen, setVariantOpen] = useState(false);
    const _handleOpenChange = (newOpen) => {
        setVariantOpen(newOpen);
    };
    const [messageApi, contextHolder] = message.useMessage();

    const { initialState, setInitialState } = useModel('@@initialState');
    const { variantConfig } = initialState ? initialState : {}
    let [currentChanges, setCurrentChanges] = useState([])
    //添加视图
    const [addViewModalVisit, setAddViewModalVisit] = useState(false)
    const addModelFormRef = useRef()
    //管理视图
    const [manageViewModalVisit, setManageViewModalVisit] = useState(false)
    const manageModelFormRef = useRef()
    let [manageModelData, setManageModelData] = useState([])
    const [manageModelTableKey, setManageModelTableKey] = useState(null)
    const [selectedRowKeys, setSelectedRowKeys] = useState(['variant_default'])
    const [manageChange, setManageChange] = useState({
        defaultView: false,//是否修改了缺省视图
    })

    //监听视图变化并暂存
    const _onVarientChange = (params) => {
        //console.log({ currentChanges, params })
        currentChanges.push(...params)
        setCurrentChanges(lodash.cloneDeep(currentChanges))
    }

    useEffect(() => {
        setInitialState({
            ...initialState,
            onVarientChange: (params) => _onVarientChange(params)
        })
    }, [])

    //保存视图
    const _onVarientSave = async () => {
        const { defaultVariantIndex, value } = variantConfig
        const timestamp = lodash.now()
        let num = 100
        //缺失 packageName selector support texts
        const {
            layer,
            namespace,
            originalLanguage,
            projectId,
            reference,
            fileName: variantReference
        } = value[defaultVariantIndex]

        const arr = []
        for (let item of currentChanges) {
            num++
            const { changeType, content, selectorType } = item
            const fileName = `id_${timestamp}_${num}_${changeType}`
            arr.push({
                changeType,
                content,
                dependentSelector: {},
                fileType: "change",
                packageName: '$TMP',
                selector: { "id": `${appId}::${selectorType}`, "idIsLocal": false },
                fileName,
                layer,
                namespace,
                originalLanguage,
                projectId,
                reference,
                variantReference
            })
        }

        const result = await saveVariantConfig(arr)
        if (result) {
            currentChanges = []
            setCurrentChanges(currentChanges)
            setVariantOpen(false)
            _getVariantConfig('currentIndex')
        }
    }

    //另存为另一个视图
    const _onVarientAddView = async (params) => {
        const { defaultVariantIndex, value } = variantConfig
        const { viewName, viewChecked } = params
        //视图名字查重复
        if (value && value.findIndex((item) => item.displayViewName === viewName) !== -1) {
            setAddViewModalVisit(false)

            messageApi.open({
                type: 'error',
                content: `视图名称:${viewName} 已存在,请修改视图名称！`,
            });
            return
        }

        const timestamp = lodash.now()
        let num = 100
        const viewFileName = `id_${timestamp}_${num}_flVariant`

        //当前视图
        const viewJson = {
            reference: `${appId}.Component`,
            content: {},
            contexts: {},
            executeOnSelection: false,
            favorite: true,
            fileName: viewFileName,
            fileType: "ctrl_variant",
            layer: "USER",
            namespace: `apps/${appId}/variants/`,
            originalLanguage: "ZH",
            projectId: appId,
            standardVariant: false,
            support: { generator: "FlexObjectFactory.createFlVariant", sapui5Version: "1.109.0" },
            texts: { variantName: { value: viewName, type: "XFLD" } },
            variantManagementReference: `${appId}::InvoicesList--fe::PageVariantManagement`,
            variantReference: `${appId}::InvoicesList--fe::PageVariantManagement`
        }

        const arr = []
        arr.push(viewJson)

        //是否设置默认显示
        if (viewChecked && viewChecked.findIndex((item) => item === 'default') !== -1) {
            num++
            const setDefaultJson = {
                changeType: "setDefault",
                content: { defaultVariant: viewFileName },
                dependentSelector: {},
                fileName: `id_${timestamp}_${num}_setDefault`,
                fileType: "ctrl_variant_management_change",
                layer: "USER",
                namespace: `apps/${appId}/changes/`,
                originalLanguage: "ZH",
                packageName: "$TMP",
                projectId: appId,
                reference: `${appId}.Component`,
                selector: { id: `${appId}::InvoicesList--fe::PageVariantManagement`, idIsLocal: false },
                support: { sapui5Version: "1.109.0" },
                texts: {}
            }
            arr.push(setDefaultJson)
        }

        //如果不是标准视图的另存为，需要携带当前视图的历史change
        if (defaultVariantIndex !== 0) {
            const { children } = value[defaultVariantIndex]
            children.map((item, index) => {
                num++
                const { changeType } = item
                if (changeType !== 'setTitle') {
                    const fileName = `id_${timestamp}_${num}_${changeType}`
                    arr.push({ ...item, fileName, variantReference: viewFileName })
                }
            })
        }

        //添加change
        if (currentChanges.length > 0) {
            const { layer, originalLanguage, projectId, reference } = viewJson
            currentChanges.map((item, index) => {
                num++
                const { changeType, content, selectorType } = item
                const namespace = `apps/${appId}/changes/`
                const fileName = `id_${timestamp}_${num}_${changeType}`
                arr.push({
                    changeType,
                    content,
                    dependentSelector: {},
                    fileType: "change",
                    packageName: '$TMP',
                    selector: { "id": `${appId}::${selectorType}`, "idIsLocal": false },
                    fileName,
                    layer,
                    namespace,
                    originalLanguage,
                    projectId,
                    reference,
                    variantReference: viewFileName
                })
            })
        }

        const result = await saveVariantConfig(arr)
        if (result) {
            currentChanges = []
            setCurrentChanges(currentChanges)
            setAddViewModalVisit(false)
            _getVariantConfig('lastIndex')
        }

        addModelFormRef.current.resetFields();
        return true
    }

    //获取当前视图的配置文件
    const _getVariantConfig = async (refreshTye = '') => {
        const result = await getAppVariantConfig({ id: appId })
        if (result) {
            //console.log({ _getVariantConfigrResult: result })
            const { changes } = result
            let contentData = [{
                displayViewName: '标准',
                children: []
            }]

            //1.视图列表
            changes.map((item) => {
                const { reference, fileType } = item
                if (reference && fileType === 'ctrl_variant') {
                    item.children = []
                    contentData.push(item)
                }
            })

            //2.视图的项内容
            for (let a of contentData) {
                const { fileName, children } = a
                for (let b of changes) {
                    const { variantReference, fileType, selector, changeType, content } = b
                    //添加到对应视图分组内
                    if (fileName && (fileName === variantReference || (selector && fileName === selector.id))) {
                        children.push(b)
                    }
                    //隐藏掉对应的分组
                    if (fileType === 'ctrl_variant_change' && selector.id === fileName && !content.visible && changeType === 'setVisible') {
                        a.hidden = true
                    }
                }
            }
            contentData = contentData.filter((item) => !item.hidden)

            //3.设置默认视图
            let defaultVariantIndex = 0
            const idx = lodash.findLastIndex(changes, (item) => {
                const { fileType, changeType } = item
                return fileType === 'ctrl_variant_management_change' && changeType === 'setDefault'
            })

            if (idx !== -1) {
                contentData.map((item, index) => {
                    const { fileName } = item
                    if (changes.length > 0 && changes[idx].content.defaultVariant === fileName) {
                        defaultVariantIndex = index
                        setSelectedRowKeys([fileName])
                    }
                })
                if (defaultVariantIndex === 0) {
                    setSelectedRowKeys(['variant_default'])
                }
            }

            //4.设置展示视图名称
            contentData.map((item, index) => {
                if (index !== 0) {
                    const { fileName, texts, children } = item
                    const idx = lodash.findLastIndex(children, (item) => {
                        const { fileType, changeType } = item
                        return fileType === 'ctrl_variant_change' && changeType === 'setTitle'
                    })
                    if (idx !== -1) {
                        item.displayViewName = children[idx].content.title
                    } else {
                        item.displayViewName = texts.variantName.value
                    }
                }
            })

            // console.log({
            //     changes,
            //     value: contentData,
            //     defaultVariantIndex,
            // })

            //5.设置当前查看项
            let currentIndex = defaultVariantIndex
            if (variantConfig && refreshTye === 'currentIndex') {
                currentIndex = variantConfig.defaultVariantIndex
            }
            if (refreshTye === 'lastIndex') {
                currentIndex = contentData.length - 1
            }

            setInitialState(lodash.cloneDeep({
                ...initialState,
                variantConfig: {
                    changes,
                    value: contentData,
                    defaultVariantIndex: currentIndex,
                },
                onVarientChange: (params) => _onVarientChange(params)
            }))
        }
    }

    //监听视图变更 查询
    useEffect(() => {
        if (!variantConfig) {
            _getVariantConfig()
        }
    }, [variantConfig])

    //渲染视图
    const _renderVariant = () => {
        let { value: contentData, defaultVariantIndex } = variantConfig
        const text = <span className='variantPopover-title'>我的视图（限制数量10）</span>;
        const content = (
            <div className='variantPopover-container'>
                <div className='content'>
                    <List
                        size="small"
                        dataSource={contentData}
                        renderItem={(item, index) => {
                            const { displayViewName } = item;
                            return (
                                <List.Item
                                    className={defaultVariantIndex === index ? 'active' : ''}
                                    onClick={() => {
                                        currentChanges = []
                                        setCurrentChanges(currentChanges)
                                        setVariantOpen(false)
                                        setInitialState({
                                            ...initialState,
                                            variantConfig: {
                                                ...variantConfig,
                                                defaultVariantIndex: index
                                            },
                                            onVarientChange: (params) => _onVarientChange(params)
                                        })
                                    }}
                                >
                                    {displayViewName}
                                </List.Item>
                            )
                        }}
                    />
                </div>
                <div className='footer'>
                    {
                        currentChanges.length > 0 && defaultVariantIndex !== 0 &&
                        <Button
                            type="primary"
                            size='small'
                            onClick={_onVarientSave}
                        >
                            保存
                        </Button>
                    }
                    {
                        contentData.length < 10 && <Button
                            type={currentChanges.length > 0 && defaultVariantIndex !== 0 ? 'link' : 'primary'}
                            size='small'
                            onClick={() => {
                                setVariantOpen(false)
                                setAddViewModalVisit(true)
                            }}
                        >
                            另存为
                        </Button>
                    }
                    <Button
                        type="link"
                        size='small'
                        onClick={() => {
                            const { value } = variantConfig
                            //设置视图管理数据
                            const manageModelDataArr = []
                            value.map((item, index) => {
                                const { fileName, displayViewName } = item
                                if (index === 0) {
                                    manageModelDataArr.push({
                                        init: true,
                                        key: `variant_default`,
                                        viewName: '标准',
                                        createBy: 'Uilab'
                                    })
                                } else {
                                    manageModelDataArr.push({
                                        key: fileName,
                                        viewName: displayViewName,
                                    })
                                }
                            })
                            setManageModelTableKey(`${new Date().getTime()}-tableKey`)
                            setManageModelData(lodash.cloneDeep(manageModelDataArr))
                            setVariantOpen(false)
                            setManageViewModalVisit(true)
                        }}
                    >
                        管理
                    </Button>
                </div>
            </div >
        );

        return (
            <div className='variant'>
                <Popover
                    placement="bottomLeft"
                    title={text}
                    content={content}
                    trigger="click"
                    open={variantOpen}
                    onOpenChange={_handleOpenChange}
                >
                    <Button type='link' icon={<CaretDownOutlined />} size='large'>
                        {defaultVariantIndex === 0 ? '标准' : contentData[defaultVariantIndex].displayViewName} {currentChanges.length > 0 ? '*' : ''}
                    </Button>
                </Popover>
            </div>
        )
    }

    //渲染另存为视图
    const _addViewModal = useMemo(() => {
        return (
            <ModalForm
                formRef={addModelFormRef}
                width={300}
                title="保存视图"
                open={addViewModalVisit}
                onFinish={async (params) => {
                    return _onVarientAddView(params)
                }}
                onOpenChange={setAddViewModalVisit}
            >
                <ProForm.Group>
                    <ProFormText
                        width="md"
                        name="viewName"
                        label="视图名称："
                        placeholder="请输入名称（限制字数20）"
                        rules={[{ required: true, message: '当前字段必填' }]}
                        fieldProps={{
                            maxLength: 20
                        }}
                    />
                </ProForm.Group>
                <ProForm.Group>
                    <ProFormCheckbox.Group
                        name="viewChecked"
                        options={[
                            {
                                label: '设置为缺省值', value: 'default'
                            },
                            {
                                label: '自动应用', value: 'auto'
                            }
                        ]}
                    />
                </ProForm.Group>
            </ModalForm>
        )
    }, [addViewModalVisit])

    //管理视图 保存
    const _onManageViewSave = async () => {
        const timestamp = lodash.now()
        let num = 100
        let arr = [], setDefaultJson
        const { value } = variantConfig

        //1.保存默认视图
        const { defaultView } = manageChange
        if (defaultView) {
            num++
            const defaultVariant = selectedRowKeys[0] === 'variant_default' ? `${appId}::InvoicesList--fe::PageVariantManagement` : selectedRowKeys[0]
            setDefaultJson = {
                changeType: "setDefault",
                content: { defaultVariant },
                dependentSelector: {},
                fileName: `id_${timestamp}_${num}_setDefault`,
                fileType: "ctrl_variant_management_change",
                layer: "USER",
                namespace: `apps/${appId}/changes/`,
                originalLanguage: "ZH",
                packageName: "$TMP",
                projectId: appId,
                reference: `${appId}.Component`,
                selector: { id: `${appId}::InvoicesList--fe::PageVariantManagement`, idIsLocal: false },
                support: { sapui5Version: "1.109.0" },
                texts: {}
            }
        }
        if (setDefaultJson) {
            arr.push(setDefaultJson)
        }

        //2.删除视图
        if (value) {
            value.map((item, index) => {
                if (index !== 0) {
                    const { fileName } = item
                    const idx = manageModelData.findIndex((d) => d.key === fileName)
                    if (idx === -1) {
                        num++
                        const deleteJson = {
                            changeType: "setVisible",
                            content: { visible: false, createdByReset: false },
                            dependentSelector: {},
                            fileName: `id_${timestamp}_${num}_setVisible`,
                            fileType: "ctrl_variant_change",
                            layer: "USER",
                            namespace: `apps/${appId}/changes/`,
                            originalLanguage: "ZH",
                            packageName: "$TMP",
                            projectId: appId,
                            reference: `${appId}.Component`,
                            selector: { id: fileName, idIsLocal: false },
                            support: { sapui5Version: "1.109.0" },
                            texts: {}
                        }
                        arr.push(deleteJson)
                    }
                }
            })
        }

        //3.修改view title
        if (value) {
            manageModelData.map((item, index) => {
                if (index !== 0) {
                    const { key, viewName } = item
                    const idx = value.findIndex((d) => d.displayViewName === viewName)
                    if (idx === -1) {
                        num++
                        const setTitleJson = {
                            changeType: "setTitle",
                            content: { title: viewName },
                            dependentSelector: {},
                            fileName: `id_${timestamp}_${num}_setTitle`,
                            fileType: "ctrl_variant_change",
                            layer: "USER",
                            namespace: `apps/${appId}/changes/`,
                            originalLanguage: "ZH",
                            packageName: "$TMP",
                            projectId: appId,
                            reference: `${appId}.Component`,
                            selector: { id: key, idIsLocal: false },
                            support: { sapui5Version: "1.109.0" },
                            texts: { title: { value: viewName, type: "XFLD" } },
                        }
                        arr.push(setTitleJson)
                    }
                }
            })
        }

        if (arr.length > 0) {
            const result = await saveVariantConfig(arr)
            if (result) {
                _getVariantConfig()
            }
        }

        setManageViewModalVisit(false)
    }

    //渲染管理视图
    const _manageViewModal = useMemo(() => {
        const columns = [
            {
                title: '视图名称',
                dataIndex: 'viewName',
                render: (_, record) => {
                    let { init, viewName, key, changing } = record
                    let status, errorMessge
                    if (viewName === '') {
                        status = 'error'
                        errorMessge = '必填'
                    } else if (manageModelData.findIndex((item) => item.viewName === viewName && item.key !== key) !== -1 && changing) {
                        status = 'error'
                        errorMessge = '不可重复'
                    }

                    //设置错误
                    const idx = manageModelData.findIndex((item) => item.key === key)
                    manageModelData[idx] = {
                        ...manageModelData[idx],
                        status,
                        errorMessge
                    }

                    return (
                        !init ?
                            <div key={key}>
                                <Input
                                    placeholder='请输入视图名称'
                                    defaultValue={viewName}
                                    rules={[{ required: true, message: '当前字段必填' }]}
                                    onChange={(e) => {
                                        const text = e.target.value
                                        manageModelData.map((item) => {
                                            if (item.key === key) {
                                                item.viewName = text
                                                item.changing = true
                                            } else {
                                                item.changing = false
                                            }
                                        })
                                        setManageModelData(lodash.cloneDeep(manageModelData))
                                    }}
                                    status={status}
                                    maxLength={20}
                                />
                                {status && <span style={{ fontSize: 10, color: 'red' }}>{errorMessge}</span>}
                            </div>
                            : viewName
                    )
                },
            },
            {
                title: '创建者',
                dataIndex: 'createBy',
            },
            {
                title: '操作',
                render: (_, record) => {
                    const { init, key } = record
                    return (
                        !init && <Space key={123} size="middle">
                            <a onClick={() => {
                                manageModelData = manageModelData.filter((item) => item.key !== key)
                                setManageModelData(lodash.cloneDeep(manageModelData))
                            }}>
                                删除
                            </a>
                        </Space>
                    )
                },
            },
        ];

        const rowSelection = {
            onChange: (selectedRowKeys, selectedRows) => {
                //console.log(`selectedRowKeys: ${selectedRowKeys}`, 'selectedRows: ', selectedRows);
                setManageChange(lodash.cloneDeep({
                    ...manageChange,
                    defaultView: true
                }))
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
                formRef={manageModelFormRef}
                width={700}
                title="管理视图"
                open={manageViewModalVisit}
                onFinish={async () => {
                    //检查视图项是否存在错误
                    const idx = manageModelData.findIndex((item) => item.status === 'error')
                    if (idx !== -1) {
                        return false
                    } else {
                        return _onManageViewSave()
                    }
                }}
                onOpenChange={setManageViewModalVisit}
            >
                <Table
                    key={manageModelTableKey}
                    columns={columns}
                    dataSource={manageModelData}
                    rowSelection={{
                        type: 'radio',
                        ...rowSelection,
                        selectedRowKeys: selectedRowKeys
                    }}
                    pagination={false}
                />
            </ModalForm>
        )
    }, [manageViewModalVisit, variantConfig, manageModelData, selectedRowKeys])

    return (
        <div>
            {_addViewModal}
            {variantConfig && _manageViewModal}
            {variantConfig && _renderVariant()}
            {contextHolder}
        </div>
    )
};

ViewVaraint.propTypes = {
};

ViewVaraint.defaultProps = {

};

export default ViewVaraint;