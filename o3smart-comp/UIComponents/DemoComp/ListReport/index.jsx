/* eslint-disable react-hooks/rules-of-hooks */
import React, { useState, useRef } from 'react';
import { PageContainer } from '@ant-design/pro-layout';
import ProTable from '@ant-design/pro-table';
import { ProFormText } from '@ant-design/pro-components';
import { ModalForm } from '@ant-design/pro-form';
import { Form, Button } from 'antd';
import { history } from 'umi';
import Demo from '@/mockServe/mockData';
const { toolbarMenu } = Demo;

const ListReport = () => {
  const actionRef = useRef();
  const formRef = useRef();
  const editActionRef = useRef();
  const [form] = Form.useForm();

  const [modalVisible, setModalVisible] = useState(false);
  const [modalValues, setModalValues] = useState(null);
  const [modalTitle, setModalTitle] = useState(null);


  const [formModalVisible, setFormModalVisible] = useState(false);
  const [selectedRowsState, setSelectedRows] = useState([]);
  const [warehouse, setWarehouse] = useState({});
  const [barCode, setbarCode] = useState([]);
  const [invData, setinvData] = useState([]);
  const [buttonLoading, setButtonLoading] = useState(false);

  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [activeKey, setActiveKey] = useState('tab1');

  const currentColumns =[]
  Demo[activeKey].columns.map((item)=>{
    const { detail, actions }=item
    if (!detail){
      if (actions) {
        currentColumns.push({
          title: '操作',
          dataIndex: 'option',
          valueType: 'option',
          fixed: 'right',
          // width: 90,
          render: (_, record) => {
            const arr = []
            actions.map((item,index) => {
              const { text, params, navigator } = item
              arr.push(
                <a
                  key={`action${index}`}
                  onClick={async () => {
                    if (params){
                      setModalVisible(true)
                      setModalValues(params)
                      setModalTitle(text)
                    }
                    if (navigator) {
                      navigator()
                    }
                  }}
                >
                  {text}
                </a>
              )
            })
            return arr
          },
        })
      } else {
        currentColumns.push(item)
      }
    }
  })

  //自定义按钮
  const toolbarBtns = []
  if (Demo[activeKey].listReportBtns){
    Demo[activeKey].listReportBtns.map((item, index) => {
      const { key, text, params, navigator } = item
      toolbarBtns.push(
        <Button
          type="primary"
          key={`custbtn-${index}`}
          loading={buttonLoading}
          onClick={async () => {
            if (params){
              setModalVisible(true)
              setModalValues(params)
              setModalTitle(text)
            }
            if (navigator){
              navigator()
            }
          }}
        >
          {text}
        </Button>
      )
    })
  }

  const _menuItems = () => {
    const menuItems = [];
    toolbarMenu.map((item) => {
      const { key, text } = item;
      menuItems.push({
        key: key,
        label: (
          <span
            onClick={() => {
              setActiveKey(key);
              actionRef?.current?.reloadAndRest();
            }}
          >
            {text}
          </span>
        ),
      });
    });
    return menuItems;
  };

  return (
    <PageContainer>
      <ProTable
        actionRef={actionRef}
        search={{
          labelWidth: 'auto',
        }}
        pagination={{
          showSizeChanger: true,
          defaultPageSize: 10,
        }}
        debounceTime={50}
        editable={{
          type: 'multiple',
        }}
        scroll={{ x: 'max-content' }}
        toolbar={{
          menu: {
            type: 'tab',
            activeKey: activeKey,
            items: _menuItems(),
          },
        }}
        toolBarRender={() => toolbarBtns}
        request={async (params, sorter, filter) => {
          setinvData(params);
          Demo[activeKey].recordList.map((item, index) => {
              item.key = `${activeKey}-${index}-key`;
              item.index = `${activeKey}-${index}-index`;
          });
          const obj = {
            data: Demo[activeKey].recordList,
            pageSize: params.pageSize,
            current: params.current,
          };
          console.log({ obj });
          return obj;
        }}
        columns={currentColumns}
        rowSelection={{
            onChange: (_, selectedRowsItem) => {
              console.log(selectedRowsItem)
            },
          }}
        onRow={(record, index) => {
          return {
            onClick: () => {
              if (Demo[activeKey].navigations){
                history.push({
                  pathname: 'ObjectPage',
                  query: {
                    activeKey,
                    activeIndex: index,
                    title: record[Demo[activeKey].titleKey],
                    subTitle: record[Demo[activeKey].subTitleKey],
                  },
                });
              }
            }, // 点击行
            onDoubleClick: () => {},
            onContextMenu: () => {},
            onMouseEnter: () => {}, // 鼠标移入行
            onMouseLeave: () => {},
          };
        }}
      />
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
            const { label, placeholder,name } = item
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
