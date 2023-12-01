import React, { useEffect, useState } from "react";
import { Space, Skeleton } from 'antd';

export default () => {
    const [currentState, setCurrentState] = useState<{}>();
    const init = async () => {

    }
    useEffect(() => {
        !currentState && init()
    }, [])
    return (
        <div style={{ backgroundColor: '#fff', padding: 24 }}>
            <br />
            <Space>
                <Skeleton.Button active={true} size='default' shape='default' block={false} />
                <Skeleton.Avatar active={true} size='default' shape='circle' />
                <Skeleton.Input active={true} size='default' />
            </Space>
            <br />
            <br />
            <Space>
                <Skeleton.Button active={true} size='default' shape='default' block={false} />
            </Space>
            <br />
            <br />
            <Space wrap>
                <Skeleton.Image active={true} />
                <Skeleton.Input active={true} size='default' />
                <Skeleton.Input active={true} size='default' />
                <Skeleton.Input active={true} size='default' />
                <Skeleton.Input active={true} size='default' />
                <Skeleton.Input active={true} size='default' />
            </Space>
            <br />
            <br />
            <br />
            <br />
            <Skeleton />
            <br />
            <br />
            <Skeleton />
            <br />
            <br />
            <Skeleton />
            <br />
            <br />
            <Skeleton />
            <br />
            <br />
            <Skeleton />
            <br />
            <br />
            <Skeleton />
        </div>)
}