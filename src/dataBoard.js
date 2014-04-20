function dataBoard(options)
{
    this.config = {
        baseUrl: window.location.origin + '/js/dataBoard/modules/',
        theme: 'default',
        modules: {},
        sources: [],
        datasets: {},
        queues: {}
    }

    $.extend(true, this.config, options);

    if (this.config.sources.length > 0)
    {
        for (var i = 0; i < this.config.sources.length; i++)
        {
            this.sources(i);
        }
    }
}

dataBoard.prototype.render = function()
{
    if (this.config.modules && typeof this.config.modules.charts != 'undefined')
    {
        for (var i = 0; i < this.config.modules.charts.length; i++)
        {
            this.chart(i);
        }
    }
}

dataBoard.prototype.queue = function (options)
{

    this.queues[options.name] = options;
}

dataBoard.prototype.sources = function (i, push)
{
    var that = this;
    $.ajax({
        async: false,
        url: that.config.sources[i].url,
        data: that.config.sources[i].params || {},
        success: function(data) {

            var series = JSON.parse(data);
            // Preprocess data
            if (that.config.sources[i].process)
            {
                series = that.config.sources[i].process(series);
            }
            else if (that.config.sources[i].describe)
            {
                series = dataBoard.prototype.sources.processFromDescribe.call(that, i, series);
            }

            // Push or create dataset
            if (push === true)
            {

            }
            else
            {
                dataBoard.prototype.dataset.call(that, i, series);
            }
        }
    });
}
dataBoard.prototype.dotToObject = function(path, object)
{
    return path.split('.').reduce(function(obj, i) {
        return obj[i];
    }, object);
}

dataBoard.prototype.sources.processFromDescribe = function(i, data)
{
    var series = {};
    var config = this.config.sources[i];
    var points = dataBoard.prototype.dotToObject(config.describe.pathInJson, data);

    if (typeof points == 'undefined')
        return false;

    if (points.length == 0)
        return series;

    var key_name = (points[0].name) ? 'name' : config.describe.name;
    var key_x = (points[0].x) ? 'x' : config.describe.x;
    var key_y = (points[0].y) ? 'y' : config.describe.y;
    for (var i = 0; i < points.length; i++)
    {
        if (points[i][key_x] == null || points[i][key_y] == null)
            continue;

        var x = points[i][key_x];
        if (config.describe.xIsDate == true)
        {
            var date = new Date(points[i][key_x]);
            x = date.getTime() - (date.getTimezoneOffset() * (60 * 1000));
        }

        var alias = points[i][key_name];

        if (typeof series[alias] == 'undefined')
            series[alias] = {data: []};

        series[alias].data.push([x, points[i][key_y]]);
    };

    return series;
}

dataBoard.prototype.dataset = function (i, datas)
{
    this.config.datasets[this.config.sources[i].name] = datas;
}


dataBoard.prototype.load = function()
{

}

dataBoard.prototype.load.data = function()
{

}

dataBoard.prototype.load.script = function()
{

}

dataBoard.prototype.chart = function(i)
{
    var config = this.config.modules.charts[i];

    if (!config.type)
        config.type = 'line';
    if (!config.theme)
        config.theme = this.config.theme;

    for (var i = 0; i < config.series.length; i++)
    {
        config.series[i].data = dataBoard.prototype.dotToObject(config.series[i].use + '.data', this.config.datasets);
    }

    config.instance = dataBoard.prototype.chart[config.type](config);
}

dataBoard.prototype.chart.default = function(config)
{
    var data = {
        chart: {
            renderTo: config.id,
            type: config.type
        },
        series: config.series,
        xAxis: config.xAxis,
    };

    var settings = $.extend({}, dataBoard.themes[config.theme], data);
    console.log(settings);
    return new Highcharts.Chart(settings);
}

dataBoard.prototype.chart.line = dataBoard.prototype.chart.default;
dataBoard.prototype.chart.area = dataBoard.prototype.chart.default;

dataBoard.prototype.figure = function()
{

}

dataBoard.themes = {}
dataBoard.loaded = {}
