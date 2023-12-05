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