import { getRouteFiles } from "../../../../config/appConfig";
import React from "react"

/**
 * 合并源文件
 * SmartProps 所有的资源
 * children   选择资源地址
 * dataSource 
 * @returns   整合后的数据
 */
export const mergeSource = (SmartProps: any, children: string, dataSource: any) => {
    if (SmartProps?.length) {
        SmartProps?.forEach((item) => {
            // children判断用于哪个组件
            if (children === item.children) {
                item.SmartProps?.forEach((childItem) => {
                    // 传入的资源
                    if (dataSource) {
                        if (dataSource[childItem.property]) {
                            switch (childItem.operateType) {
                                case "add":
                                    if (typeof (childItem.index) === "number") {
                                        dataSource[childItem.property].splice(childItem.index, 0, childItem.config);
                                    } else {
                                        dataSource[childItem.property].push(childItem.config);
                                    }
                                    break;
                                case "replace":
                                    break;
                                case "remove":
                                    break;
                                case "addType":
                                    if (typeof (childItem.index) === "number") {
                                        dataSource[childItem.property][childItem.index] = {
                                            ...dataSource[childItem.property][childItem.index],
                                            ...childItem.config,
                                        };
                                    }
                                default:
                                    break;
                            }
                        }
                    }
                })
            }
        })
    }

    return dataSource;
}

export const getSource = (source: string) => {
    const RouteFiles = getRouteFiles();
    let result: any = [];
    if (RouteFiles) {
        RouteFiles.some((item: any) => {
            if (window.location.href.includes(item.path)) {
                item.routes?.some((childItem: any) => {
                    if (window.location.href.includes(childItem.path)) {
                        if (childItem && childItem[source]) {
                            result = childItem[source];
                            return true
                        } else {
                            childItem?.routes?.some((e: any) => {
                                if (window.location.href.includes(e.path)) {
                                    if (e && e[source]) {
                                        result = e[source];
                                        return true
                                    }
                                } else {
                                    return false;
                                }
                            })
                        }
                    }
                    return false;
                })
                return true;
            }
            return false;
        })
    }
    return result;
}