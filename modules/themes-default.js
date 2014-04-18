var tHC_themes_default = {
    chart: {
        borderRadius: 0,
        plotBackgroundColor: null,
        plotShadow: false,
        plotBorderWidth: 0
    },
    colors: ['#058DC7','#ED561B','#e256ae','#E34A33','#e2cf56','#e25668','#e28956','#2CA25F','#56aee2'],
    credits: {
        enabled: false
    },
    title: {
        text: null
    },
    exporting: {
        enabled: false
    },
    tooltip: {
        shared: true,
        borderWidth: 0,
        borderRadius: "2px",shadow: false,backgroundColor: '#444',
        style: {
            color: '#ffffff',
        },
        snap: 25,
        pointFormat: '{series.name}: <b>{point.y}</b><br/>',
    },
    legend:{
        enabled: true,
        borderWidth: 0,
        itemStyle: {
            fontSize:'11px'
        },
        symbolPadding: 5,
        symbolWidth: 7,
        symbolHeight: 8,
        symbolRadius: 0,
        align: 'right',
        verticalAlign: 'top',
        floating: true
    },
    plotOptions: {
        series: {
            fillOpacity: 0.08,
            lineWidth: 1,
            shadow: false,
            states: {
                hover: {
                    lineWidth: 1
                }
            },
            marker: {
                lineWidth: 1,
                radius: 2,
            },
            connectNulls: false
        },
        line: {
            marker: { enabled: false }
        },
        area: {
            marker: { enabled: false }
        }
    },
    yAxis: {
        gridLineColor: '#f4f4f4',
        minPadding: 0,
        title: {
            text: null
        },
        labels: {
            style: {
                color: '#8B8686',
            }
        },
        tickLength: 8
    },
    xAxis: {
        title: {
            text: null
        },
        labels: {
            style: {
                color: '#8B8686',
            },
            y: 22
        },
        tickLength: 10,
    },
};
tHC.themes.add('default', tHC_themes_default);