import { getRouteFiles } from "../../../../config/appConfig";
import React from "react"

/**
 * 合并源文件
 * SmartProps 所有的资源
 * children   选择资源地址
 * dataSource {name: string, value: any}[]
 * @returns   整合后的数据
 */
export const mergeSource = (SmartProps: any, children: string, dataSource?: { name: string, value: any }[]) => {
    let result: any = {};
    if (SmartProps?.length) {
        SmartProps?.forEach((item) => {
            // children判断用于哪个组件
            if (children === item.children) {
                item.SmartProps?.forEach((childItem) => {
                    if (!result[childItem.type]) {
                        result[childItem.type] = [];
                    }
                    result[childItem.type].push({
                        ...childItem.data
                    });
                    // 传入的资源
                    if (dataSource) {
                        dataSource?.forEach((e) => {
                            if (e.name === childItem.type) {
                                switch (childItem.operate) {
                                    case "add":
                                        if (typeof (childItem.index) === "number") {
                                            e?.value && e?.value?.splice(childItem.index, 0, childItem.data);
                                        } else {
                                            e?.value && e?.value.push(childItem.data);
                                        }
                                        break;
                                    case "replace":
                                        break;
                                    case "remove":
                                        break;
                                    case "addType":
                                        if (typeof (childItem.index) === "number") {
                                            e?.value && (e.value[childItem.index] = {
                                                ...e.value[childItem.index],
                                                ...childItem.data,
                                            });
                                        }
                                    default:
                                        break;
                                }
                                result[childItem.type] = e.value;
                            }
                        })
                    }
                })
            }
        })
    }

    return result;
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