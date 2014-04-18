
var tHC = (function () {
    var tHC = {
        loaded: {},
        queue: {},
        themes: {},
        instance: [],
        baseUrl: window.location.origin + '/tHC/modules/highcharts.js'
    };

    tHC.blunt = function (opts)
    {
        if (!opts || !opts.id)
            throw "tHC: missing id";

        tHC.load({
            name: 'Highcharts',
            type: 'script',
            url: tHC.baseUrl,
            callback: function(opts){
                return function() {
                    var instance = tHC.draw(opts);
                    tHC.instance.push(instance);

                    $('#' + opts.id).data('tHC', instance);
                }
            }(opts)
        });
    }

    tHC.load = function(opts)
    {
        var opts = {
            name: opts.name || new Date().getTime(),
            type: opts.type || 'json',
            url: opts.url,
            callback: opts.callback || function() {}
        }
        if (!opts.url)
            throw "tHC: no url specified";

        if (opts.type == 'script')
            return tHC.load.script(opts);
        else
            return tHC.load.data(opts);
    }

    tHC.load.script = function(opts)
    {
        if (typeof tHC.loaded[opts.name] == true)
            return opts.callback();

        if (tHC.loaded[opts.name] == 'doing')
        {
            tHC.queue[opts.name].push(opts);
            return;
        }

        tHC.loaded[opts.name] = 'doing';

        tHC.queue[opts.name] = [];
        tHC.queue[opts.name].push(opts);

        $.getScript(opts.url, function() {
            tHC.loaded[opts.name] = true;
            return tHC.unqueue(opts.name);
        });
    }

    tHC.unqueue = function(name)
    {
        for (var i = 0; i < tHC.queue[name].length; i++)
        {
            tHC.queue[name][i].callback();
        };
    }

    tHC.load.data = function(url, callback)
    {
        $.ajax({
            url: url,
            type: "json",
            async: false,
            success: callback
        });
    }

    tHC.draw = function(opts)
    {
        var options = Highcharts.merge(true, {
            type: 'line',
            last_drawn: new Date(),
            datasets: [],
            theme: 'default'
        }, opts);

        // Manages main data sources
        if (options.sources && options.sources.url)
        {
            tHC.sources.process(options);
            console.log(options)

            if (options.sources.ttl)
            {
                options.sources.interval = !function(options) {
                    setInterval(function(){
                        var now = new Date();
                        options.sources.params.ttl = parseInt((options.last_drawn.getTime() + parseInt(options.sources.ttl)) / 1000);
                        tHC.sources.process(options, true);
                        options.last_drawn = now;
                    }, parseInt(options.sources.ttl));
                }(options);
            }
        }

        // Process datasets
        options.series = tHC.datasets(options);

        return tHC.draw[options.type](options);
    }

    tHC.sources = {};
    tHC.sources.process = function(options, push)
    {
        $.ajax({
            async: false,
            url: options.sources.url,
            data: options.sources.params || {},
            success: function(data) {
                options.sources.datas = data;

                var series;
                if (options.sources.process)
                {
                    series = options.sources.process(options.sources.datas);
                }
                else if (options.sources.describe)
                {
                    series = tHC.sources.process_from_describe(options);
                }

                // Push
                if (push === true)
                    tHC.push(options, series);
                else
                    options.sources.series = series;
            }
        });
    }

    tHC.dotnotation_to_object = function(object, i)
    {
        return object[i];
    }

    tHC.sources.process_from_describe = function(options)
    {
        var series = {};
        var points = options.sources.describe.pathInJson.split('.').reduce(tHC.dotnotation_to_object, options.sources.datas);

        if (points.length == 0)
            return series;

        var key_name = (points[0].name) ? 'name' : options.sources.describe.name;
        var key_date = (points[0].date) ? 'date' : options.sources.describe.name;
        var key_value = (points[0].value) ? 'value' : options.sources.describe.value;
        for (var i = 0; i < points.length; i++)
        {
            if (points[i][key_date] != null)
            {
                var date = new Date(points[i][key_date]);
                ts = date.getTime() - (date.getTimezoneOffset() * (60 * 1000));

                var alias = (options.sources.describe.alias && options.sources.describe.alias[points[i][key_name]]) ? options.sources.describe.alias[points[i][key_name]] : points[i][key_name];

                if (typeof series[alias] == 'undefined')
                    series[alias] = {data: []};

                series[alias].data.push([ts, points[i][key_value]]);
            }
        };
        return series;
    }

    tHC.push = function(options, series)
    {
        var instance = $('#' + options.id).data()['tHC'];

        for (var i = 0; i < options.datasets.length; i++)
        {
            if (series[options.datasets[i].name])
            {
                for (var g = 0; g < series[options.datasets[i].name].data.length; g++)
                {
                    console.log(series[options.datasets[i].name].data[g]);
                    instance.series[i].addPoint(series[options.datasets[i].name].data[g]);
                }
            }
        }
    }

    tHC.datasets = function(options)
    {
        var series = [];

        var datasets = options.datasets;
        for (var i = 0; i < datasets.length; i++)
        {
            // Serie tpl redeclared to avoid copy by reference
            var serie = {
                name: new Date().getTime(),
                data: []
            };

            // Fetch url if needed
            if (datasets[i].url)
            {
                tHC.load.data(datasets[i].url, function(data) {
                    datasets[i].data = data;
                });
            }

            // Process data
            if (datasets[i].process)
                datasets[i].data = datasets[i].process(datasets[i].data);

            // Manage datetime, not good for now
            if (typeof datasets[i].datetime != 'undefined' && typeof datasets[i].data[0] != 'undefined')
            {
                datasets[i].pointInterval = datasets[i].datetime;
                datasets[i].pointStart = datasets[i].data[0][0];
            }

            // If possible, merge with sources
            if (options.sources && options.sources.series && options.sources.series[datasets[i].name])
                datasets[i] = Highcharts.merge(true, options.sources.series[datasets[i].name], datasets[i]);

            // Finally merge tpl + data AND push to series
            series.push(Highcharts.merge(true, serie, datasets[i]));
        };

        return series;
    }

    tHC.draw.default = function(options)
    {
        var data = {
            chart: {
                renderTo: options.id,
                type: options.type
            },
            series: options.series,
        };

        var data = Highcharts.merge(true, tHC.themes[options.theme], data, options.config);
        console.log(data);
        var chart = new Highcharts.Chart(data);
        return chart;
    }

    tHC.draw.line = tHC.draw.default
    tHC.draw.area = tHC.draw.default

    tHC.themes.add = function(name, data)
    {
        tHC.themes[name] = data;
    }

    return tHC;
}());
