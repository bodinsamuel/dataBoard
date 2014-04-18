
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

        var s = document.createElement('script');
        s.type = 'text/javascript';
        s.onreadystatechange = function () {
            if (this.readyState == 'complete')
            {
                tHC.loaded[opts.name] = true;
                return tHC.unqueue(opts.name);
            }
        }
        s.onload = function(){
            tHC.loaded[opts.name] = true;
            return tHC.unqueue(opts.name);
        }
        s.src = opts.url;
        document.head.appendChild(s);
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
        var httpRequest = new XMLHttpRequest()
        httpRequest.onreadystatechange = function ()
        {
            if (httpRequest.readyState == 4 && httpRequest.status == "200")
            {
                callback(JSON.parse(httpRequest.response));
            }
            else if (httpRequest.status > "0" && httpRequest.status != "200")
            {
                throw "tHC: failed loading " + url;
            }
        }
        httpRequest.open('GET', url, false)
        httpRequest.send()
    }

    tHC.draw = function(opts)
    {
        var options = Highcharts.merge(true, {
            type: 'line',
            datasets: [],
            theme: 'default'
        }, opts);

        console.log(options);

        options.series = tHC.datasets(options.datasets);
        return tHC.draw[options.type](options);
    }

    tHC.datasets = function(datasets)
    {
        var series = [];
        var serie = {
            name: new Date().getTime(),
            data: []
        };

        for (var i = 0; i < datasets.length; i++)
        {
            if (datasets[i].url)
            {
                tHC.load.data(datasets[i].url, function(data) {
                    datasets[i].data = data;
                });
            }

            if (datasets[i].process)
                datasets[i].data = datasets[i].process(datasets[i].data);

            if (typeof datasets[i].datetime != 'undefined' && typeof datasets[i].data[0] != 'undefined')
            {
                datasets[i].pointInterval = datasets[i].datetime;
                datasets[i].pointStart = datasets[i].data[0][0];
            }

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
