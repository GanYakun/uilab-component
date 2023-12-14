/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2023-12-14 17:02:33
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-12-14 17:03:40
 * @FilePath: /Uilab-Application/lib/Uilab-Comp/smart-comp/CustComp/Tour/index.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import React, { useRef, useState } from 'react';
import { EllipsisOutlined } from '@ant-design/icons';
import { Button, Divider, Space, Tour } from 'ant5';
import type { TourProps } from 'ant5';

const App: React.FC = () => {
    const ref1 = useRef(null);
    const ref2 = useRef(null);
    const ref3 = useRef(null);

    const [open, setOpen] = useState<boolean>(false);

    const steps: TourProps['steps'] = [
        {
            title: 'Upload File',
            description: 'Put your files here.',
            cover: (
                <img
                    alt="tour.png"
                    src="https://user-images.githubusercontent.com/5378891/197385811-55df8480-7ff4-44bd-9d43-a7dade598d70.png"
                />
            ),
            target: () => ref1.current,
        },
        {
            title: 'Save',
            description: 'Save your changes.',
            target: () => ref2.current,
        },
        {
            title: 'Other Actions',
            description: 'Click to see other actions.',
            target: () => ref3.current,
        },
    ];

    return (
        <>
            <Button type="primary" onClick={() => setOpen(true)}>
                Begin Tour
            </Button>

            <Divider />

            <Space>
                <Button ref={ref1}> Upload</Button>
                <Button ref={ref2} type="primary">
                    Save
                </Button>
                <Button ref={ref3} icon={<EllipsisOutlined />} />
            </Space>

            <Tour open={open} onClose={() => setOpen(false)} steps={steps} />
        </>
    );
};

export default App;