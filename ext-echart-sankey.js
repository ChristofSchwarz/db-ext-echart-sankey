define(["qlik", "jquery", "./props", "./functions", "./cdnjs/echarts.min"
    // echarts.min.js from https://www.cdnpkg.com/echarts/file/echarts.min.js/?id=32956
], function (qlik, $, props, functions, echarts) {

    'use strict';

    var vsettings = {};
    var qext;

    $.ajax({
        url: '../extensions/ext-echart-sankey/ext-echart-sankey.qext',
        dataType: 'json',
        async: false,  // wait for this call to finish.
        success: function (data) { qext = data; }
    });

    return {
        initialProperties: {
            showTitles: false,
            disableNavMenu: false,
            qHyperCubeDef: {
                qInitialDataFetch: [{
                    qWidth: 6,
                    qHeight: Math.floor(10000 / 6) // divide 10000 by qWidt
                }]
            }
        },

        definition: {
            type: "items",
            component: "accordion",
            items: [
                {
                    uses: "settings"
                }, {
                    uses: "dimensions",
                    min: 2,
                    max: 5
                }, {
                    uses: "measures",
                    min: 1,
                    max: 1
                }, {
                    label: 'Extension Settings',
                    type: 'items',
                    items: props.presentation()
                }, {
                    label: 'About this extension',
                    type: 'items',
                    items: props.about(qext)
                }
            ]
        },
        snapshot: {
            canTakeSnapshot: false
        },

        // updateData: function (layout) {
        //     return qlik.Promise.resolve();
        // },
        /*
                resize: function ($element, layout) {
                    var self = this;
                    const ownId = this.options.id;
                    const mode = qlik.navigation.getMode();
                    return qlik.Promise.resolve();
                },
        */
        paint: function ($element, layout) {

            // https://htc-tourismusconsulting.eu.qlikcloud.com/sense/app/08b169e5-d76e-4698-9b53-5dcdeaa908ca/sheet/be4fc6d0-3cf4-4a6b-a5d8-2c97049fd4e8

            var self = this;
            const ownId = this.options.id;
            const mode = qlik.navigation.getMode();
            if (layout.pConsoleLog) console.log(ownId, 'paint', 'mode ' + mode, 'layout', layout);
            const app = qlik.currApp(this);
            const thisSheetId = qlik.navigation.getCurrentSheetId().sheetId;
            const enigma = app.model.enigmaModel;

            $element.html(
                '<div id="parent_' + ownId + '" style="height:100%;position:relative;">' +
                '</div>');

            const data = layout.qHyperCube.qDataPages[0].qMatrix;

            var dframe = [
                /*
   
                { parent: "L1 Aktiva", name: "L2 Anlangev", val: 7000 },
                { parent: "L1 Aktiva", name: "L2 Umlaufv", val: 8000 },
                { parent: "L1 Passiva", name: "L2 Eigenkapital", val: -2000 },
                { parent: "L1 Passiva", name: "L2 Fremdkapital", val: -10000 },
                { parent: "L1 Passiva", name: "Bank", val: 5000 },
                { parent: "L2 Umlaufv", name: "L3.1", val: 5000 },
                { parent: "L2 Umlaufv", name: "L3.2", val: 3000 }
                */
            ];
            //consolrow.log(dframe);
            const maxDims = 5;
            data.forEach(function (dataRow, i) {
                if (dataRow[5].qText != '0') {
                    console.log(i, dataRow[0].qText, dataRow[1].qText, dataRow[2].qText, dataRow[3].qText, dataRow[4].qText, dataRow[5].qNum);
                    if (dataRow[4].qIsNull) {
                        if (dataRow[3].qIsNull) {
                            if (dataRow[2].qIsNull) {
                                console.log('L2', dataRow[1].qText, dataRow[5].qNum);
                                dframe.push({
                                    parent: dataRow[0].qText,
                                    name: dataRow[1].qText,
                                    val: Math.round(dataRow[5].qNum)
                                })
                            } else {
                                console.log('L3', dataRow[2].qText, dataRow[5].qNum);
                                dframe.push({
                                    parent: dataRow[1].qText,
                                    name: dataRow[2].qText,
                                    val: Math.round(dataRow[5].qNum)
                                })
                            }
                        }
                        else {
                            console.log('L4', dataRow[3].qText, dataRow[5].qNum);
                            dframe.push({
                                parent: dataRow[2].qText,
                                name: dataRow[3].qText,
                                val: Math.round(dataRow[5].qNum)
                            })
                        }
                    } else {
                        console.log('L5', dataRow[4].qText, dataRow[5].qNum);
                        dframe.push({
                            parent: dataRow[3].qText,
                            name: dataRow[4].qText,
                            val: Math.round(dataRow[5].qNum)
                        })
                    }
                }
            });

            var chartDom = document.getElementById('parent_' + ownId);
            var myChart = echarts.init(chartDom);
            var option;

            // add two calculated values to the dataframe
            dframe.forEach((row) => {
                row.valPos = Math.max(0, row.val);
                row.valNeg = -Math.min(0, row.val);
            });

            console.log('dframe', dframe);

            function createParents(dframe) {
                var parents = {};
                dframe.forEach((row) => {
                    if (!parents.hasOwnProperty(row.parent)) {
                        parents[row.parent] = {
                            sum: row.val,
                            sumPos: row.valPos,
                            sumNeg: row.valNeg
                        };
                    } else {
                        parents[row.parent].sum += row.val;
                        parents[row.parent].sumPos += row.valPos;
                        parents[row.parent].sumNeg += row.valNeg;
                    }
                });
                return parents;
            }

            function createDataArr(dframe, parents) {
                var retObj = [];

                //parents.forEach(e => namesObj.push({ name: e }));
                dframe.forEach((row) => {
                    retObj.push({
                        name: row.name,
                        value: Math.abs(row.val),
                        itemStyle: { color: row.val < 0 ? 'red' : 'green' }
                    });
                });
                // bringe alle Parent names in das namesObj
                for (const parent in parents) {
                    if (retObj.filter((e) => e.name == parent).length == 0) {
                        retObj.push({
                            name: parent,
                            itemStyle: { color: parents[parent].sum < 0 ? 'red' : 'green' }
                        });
                    }
                }
                return retObj;
            }

            function createLinks(dframe) {
                var links = [];
                dframe.forEach((row) => {
                    row.parentSum = parents[row.parent].sum;
                    row.parentSumPos = parents[row.parent].sumPos;
                    row.parentSumNeg = parents[row.parent].sumNeg;
                    links.push({
                        source: row.name,
                        target: row.parent,
                        value:
                            row.parentSum >= 0
                                ? (row.valPos * row.parentSum) / row.parentSumPos
                                : (row.valNeg * -row.parentSum) / row.parentSumNeg,
                        tooltip: { show: false }
                    });
                });
                return links;
            }

            var parents = createParents(dframe);
            console.log('parents', parents);
            var names = createDataArr(dframe, parents);
            console.log('names', names);
            var links = createLinks(dframe);
            console.log('links', links);

            option = {
                tooltip: {
                    // textStyle: {fontStyle: 'italic'},
                    extraCssText: 'box-shadow: 0 0;'
                    // trigger: 'item',
                    // triggerOn: 'mousemove'
                },
                animation: false,

                series: [
                    {
                        type: 'sankey',
                        bottom: '10%',
                        emphasis: { focus: 'adjacency' },
                        nodeAlign: 'right',
                        data: names,
                        /*{ name: 'Erlöse gesamt', itemStyle: { color: '#42A171'} }, */
                        links: links,
                        // { source: dframe[0].name, target: dframe[0].parent, value: dframe[0].val },
                        orient: 'horizontal',
                        label: { position: 'top' },
                        lineStyle: {
                            color: 'source',
                            curveness: 0.5
                        }
                    }
                ]
            };

            option && myChart.setOption(option);



            return qlik.Promise.resolve();
        }
    };
});