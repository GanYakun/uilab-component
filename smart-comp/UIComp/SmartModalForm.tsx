/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2023-11-28 14:12:49
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-12-06 16:28:25
 * @FilePath: /Uilab-Application/lib/Uilab-Comp/smart-comp/UIComp/SmartModalForm.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { ModalForm } from '@ant-design/pro-components';
import { Button, Form } from 'antd';
import SmartField from './SmartField';
import { useRef } from 'react';

export default (props: { entitySet: string; content: any; onSubmit: any; fields: any; formType: string; action?: object; }) => {
    const { entitySet, content, onSubmit, fields, formType, action } = props
    console.log('smartModalForm-log', {
        entitySet,
        content,
        onSubmit,
        fields,
        formType,
        action
    })
    const { title, btnText, btnType } = content;
    const [form] = Form.useForm<{ name: string; company: string }>();
    const formRef = useRef();
    /**
     * 渲染表单内容
     */
    const renderContent = () => {
        switch (formType) {
            case 'UI.QuickCreateFacets':
                return fields && fields.map((item: { Value: any; }, index: any) => {
                    const option = {
                        key: `${item.Value}-${index}`,
                        entitySet,
                        path: item.Value,
                        formRef: form,
                    }
                    return <SmartField {...option} />
                })
            case 'UI.DataFieldForAction':
                return fields && fields.map((item: { name: any; nullable: any; }, index: any) => {
                    const option = {
                        key: `${item.name}-${index}`,
                        entitySet,
                        path: item.name,
                        action: action,
                        nullable: item.nullable,
                        formRef: form,
                    }
                    return <SmartField {...option} />
                })
            default:
                break;
        }
    }

    return (
        <ModalForm<{
            name: string;
            company: string;
        }>
            width={'600px'}
            layout='vertical'
            title={title}
            trigger={
                <Button type={btnType ? btnType : 'primary'}>
                    {btnText}
                </Button>
            }
            form={form}
            formRef={formRef}
            autoFocusFirstInput
            modalProps={{
                destroyOnClose: true,
                onCancel: () => {
                    formRef.current?.resetFields();
                    console.log('onCancel')
                },
            }}
            submitTimeout={1000}
            onFinish={async (values) => {
                //console.log('FormSumbit', { values, form })
                onSubmit(values);
                form?.resetFields();
                return true
            }}

        >
            {renderContent()}
        </ModalForm>
    );
};