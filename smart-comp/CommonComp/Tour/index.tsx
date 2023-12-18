/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2023-12-14 17:02:33
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-12-15 15:40:51
 * @FilePath: /Uilab-Application/lib/Uilab-Comp/smart-comp/CustComp/Tour/index.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import React, { useRef, useState } from 'react';
import { EllipsisOutlined } from '@ant-design/icons';
import { Button, Divider, Space, Tour } from 'ant5';
import type { TourProps } from 'ant5';

const App: React.FC = (props: any) => {
    const { liRefList, steps } = props
    const [open, setOpen] = useState<boolean>(false);
    return (
        <>
            <Button type="primary" onClick={() => setOpen(true)}>
                Begin Tour
            </Button>
            <Tour open={open} onClose={() => setOpen(false)} steps={steps(liRefList)} />
        </>
    );
};

export default App;