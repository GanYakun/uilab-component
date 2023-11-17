/*
 * @Author: lx.jin
 * @Date: 2021-11-04 12:25:51
 * @LastEditTime: 2023-10-09 15:25:52
 * @LastEditors: lx.jin 308561217@qq.com
 * @Description: 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 * @FilePath: /BANFF/pms3.0-banff/src/components/Smart/SmartModalForm/smartModalForm.js
 */
import { useRef, useMemo, useState, useEffect } from 'react';
import { ModalForm } from '@ant-design/pro-form';
import { EditableProTable, ProFormSelect } from '@ant-design/pro-components';
import { UploadOutlined } from '@ant-design/icons';
import { Button, message, Upload } from 'antd';
import { getConfig } from '../../Anotations/SmartModalForm';
import { SmartField } from '../config';
import { history as umiHistory, useIntl, useModel } from 'umi';

const SmartModalForm = (props) => {
  const {
    record,
    actionName,
    actionPath,
    boundActionData,
    mediaUploadLink,
    mediaUploadKey,
    actionCollection,
    visible,
    onCancel,
    entitySet,
    onFinish,
    title: parentTitle,
    params: parentParams,
    isQuickCreateAction,
    isQuickCreateActionType
  } = props;
  let {
    actionData,
    complexTypeData,
    annoRequest,
    SideEffects,
    approverDataRequest
  } = getConfig({ actionName, entitySet, record })
  const { isBound, parameter } = actionData
  const modelFormRef = useRef()
  const [editableKeys, setEditableRowKeys] = useState();
  const [dataSource, setDataSource] = useState([]);
  const [isRefresh, setIsRefresh] = useState(false)
  const [approverData, setApproverData] = useState(null)
  const paramsArr = []

  let { initialState, setInitialState } = useModel('@@initialState');

  //editTable
  const _renderEditTable = (complexTypeName) => {
    const columns = [], createObj = {};
    for (let item of complexTypeData) {
      const { name, property } = item
      if (name === complexTypeName) {
        for (let b of property) {
          const { name: propertyName } = b
          columns.push({
            title: propertyName,
            dataIndex: propertyName,
            width: 'auto',
            renderFormItem: (_, record) => {
              const option = {
                record,
                entitySet,
                path: propertyName,
                inCell: true,
                inCellName: record.recordKey + '_' + propertyName,
                onBlur: (value, entitySet, PrimaryKeys) => {
                  record[propertyName] = value
                  dataSource.map((item, index) => {
                    const { id } = item
                    if (id === record.record.id) {
                      dataSource[index][propertyName] = value
                    }
                  })
                  console.log({ value, record, dataSource })
                  setDataSource(dataSource)
                }
              }
              return <SmartField {...option} />
            },
          })
          createObj.id = Date.now()
          createObj[propertyName] = null
        }
      }
    }
    //console.log({ createObj })

    return (
      <EditableProTable
        rowKey="id"
        toolBarRender={false}
        value={dataSource}
        onChange={setDataSource}
        columns={columns}
        recordCreatorProps={{
          newRecordType: 'dataSource',
          position: 'top',
          record: () => createObj
        }}
        editable={{
          type: 'multiple',
          editableKeys,
          onChange: setEditableRowKeys,
          actionRender: (row, _, dom) => {
            return [dom.delete];
          },
        }} />
    )
  }

  //无参数情况
  const _emptyRender = () => {
    return (
      <div>请确定无误后，执行操作！</div>
    )
  }

  //显示字段
  const content = useMemo(() => {
    const result = []

    //1.是否传递form的字段参数
    if (parentParams) {
      if (parentParams.length > 0) {
        for (let path of parentParams) {
          const option = {
            entitySet: entitySet,
            path,
            isAvailable: true,
            formRef: modelFormRef,
            record
          }
          result.push(<SmartField {...option} key={`add-${path}`} />)
        }
      } else {
        return _emptyRender()
      }
    } else if (parameter) {
      isBound === 'true' && parameter && parameter.shift()//过滤掉第一个参数
      if (parameter.length > 0) {
        for (let a of parameter) {
          const { name, nullable, type } = a

          //是否为Collection 一个参数需要同时添加多个子对象
          if (type === 'Collection(com.dpbird.InvoiceItemQuickCreate)') {
            const elem = _renderEditTable(name)
            result.push(elem)
          } else {
            const option = {
              entitySet: entitySet,
              path: name,
              pathType: type,
              actionName,
              nullable,
              formRef: modelFormRef,
              formRefresh: () => {
                setIsRefresh(!isRefresh)
              }
            }
            paramsArr.push({ name, type })
            result.push(<SmartField {...option} key={name} />)
          }
        }
      } else {
        return _emptyRender()
      }
    } else {
      return _emptyRender()
    }

    //console.log({ result, parameter, parentParams,actionName })
    return result
  }, [parameter, parentParams, isRefresh])

  //title
  const title = useMemo(() => {
    let result = parentTitle ? parentTitle : null
    if (actionName && actionName.search('NewAction') !== -1) {
      result = '创建'
    }
    return result
  }, [parentTitle])

  //mediaUploadLink content
  const mediaUploadLinkContent = () => {
    const { protocol, host } = window.location
    let actionUrl = `${protocol}//${host}${mediaUploadLink}`
    actionUrl = actionUrl.replace(/#/g, "&")
    actionUrl = actionUrl.replace(/{{}}/g, mediaUploadKey)
    const props = {
      name: 'file',
      action: actionUrl,
      headers: {
        //authorization: 'authorization-text',
      },
      data: {},
      maxCount: 1,
      // listType: 'picture',
      // accept: 'image/*',
      onChange: (info, { ...other }) => {
        if (info.file.status !== 'uploading') {
          //console.log(info.file, info.fileList);
        }
        if (info.file.status === 'done') {
          console.log({ info, other })
          message.success(`${info.file.name} 上传成功！`);
          onFinish();
        } else if (info.file.status === 'error') {
          message.error(`${info.file.name} 上传失败！`);
        }
      },
    };

    return (
      <Upload {...props}>
        <Button icon={<UploadOutlined />}>点击上传附件</Button>
      </Upload>
    )
  }

  //查询审批数据
  const _fetchApproverData = async () => {
    const result = await approverDataRequest(actionName, record)
    if (result) {
      setApproverData(result)
    }
  }

  //请求审批数据
  useEffect(() => {
    if (!approverData && actionName === 'com.dpbird.SubmitApproval') {
      _fetchApproverData()
    }
  }, [actionName, approverData])

  //mediaUploadLink content
  const approverContent = () => {
    return approverData && approverData.length > 0 ? approverData.map((item) => {
      const { nodeName, nodeId, selectList } = item
      const valueEnum = JSON.parse(selectList)
      return (
        <ProFormSelect
          key={nodeId}
          labelCol={{ span: 4 }}
          label={nodeName}
          name={nodeId}
          placeholder='请选择'
          rules={[
            {
              required: true,
            },
          ]}
          valueEnum={valueEnum}
        />
      )
    }) : _emptyRender()
  }

  const _renderModal = () => {
    if (mediaUploadLink) {
      //上传类型
      return (
        <ModalForm
          key={Math.random()}
          formRef={modelFormRef}
          labelCol={{ span: 6 }}
          wrapperCol={{ span: 18 }}
          title='上传附件'
          width={'600px'}
          open={visible}
          submitter={false}
          modalProps={{
            onCancel: () => onCancel(),
          }}
        >
          {mediaUploadLinkContent()}
        </ModalForm>
      )
    } else if (actionName === 'com.dpbird.SubmitApproval') {
      //审批类型
      return (
        approverData && <ModalForm
          key={Math.random()}
          formRef={modelFormRef}
          labelCol={{ span: 6 }}
          wrapperCol={{ span: 18 }}
          title='提交审批'
          width={'600px'}
          open={visible}
          modalProps={{
            onCancel: () => {
              setApproverData(null)
              onCancel()
            },
          }}
          onFinish={async (value = {}) => {
            const arr = []
            for (let key of Object.keys(value)) {
              arr.push({ nodeId: key, partyId: value[key] })
            }
            const result = await annoRequest(actionPath, { approverData: JSON.stringify(arr) })
            if (result) {
              const { headers, data } = result
              modelFormRef.current.resetFields();
              onFinish(data);
            }
          }}
        >
          {approverContent()}
        </ModalForm>
      )
    } else if (actionName === 'com.dpbird.ViewApproval') {
      //查看当前审批节点
      return (
        <ModalForm
          key={Math.random()}
          formRef={modelFormRef}
          labelCol={{ span: 6 }}
          wrapperCol={{ span: 18 }}
          title={title}
          width={'600px'}
          open={visible}
          modalProps={{
            onCancel: () => {
              setApproverData(null)
              onCancel()
            },
          }}
          onFinish={async (value = {}) => {
            const result = await annoRequest(actionPath, {})
            if (result) {
              const { processId, nodeId } = result?.data
              window.history.pushState(null, '', `/menu1/custom-workflow-manage/WorkFlow?processId=${processId}&nodeId=${nodeId}`)
            }
          }}
        >
          {_emptyRender()}
        </ModalForm>
      )
    } else {
      return (
        (visible ? <ModalForm
          formRef={modelFormRef}
          labelCol={{ span: 6 }}
          wrapperCol={{ span: 18 }}
          title={title}
          width={'600px'}
          open={visible}
          modalProps={{
            onCancel: () => onCancel(),
          }}
          onFinish={async (value = {}) => {
            //需要补字段的
            paramsArr.map((item) => {
              const { name, type } = item
              //为空的处理
              if (!value[name]) {
                if (type === 'Edm.String') {
                  value[name] = ''
                } else if (type === 'Edm.Boolean') {
                  value[name] = false
                } else if (type === 'Edm.Decimal') {
                  value[name] = value[name]
                } else {
                  value[name] = null
                }
              }
            })
            //console.log({ actionPath, value, boundActionData })
            const result = await annoRequest(actionPath, value, boundActionData, actionCollection, isQuickCreateAction, isQuickCreateActionType)
            if (result) {
              const { headers, data } = result

              //全局保存action 返回的SAP-ContextId
              if (headers && headers['SAP-ContextId']) {
                window['SAP-ContextId'] = headers['SAP-ContextId']
              }

              modelFormRef.current.resetFields();
              onFinish(data);

              //SideEffects 刷新
              if (initialState && initialState.actionRefObj && SideEffects.length > 0) {
                for (let key of Object.keys(initialState.actionRefObj)) {
                  for (let item of SideEffects) {
                    if (item.search(key) !== -1) {
                      //console.log({key})
                      initialState.actionRefObj[key]?.current?.reload()
                    }
                  }
                }
              }
            }
          }}
        >
          {content}
        </ModalForm> : null)
      )
    }
  }

  return _renderModal()
};

export default SmartModalForm;
