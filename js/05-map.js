function makePlot5(data) {

    /**********************
    ***** BASIC SETUP *****
    **********************/

    // define constants
    const DURATION = 1000;
    const THEME_PURPLE = "#5D2BF0";
    const THEME_ORANGE = "#FF810F";
    const MAX_CIRCLE_SIZE = 10;

    // dynamic dimension sizing code adapted from
    // https://github.com/d3/d3-selection/issues/128
    const bbox = d3.select("#mapPlot").node().getBoundingClientRect()

    const width = bbox.width;
    const height = bbox.height;
    const margin = {top: 50, left: 50, right: 50, bottom: 50};

    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.bottom - margin.top;

    const svg = d3.select("#mapPlot").select("svg");

    var key = function(d) {
        return d.geoid;
    }

    /**************************
    ***** REMOVE OLD DATA *****
    **************************/

    var g = svg.selectAll("*").remove()

    /*************************
    ***** DATA WRANGLING *****
    *************************/


    /******************************
    ***** AREA & COLOR SCALES *****
    ******************************/

    // Extract min, max values from FeaturesCollection object
    // https://stackoverflow.com/questions/26232942/get-max-and-min-value-from-a-geojson
    // TODO: REPLACE THIS WITH WORKING REDUCE FUNCTION
    function computeDomain(data, key) {
        var max = -Infinity;
        var min = Infinity;
        for (var i = 0; i < data.length; i++) {

            if (data[i].properties.sun <= 0) {
                continue;
            }

            max = Math.max(data[i].properties[key], max);
            min = Math.min(data[i].properties[key], min);
        }
        return [min, max];
    }

    // circle color scale
    // interpolation code adapted from
    // http://bl.ocks.org/jfreyre/b1882159636cc9e1283a
    var colorDomain = computeDomain(data.features, 'sun');

    var colorScale = d3.scaleLinear()
        .domain(colorDomain)
        .interpolate(d3.interpolateHcl)
        .range([THEME_PURPLE, THEME_ORANGE]);

    // circle area scale
    var areaDomain = computeDomain(data.features, 'panels_per_10k');
    var areaScale = d3.scaleSqrt()
        .domain(areaDomain)
        .range([0, MAX_CIRCLE_SIZE])

    /******************
    ***** BASEMAP *****
    ******************/

    var path = d3.geoPath()
                 .projection(d3.geoAlbersUsa());

    const plot = svg.append("g")
         .attr("id", "plot")
         .attr("class", "map")
         .attr("transform", `translate(0, ${margin.bottom})`);

    // choropleth code adapted from Scott Murray's D3 book (p. 290)
    plot.selectAll("path")
        .data(data.features)
        .enter()
        .append("path")
        .filter(function(d) {return d.properties.postal != "AK";})
        .attr("d", path);

    /*************************
    ***** COUNTY CIRCLES *****
    *************************/

    // code for calculating centroids adapted from
    // https://bl.ocks.org/curran/55d327542393530662c3
    function getCentroid(d) {
        return path.centroid(d);
    }

    // Define div container for mouseover tooltips
    // Adapted from http://bl.ocks.org/d3noob/a22c42db65eb00d4e369
    var div = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .attr("opacity", 0);

    plot.selectAll(".centroid")
        .data(data.features)
        .enter()
        .append("circle")
        .filter(function(d) {return !isNaN(getCentroid(d)[0]);})
        .filter(function(d) {return d.properties.sun > 0;})
        .attr("class", "centroid")
        .attr("id", d => d.properties.GEOID)
        .attr("cx", d => getCentroid(d)[0])
        .attr("cy", d => getCentroid(d)[1])
        .attr("r", d => areaScale(d.properties.panels_per_10k))
        .attr("opacity", 0)
        .attr("fill", function(d) {
            var value = d.properties.sun;

            if (value) {
                return colorScale(value);
            } else {
                return "#DDDDDD";
            }
        })
        .on("mouseenter", function(d) {

            // highlight circle
            d3.select(this).attr("class", "centroid selectedPoint");

            // make tooltip visible
            div.style("opacity", 0.9)
                .html(`<strong>${d.properties.county_name}, ${d.properties.postal}</strong>
                    <br /> ${Math.floor(d.properties.panels_per_10k)}
                    solar panels <br /> per 10,000 residents`)
                .style("left", `${d3.event.pageX+20}px`)
                .style("top", `${d3.event.pageY-50}px`);

        })
        .on("mouseleave", function(d) {

            // un-highlight circle
            d3.select(this).attr("class", "centroid");

            // hide tooltip
            div.style("opacity", 0);

        });


    /*************************
    ***** TITLE, CAPTION *****
    *************************/

    // Create footer grouping
    const footer = svg.append("g")
        .attr("id", "footer");

    // Caption with data source
    footer.selectAll(".captionText")
        .data([{"label": "Data source: NREL (U.S. Dept of Energy), National Cancer Institute"}])
        .enter()
        .append("text")
        .text(function(d) {return d.label;})
        .attr("x", margin.left)
        .attr("y", height - 15)
        .attr("text-anchor", "start")
        .attr("class", "captionText")


    /************************
    ***** COLOR LEGEND  *****
    ************************/

    // code below adapted from examples at https://d3-legend.susielu.com/
    // colorScale already defined above

    svg.append("g")
        .attr("class", "colorLegend")
        .attr("transform", `translate(${margin.left}, ${1.05 * plotHeight})`);

    var colorLegend = d3.legendColor()
        .shapeWidth(40)
        .shapeHeight(7)
        .title("Avg. Solar Irradiance (kWh/m2/day)")
        .scale(colorScale)
        .orient("horizontal");

    svg.select(".colorLegend")
        .call(colorLegend)
        .attr("opacity", 0);

    /***********************
    ***** SIZE LEGEND  *****
    ***********************/

    svg.append("g")
        .attr("class", "sizeLegend")
        .attr("transform", `translate(${margin.left}, ${0.90 * plotHeight})`);

    var sizeLegend = d3.legendSize()
        .shape("circle")
        .title("Solar Panels (per 10K pop.)")
        .shapePadding(25)
        .labelOffset(15)
        .scale(areaScale)
        .orient("horizontal");

    svg.select(".sizeLegend")
        .call(sizeLegend)
        .attr("opacity", 0);


}
