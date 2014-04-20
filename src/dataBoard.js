function dataBoard(options)
{
    this.config = {
        baseUrl: window.location.origin + '/js/dataBoard/modules/',
        theme: 'default',
        modules: {},
        sources: [],
        datasets: {},
        interval: {}
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
        !function(that) {
            dataBoard.loader.script({
                name: 'Highcharts',
                url: that.config.baseUrl + 'highcharts.js',
                callback: function() {
                    for (var i = 0; i < that.config.modules.charts.length; i++)
                    {
                        that.chart(i);
                    }
                }
            });
        }(this);
    }
}

dataBoard.prototype.sources = function (i, push)
{
    var that = this;
    if (!that.config.sources[i].params)
        that.config.sources[i].params = {};
    if (!that.config.sources[i].lastUpdated)
        that.config.sources[i].lastUpdated = new Date();

    $.ajax({
        async: false,
        url: that.config.sources[i].url,
        data: that.config.sources[i].params,
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
                dataBoard.prototype.sources.pushToModules.call(that, that.config.sources[i].name, series);
            }
            else
            {
                dataBoard.prototype.dataset.call(that, i, series);

                if (that.config.sources[i].ttl && !that.config.interval[that.config.sources[i].name])
                {
                    that.config.interval[that.config.sources[i].name] = !function(that, i){
                        return setInterval(function(){
                            var now = new Date();
                            that.config.sources[i].params.ttl = parseInt((that.config.sources[i].lastUpdated.getTime() + parseInt(that.config.sources[i].ttl)) / 1000);
                            that.sources.call(that, i, true);

                            that.config.sources[i].lastUpdated = now;
                        }, parseInt(that.config.sources[i].ttl));
                    }(that, i);
                }
            }
        }
    });
}

dataBoard.prototype.dotToObject = function(path, object)
{
    return path.split('.').reduce(function(obj, i) {
        return obj[i] || [];
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
dataBoard.queue = function()
{

}
dataBoard.queue.add = function(name, cb)
{
    if (!dataBoard.queue[name])
        dataBoard.queue[name] = [];

    dataBoard.queue[name].push(cb);
}
dataBoard.queue.empty = function(name)
{
    for (var i = 0; i < dataBoard.queue[name].length; i++)
    {
        var cb = dataBoard.queue[name].shift();
        cb();
    }
}

dataBoard.loader = {};
dataBoard.loader.script = function(options)
{
    if (typeof dataBoard.loader.isLoaded(options.name) == true)
        return options.callback();

    if (typeof dataBoard.loader.isLoading(options.name) == true)
        return dataBoard.queue.add(options.name, options.callback);

    dataBoard.loaded[options.name] = 'doing';

    dataBoard.queue.add(options.name, options.callback);

    !function(options) {
        $.ajax({
            cache: true,
            url: options.url,
            dataType: "script",
            success: function() {
                dataBoard.loaded[options.name] = true;
                return dataBoard.queue.empty(options.name);
            }
        });
    }(options);
}
dataBoard.loader.isLoading = function (name)
{
    return !!(typeof dataBoard.loaded[name] == 'doing');
}
dataBoard.loader.isLoaded = function (name)
{
    return !!(typeof dataBoard.loaded[name] == true);
}
