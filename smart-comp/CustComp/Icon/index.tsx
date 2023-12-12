import React from "react";
import "@ui5/webcomponents-icons/dist/AllIcons.js";
import "@ui5/webcomponents/dist/Button.js";

/**
 * 按钮
 * @param props name string
 * @constructor
 */
export default (props) => {
    return <ui5-icon name={props.name}></ui5-icon>
}