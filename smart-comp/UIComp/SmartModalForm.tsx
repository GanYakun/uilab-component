/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2023-11-28 14:12:49
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-11-28 15:24:11
 * @FilePath: /Uilab-Application/lib/Uilab-Comp/smart-comp/UIComp/SmartModalForm.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { ModalForm } from '@ant-design/pro-components';
import { Button, Form } from 'antd';
import React, { useState } from 'react';
import SmartField from './SmartField';

export default ({ entitySet, content, onSubmit, fields }) => {
    const { title, btnText } = content;
    const [form] = Form.useForm<{ name: string; company: string }>();
    return (
        <ModalForm<{
            name: string;
            company: string;
        }>
            width={'600px'}
            layout='vertical'
            title={title}
            trigger={
                <Button type="primary">
                    {btnText}
                </Button>
            }
            form={form}
            autoFocusFirstInput
            modalProps={{
                destroyOnClose: true,
                onCancel: () => {
                    console.log('onCancel')
                },
            }}
            submitTimeout={1000}
            onFinish={async (values) => {
                //console.log({ values, form })
                onSubmit(values);
                form?.resetFields();
                return true
            }}
        >
            {
                fields && fields.map((item, index) => {
                    const option = {
                        key: `${item.Value}-${index}`,
                        entitySet,
                        path: item.Value,
                    }
                    return <SmartField {...option} />
                })
            }
        </ModalForm>
    );
};