/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2023-07-03 09:40:03
 * @LastEditors: error: error: git config user.name & please set dead value or install git && error: git config user.email & please set dead value or install git & please set dead value or install git
 * @LastEditTime: 2023-08-01 14:29:09
 * @FilePath: /uilab-gbms-branch-nbwms/apps/demo-inventory/src/pages/ObjectPage/index.jsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
/* eslint-disable react-hooks/rules-of-hooks */
import { ExportOutlined } from '@ant-design/icons';
import React, { useState, useRef, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-layout';
import { ProDescriptions, ProFormText } from '@ant-design/pro-components';
import ProTable, { EditableProTable } from '@ant-design/pro-table';
import { ModalForm } from '@ant-design/pro-form';
import { Button, Form, message, Spin, Input, Tooltip } from 'antd';
import { history as umiHistory, Prompt, useModel, useIntl } from 'umi';
import Demo from '@/mockServe/mockData';

const ListReport = (props) => {
  const { activeKey, activeIndex, title, subTitle } = props.location.query;
  let { columns: maincolumns, recordList: mainrecordList, navigations, editable, identification } = Demo[activeKey];
  maincolumns = maincolumns.filter((item) => item.title)
  const formRef = useRef();
  const editActionRef = useRef();
  const [form] = Form.useForm();
  const actionRef = useRef();

  const [modalVisible, setModalVisible] = useState(false);
  const [modalValues, setModalValues] = useState(null);
  const [modalTitle, setModalTitle] = useState(null);

  const [selectedRowsState, setSelectedRows] = useState([]);
  const [warehouse, setWarehouse] = useState({});
  const [barCode, setbarCode] = useState([]);
  const [invData, setinvData] = useState([]);
  const [buttonLoading, setButtonLoading] = useState(false);

  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  const _getObjectPageHeaderOptions = () => {
    //extra 头部按钮
    const extra = [];

    //是否可编辑
    if (editable) {
      extra.push(
        <Button
          key="isFullWindow"
          type="primary"
          onClick={() => {

          }}
        >
          编辑
        </Button>,
      );
    }

    //identification
    if (identification) {
      identification.map((item, index) => {
        const { key, text, params } = item
        extra.push(
          <Button
            key={`identification-${index}`}
            type="primary"
            onClick={() => {
              setModalVisible(true)
              setModalValues(params)
              setModalTitle(text)
            }}
          >
            {text}
          </Button>
        );
      })
    }

    return {
      header: {
        title: title,
        subTitle: subTitle,
        avatar: {
          src: 'https://gw.alipayobjects.com/zos/antfincdn/K%24NnlsB%26hz/pageHeader.svg',
          shape: 'square',
        },
        onBack: () => {
          umiHistory.goBack();
        },
        extra: extra,
        // footer: _headerTabs,
      },
      content: (
        <ProDescriptions
          actionRef={actionRef}
          // bordered
          formProps={{
            onValuesChange: (e, f) => console.log(f),
          }}
          request={async () => {
            return Promise.resolve({
              success: true,
              data: mainrecordList[activeIndex],
            });
          }}
          editable={{}}
          columns={maincolumns}
        />
      ),
    };
  };

  const _renderNavigation = () => {
    const result = [];
    navigations.map((item, index) => {
      const { title, type, data, btns } = item;

      if (type === 'ListItem') {
        const toolbarBtns = []

        //自定义按钮
        btns && btns.map((item, index) => {
          const { key, text, params } = item
          toolbarBtns.push(
            <Button
              type="link"
              key={`custbtn-${index}`}
              loading={buttonLoading}
              onClick={async () => {
                setModalVisible(true)
                setModalValues(params)
                setModalTitle(text)
              }}
            >
              {text}
            </Button>
          )
        })

        const { columns, recordList, editable } = data;
        if (editable) {
          toolbarBtns.push(
            <Button
              type="primary"
              key='btn1'
              loading={buttonLoading}
              onClick={async () => {
              }}
            >
              添加项
            </Button>,
            <Button
              key='btn1'
              loading={buttonLoading}
              onClick={async () => {
              }}
            >
              删除项
            </Button>
          )
        }

        //处理行内按钮
        const currentColumns = []
        columns.map((item) => {
          const { actions } = item
          if (actions) {
            currentColumns.push({
              title: '操作',
              dataIndex: 'option',
              valueType: 'option',
              fixed: 'right',
              render: (_, record) => {
                const arr = []
                actions.map((item) => {
                  const { text, params, rulsKey, rulsVlue } = item
                  if (!rulsKey || record[rulsKey] === rulsVlue) {
                    arr.push(
                      <a
                        key="config"
                        onClick={async () => {
                          setModalVisible(true)
                          setModalValues(params)
                          setModalTitle(text)
                        }}
                      >
                        {text}
                      </a>
                    )
                  }
                })
                return arr
              },
            })
          } else {
            currentColumns.push(item)
          }
        })

        result.push(
          <ProTable
            style={{ marginBottom: 24 }}
            key={`navigation-${index}`}
            headerTitle={title}
            search={false}
            pagination={{
              showSizeChanger: true,
              defaultPageSize: 10,
            }}
            debounceTime={50}
            editable={{
              type: 'multiple',
            }}
            scroll={{ x: 'max-content' }}
            request={async (params, sorter, filter) => {
              setinvData(params);
              recordList.map((item, index) => {
                item.key = `${activeKey}-${index}-key`;
                item.index = `${activeKey}-${index}-index`;
              });
              const obj = {
                data: recordList,
                pageSize: params.pageSize,
                current: params.current,
              };
              return obj;
            }}
            columns={currentColumns}
            rowSelection={{
              onChange: (_, selectedRowsItem) => {
                console.log(selectedRowsItem)
              }
            }}
            toolBarRender={() => toolbarBtns}
          />,
        );
      } else if (type === 'FieldGroup') {
        result.push(<div key={`navigation-${index}`}
          style={{ background: '#fff', padding: 12, marginBottom: 24 }}>
          <ProDescriptions
            column={3}
            title={title}
          >
            {
              data.columns.map((item, index) => {
                const { title, value } = item
                return <ProDescriptions.Item
                  key={`FieldGroupItem${index}`}
                  label={title}
                >
                  {value}
                </ProDescriptions.Item>
              })

            }
          </ProDescriptions>
        </div>)
      }
    });

    return result;
  };

  return (
    <PageContainer {..._getObjectPageHeaderOptions()}>
      {navigations && _renderNavigation()}
      <ModalForm
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 12 }}
        layout="horizontal"
        title={modalTitle}
        width="600px"
        visible={modalVisible}
        onVisibleChange={setModalVisible}
      >
        {
          modalValues && modalValues.map((item, index) => {
            const { label, placeholder, name } = item
            return (
              <ProFormText
                key={`field-${index}`}
                name={name}
                label={label}
                placeholder={placeholder}
              />
            )
          })
        }
      </ModalForm>
    </PageContainer>
  );
};

export default ListReport;
