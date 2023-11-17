/*
 * @Author: lx.jin 308561217@qq.com
 * @Date: 2022-09-20 10:33:25
 * @LastEditors: lx.jin 308561217@qq.com
 * @LastEditTime: 2023-02-03 13:37:15
 * @FilePath: /uilab-gbms/lib/o3smart-comp/UIComponents/AntDesignPro/SmartTable.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { useEffect, useState, useRef, useMemo } from 'react';
import { SmartFilterBar, ViewVaraint, TableCard, ListCard } from '../config';
import { getConfig } from '../../Anotations/OverviewPage';
import './index.less'
import { WidthProvider, Responsive } from "react-grid-layout";
import _ from "lodash";

const ResponsiveReactGridLayout = WidthProvider(Responsive);

const OverviewPage = (props) => {
    const {
        annoRequest,
        Ovp,
        appId,
        entitySet
    } = getConfig({})

    //cards
    const [layouts, setLayouts] = useState(null)
    const [compactType, setCompactType] = useState("vertical")
    const [breakpoints, setBreakpoints] = useState({ llg: 1920, lg: 1200, md: 996, sm: 768, xs: 480 })
    const [currentBreakpoint, setCurrentBreakpoint] = useState('lg')
    const [cols, setCols] = useState({ llg: 10, lg: 6, md: 4, sm: 3, xs: 1, })
    const [currentRecord, setCurrentRecord] = useState(null)
    useEffect(() => {
        setLayouts({ lg: generateLayout() })
    }, [currentBreakpoint])


    //请求数据
    useEffect(() => {
        if (!currentRecord) {
            fetch()
        }
    }, [currentRecord])
    const fetch = async () => {
        const result = await annoRequest()
        if (result) {
            setCurrentRecord(result)
        }
    }

    //设置布局
    function generateLayout() {
        const { cards } = Ovp, arr = [], result = []
        for (let key of Object.keys(cards)) {
            arr.push({ key, data: cards[key] })
        }
        const num = cols[currentBreakpoint]
        arr.map((item, index) => {
            const { key, data } = item
            const { settings, template } = data
            const { defaultSpan } = settings
            let x, w, y = 0, h = 6, minH
            w = defaultSpan && defaultSpan.cols ? defaultSpan.cols : 1
            x = index === 0 ? 0 : result[index - 1].x + result[index - 1].w
            if (index !== 0 && result[index - 1].x + result[index - 1].w >= num) {
                x = 0
            }
            if (template === 'sap.ovp.cards.linklist') {
                h = 1
            }
            if (template === 'sap.ovp.cards.v4.charts.analytical') {
                h = 6.5
            }
            result.push({
                x,
                y,
                w,
                h,
                minH: h,
                i: index.toString(),
                card: item
            })
        })

        //console.log({ result, cards,num })
        return result
    }

    //渲染fiterBar
    const SmartFilterBarRef = useRef()
    const onSearch = () => { }
    const onReset = () => { }
    const _filterBar = useMemo(() => {
        return <SmartFilterBar
            formRef={SmartFilterBarRef}
            entitySet={entitySet}
            onSearch={onSearch}
            onReset={onReset}
        />
    }, [entitySet])

    //渲染内容
    const _content = useMemo(() => {
        if (!layouts) return
        //渲染card
        const _renderCard = (card) => {
            const { key, data } = card
            const { settings, template } = data
            const { title, subTitle } = settings
            const total = currentRecord && currentRecord[key] ? currentRecord[key].data.data['@odata.count'] : null
            const dataSource = currentRecord && currentRecord[key] ? currentRecord[key].data.data.value : null
            const columns = currentRecord && currentRecord[key] ? currentRecord[key].columns : null
            const tabs = currentRecord && currentRecord[key] ? currentRecord[key].tabs : null
            //console.log({ currentRecord, key, columns, dataSource })

            const _renderCardContent = () => {
                switch (template) {
                    case 'sap.ovp.cards.v4.table':
                        return (
                            <TableCard
                                tabs={tabs}
                                columns={columns}
                                dataSource={dataSource}
                            />
                        )
                    case 'sap.ovp.cards.v4.list':
                        return (
                            <ListCard
                            />
                        )
                    default:
                        break;
                }
            }

            return (
                <div className='card'>
                    <div className='card-header'>
                        <div className='card-header-top'>
                            <div className='card-header-title'>{title}</div>
                            {total && <div className='card-header-count'>0/{total}</div>}
                        </div>
                        <div className='card-header-subtitle'>
                            {subTitle}
                        </div>
                    </div>
                    <div className='card-content'>
                        {dataSource && columns && _renderCardContent()}
                    </div>
                </div>
            )
        }

        const generateDOM = () => {
            return _.map(layouts.lg, function (l, i) {
                return (
                    <div style={{ overflow: 'hidden', backgroundColor: '#fff' }} key={i} className={l.static ? "static" : ""}>
                        {l.static ? (
                            <span
                                className="text"
                                title="This item is static and cannot be removed or resized."
                            >
                                Static - {i}
                            </span>
                        ) : (
                            _renderCard(l.card)
                        )}
                    </div>
                );
            });
        }

        return (
            <ResponsiveReactGridLayout
                // {...this.props}
                className='cards-container'
                rowHeight={60}
                breakpoints={breakpoints}
                cols={cols}
                layouts={layouts}
                onBreakpointChange={(params) => {
                    //console.log({ params })
                    setCurrentBreakpoint(params)
                }}
                onLayoutChange={(a, b, c, d) => {
                    console.log({ a, b, c, d })
                }}
                // onDrop={this.onDrop}
                // WidthProvider option
                measureBeforeMount={false}
                // I like to have it animate on mount. If you don't, delete `useCSSTransforms` (it's default `true`)
                // and set `measureBeforeMount={true}`.
                useCSSTransforms={true}
                isDroppable={true}
                compactType={compactType}
                preventCollision={!compactType}
            >
                {generateDOM()}
            </ResponsiveReactGridLayout>
        )
    }, [currentBreakpoint, layouts, currentRecord])

    return (
        <div className='uilab-page-container'>
            <ViewVaraint
                appId={appId}
            />
            {_filterBar}
            {_content}
        </div>
    )
};

OverviewPage.propTypes = {
};

OverviewPage.defaultProps = {
};

export default OverviewPage;