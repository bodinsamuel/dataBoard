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

    this.config = $.extend(true, {}, this.config, options);

    if (this.config.sources.length > 0)
    {
        for (var i = 0; i < this.config.sources.length; i++)
        {
            this.sources(i);
        }
    }
}

dataBoard.prototype.destroy = function()
{
    if (this.config.modules && typeof this.config.modules.charts != 'undefined')
    {
        for (var i = 0; i < this.config.modules.charts.length; i++)
        {
            this.config.modules.charts[i].instance.destroy();
        }
    }

    this.config = null;
}

dataBoard.prototype.render = function()
{
    if (this.config.modules)
    {
        // Charts
        if (typeof this.config.modules.charts != 'undefined')
        {
            !function(that) {
                dataBoard.loader.script({
                    name: 'Highcharts',
                    url: that.config.baseUrl + 'highcharts.js',
                    callback: function() {
                        for (var i = 0; i < that.config.modules.charts.length; i++)
                        {
                            if (!that.config.modules.charts[i].rendered)
                                that.chart(i);
                        }
                    }
                });
            }(this);
        }

        // Figures
        if (typeof this.config.modules.figures != 'undefined')
        {
            for (var i = 0; i < this.config.modules.figures.length; i++)
            {
                if (!this.config.modules.figures[i].rendered)
                    this.figure.call(this, i);
            }
        }
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
            var series = data;
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
                            that.config.sources[i].params.ttl = parseInt(that.config.sources[i].lastUpdated.getTime() / 1000);
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
    if (this.config.sources[i].describe.chart)
        series.charts = dataBoard.prototype.sources.processFromDescribe.charts.call(this, i, data);
    if (this.config.sources[i].describe.figure)
        series.figures = dataBoard.prototype.sources.processFromDescribe.figures.call(this, i, data);

    return series;
}

dataBoard.prototype.sources.processFromDescribe.charts = function(i, data)
{
    var series = {};
    var describe = this.config.sources[i].describe.chart;
    var points = dataBoard.prototype.dotToObject(describe.pathInJson, data);

    if (typeof points == 'undefined')
        return false;

    if (points.length == 0)
        return series;

    var key_name = (points[0].name) ? 'name' : describe.name;
    var key_x = (points[0].x) ? 'x' : describe.x;
    var key_y = (points[0].y) ? 'y' : describe.y;

    // Classic
    for (var g = 0; g < points.length; g++)
    {
        if (points[g][key_x] == null || points[g][key_y] == null || points[g][key_name] == null)
            continue;

        var x = points[g][key_x];
        if (describe.xIsDate == true)
        {
            var date = new Date(points[g][key_x]);
            x = date.getTime() - (date.getTimezoneOffset() * (60 * 1000));
        }

        var alias = points[g][key_name];

        if (typeof series[alias] == 'undefined')
            series[alias] = [];

        if (this.config.sources[i].period && (!this.config.sources[i].period.lastDate || this.config.sources[i].period.lastDate < x))
            this.config.sources[i].period.lastDate = x;

        series[alias].push([x, points[g][key_y]]);
    };

    return series;
}

dataBoard.prototype.sources.processFromDescribe.figures = function(i, data)
{
    var series = {};
    var describe = this.config.sources[i].describe.figure;
    var figures = dataBoard.prototype.dotToObject(describe.pathInJson, data);

    if (typeof figures == 'undefined')
        return false;

    if (figures.length == 0)
        return series;

    var key_name = (figures[0].name) ? 'name' : describe.name;
    var key_value = (figures[0].value) ? 'value' : describe.value;
    for (var i = 0; i < figures.length; i++)
    {
        if (figures[i][key_name] == null)
            continue;

        var name = figures[i][key_name];

        if (typeof series[name] == 'undefined')
            series[name] = [];

        series[name] = {value: figures[i][key_value]};
    }

    return series;
}

dataBoard.prototype.sources.pushToModules = function(name, series)
{
    var paths = {};
    for (subname in series)
    {
        var path = name + '.' + subname;
        paths[path] = path;
        for (subsubname in series[subname])
        {
            var _path = path + '.' + subsubname;
            paths[_path] = _path;
        }
    }

    var datas = {}
    datas[name] = series

    if (this.config.modules)
    {
        // Charts
        if (typeof this.config.modules.charts != 'undefined')
        {
            for (var i = 0; i < this.config.modules.charts.length; i++)
            {
                for (var g = 0; g < this.config.modules.charts[i].series.length; g++)
                {
                    var hasPath = this.config.modules.charts[i].series[g].use;

                    if (paths[hasPath])
                    {
                        this.chart.pushData.call(this, i, g, this.dotToObject(this.config.modules.charts[i].series[g].use, datas));
                    }
                }
            }
        }

        // Figures
        if (typeof this.config.modules.figures != 'undefined')
        {
            for (var i = 0; i < this.config.modules.figures.length; i++)
            {
                for (var g in this.config.modules.figures[i].series)
                {
                    var hasPath = this.config.modules.figures[i].series[g].use;
                    if (paths[hasPath])
                    {
                        this.figure.pushData.call(this, i, this.dotToObject(this.config.modules.figures[i].series[g].use, datas));
                    }
                }
            }
        }
    }
}

dataBoard.prototype.dataset = function (i, datas)
{
    // Fill with null awesome
    if (this.config.sources[i].describe.chart.xIsDate == true
        && this.config.sources[i].period
        && this.config.sources[i].period.fillWithNull == true)
    {
        for (name in datas.charts)
        {
            datas.charts[name].data = this.dataset.fillWithNull.call(this, i, datas.charts[name]);
        }
    }

    this.config.datasets[this.config.sources[i].name] = datas;
}

dataBoard.prototype.dataset.fillWithNull = function(fromSource, datas)
{
    var period = this.config.sources[fromSource].period;
    var diff = (period.end - period.start) / (period.interval);

    var interval = period.start - period.interval;
    var data = [];
    var offset = new Date().getTimezoneOffset();

    var sorted = [];
    for (var i = datas.length - 1; i >= 0; i--)
    {
        sorted[datas[i][0]] = datas[i];
    }

    var done = 0;
    for (var i = 0; i <= diff; i++)
    {
        interval += period.interval;
        if (interval >= this.config.sources[fromSource].period.lastDate && period.lastPointIsEnd)
            break;

        if (sorted[interval])
        {
            data.push(sorted[interval]);
            done++;
        }
        else
        {
            data.push([interval, 0]);
        }
    }

    return data;
}

dataBoard.prototype.getSourceFromName = function (name)
{
    for (var i = this.config.sources.length - 1; i >= 0; i--)
    {
        if (this.config.sources[i].name == name)
            return i;
    }
    return false;
}

dataBoard.prototype.chart = function(i)
{
    var config = this.config.modules.charts[i];

    if (!config.type)
        config.type = 'line';
    if (!config.theme)
        config.theme = this.config.theme;
    if (!config.plotOptions)
        config.plotOptions = {};
    if (!config.plotOptions.series)
        config.plotOptions.series = {};

    for (var g = 0; g < config.series.length; g++)
    {
        config.series[g].data = dataBoard.prototype.dotToObject(config.series[g].use, this.config.datasets);

        var fromSource = this.getSourceFromName(config.series[g].use.split('.')[0]);
        if (fromSource !== false && fromSource >= 0)
        {
            if (this.config.sources[fromSource].period)
            {
                config.plotOptions.series.pointStart = this.config.sources[fromSource].period.start;
                config.lastDate = this.config.sources[fromSource].period.lastDate;
            }
        }
    }

    config.instance = dataBoard.prototype.chart[config.type](config);
    config.rendered = true;

    if (config.defaultZoom)
        dataBoard.prototype.chart.defaultZoom.call(this, i);
}

dataBoard.prototype.chart.pushData = function(i, g, datas)
{
    for (var d = 0; d < datas.length; d++)
    {
        // Try to deduplicate last data
        if (this.config.modules.charts[i].updateOnDuplicateX)
        {
            var length = this.config.modules.charts[i].instance.series[g].data.length;
            if (length > 0)
            {
                var last = this.config.modules.charts[i].instance.series[g].data[length-1];
                if (last.x == datas[d][0])
                {
                    last.update([datas[d][0], datas[d][1]]);
                    continue;
                }
            }
        }

        // add a new point
        this.config.modules.charts[i].instance.series[g].addPoint([datas[d][0], datas[d][1]]);


        // Remove last point if needed
        if (this.config.modules.charts[i].maxPoint
            && this.config.modules.charts[i].instance.series[g].data.length > this.config.modules.charts[i].maxPoint)
        {
            // hack to fix highcharts animation when shifting
            var currentShift = (this.config.modules.charts[i].instance.series[g].graph && this.config.modules.charts[i].instance.series[g].graph.shift) || 0;
            Highcharts.each([this.config.modules.charts[i].instance.series[g].graph], function (shape) {
                if (shape) {
                    shape.shift = currentShift + 1;
                }
            });

            //Remove point
            this.config.modules.charts[i].instance.series[g].data[0].remove(false, false);
        }


        if (this.config.modules.charts[i].defaultZoom)
            dataBoard.prototype.chart.defaultZoom.call(this, i);
    }
}

dataBoard.prototype.chart.defaultZoom = function(i)
{
    console.log('set Default zoom for ', i , ' -- ', this.config.modules.charts[i].lastDate)
    var d = new Date();
    this.config.modules.charts[i].instance.xAxis[0].setExtremes(this.config.modules.charts[i].lastDate - this.config.modules.charts[i].defaultZoom, this.config.modules.charts[i].lastDate);
    this.config.modules.charts[i].instance.showResetZoom();
}

dataBoard.prototype.chart.default = function(config)
{
    var settings = $.extend(true, {}, dataBoard.themes[config.theme], config);
    return new Highcharts.Chart(settings);
}

dataBoard.prototype.chart.line = dataBoard.prototype.chart.default;
dataBoard.prototype.chart.area = dataBoard.prototype.chart.default;


dataBoard.prototype.figure = function(i)
{
    var config = this.config.modules.figures[i];
    for (var g in this.config.modules.figures[i].series)
    {
        config.series[g].value = dataBoard.prototype.dotToObject(config.series[g].use, this.config.datasets).value;
    }

    config.instance = new dataBoard_Figure(config);
    config.rendered = true;
}

dataBoard.prototype.figure.pushData = function(i, data)
{
    this.config.modules.figures[i].instance.push('main', data);
}


dataBoard.themes = {}
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
dataBoard.loader.loaded = {}
dataBoard.loader.script = function(options)
{
    if (dataBoard.loader.isLoaded(options.name) == true)
        return options.callback();

    if (dataBoard.loader.isLoading(options.name) == true)
        return dataBoard.queue.add(options.name, options.callback);

    dataBoard.loader.loaded[options.name] = 'doing';

    dataBoard.queue.add(options.name, options.callback);

    !function(options) {
        $.ajax({
            cache: true,
            url: options.url,
            dataType: "script",
            success: function() {
                dataBoard.loader.loaded[options.name] = true;
                return dataBoard.queue.empty(options.name);
            }
        });
    }(options);
}
dataBoard.loader.isLoading = function (name)
{
    return (typeof dataBoard.loader.loaded[name] != 'undefined' && dataBoard.loader.loaded[name] == 'doing');
}
dataBoard.loader.isLoaded = function (name)
{
    return (typeof dataBoard.loader.loaded[name] != 'undefined' && dataBoard.loader.loaded[name] == true);
}


var dataBoard_Figure = (function() {
    function dataBoard_Figure(options)
    {
        this.config = {
            id: '',
            animation: {
                bg: true,
                figure: true,
                helper: true
            },
            series: null
        }

        this.series = {};

        this.config = $.extend(true, {}, this.config, options);

        if (this.config.id == null)
            throw 'Figure-- a figure need an id';

        this.config.$selector = $('#' + this.config.id);

        if (this.config.series)
        {
            for (var k in this.config.series)
            {
                this.addSerie(k, this.config.series[k]);
            }
        }

        this.render();
    }

    dataBoard_Figure.prototype.render = function()
    {
        for (var k in this.series)
        {
            this.series[k].$selector.text(this.series[k].value).attr('title', this.series[k].text);
            this.series[k].$selector.data('color', this.series[k].color);
        }
    }

    dataBoard_Figure.prototype.addSerie = function(name, serie)
    {
        var serie = $.extend(true, {
            selector: null,
            value: 0,
            color: 'neutral',
            text: null
        }, serie );

        if (serie.selector == null)
            throw 'Figure-- serie need a selector';

        serie.$selector = this.config.$selector.find(serie.selector);
        this.series[name] = serie;
    }

    dataBoard_Figure.prototype.push = function(name, data)
    {
        this.series[name].value = parseInt(data.value);
        this.render();
    }

    return dataBoard_Figure;
})();

