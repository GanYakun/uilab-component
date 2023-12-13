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
    size?: "small" | "middle" | "big" | string;
    color?: string;
}

export default (props: IProps) => {
    let result: any = {
        width: "16px",
        height: "16px",
        color: props.color ? props.color : "var(--ant-primary-color)"
    };
    if (props.size === "small") {
        result.width = "14px";
        result.height = "14px";
    } else if (props.size === "big") {
        result.width = "18px";
        result.height = "18px";
    }
    return <ui5-icon class="icon" name={props.name} style={{ ...result }}></ui5-icon>
}