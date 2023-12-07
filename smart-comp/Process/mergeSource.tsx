import { getRouteFiles } from "../../../../config/appConfig";
import React from "react"

/**
 * 合并源文件
 * SmartProps 所有的资源
 * children   选择资源地址
 * @returns   整合后的数据
 */
export const mergeSource = (SmartProps: any, children: string) => {
    let result: any = {};
    if (SmartProps?.length) {
        SmartProps?.forEach((item) => {
            if (children === item.children) {
                item.SmartProps?.forEach((childItem) => {
                    if (!result[childItem.type]) {
                        result[childItem.type] = [];
                    }
                    result[childItem.type].push({
                        ...childItem.data
                    });
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
                        childItem?.routes?.some((e: any) => {
                            if (window.location.href.includes(e.path)) {
                                if (e && e[source]) {
                                    result = e[source];
                                }
                                return true
                            } else {
                                return false;
                            }
                        })
                        return true;
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