/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2023-12-13 11:29:38
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-12-13 18:40:28
 * @FilePath: /Uilab-Application/lib/Uilab-Comp/smart-comp/CustComp/Icon/index.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import React from "react";
import "@ui5/webcomponents-icons/dist/AllIcons.js";
import "@ui5/webcomponents/dist/Button.js";
import "@ui5/webcomponents/dist/ColorPicker.js";


/**
 * 按钮
 * @param props name string
 * @param props size string (small middle  big)
 * @param props color string
 * @constructor
 */

interface IProps {
    name: string;
    size?: number;
    color?: string;
}

export default (props: IProps) => {
    let result: any = {
        width: "16px",
        height: "16px",
        color: props.color ? props.color : "var(--ant-primary-color)"
    };
    if (props.size) {
        result.width = props.size;
        result.height = props.size;
    }
    return <ui5-icon class="icon" name={props.name} style={{ ...result }}></ui5-icon>
}