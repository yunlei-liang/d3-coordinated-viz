/* D3 java script by Yunlei Liang, 2019 */

//First line of main.js...wrap everything in a self-executing anonymous function to move to local scope
(function(){

//pseudo-global variables
var attrArray = ["Pop", "GRP", "Unemployment", "Revenue", "ForestCoverage"];//list of attributes
var expressed = attrArray[0]; //initial attribute


//chart frame dimensions
var chartWidth = window.innerWidth * 0.45,
	chartHeight = 473,
	leftPadding = 1,
	rightPadding = 1,
	topBottomPadding = 5,
	chartInnerWidth = chartWidth - leftPadding - rightPadding,
	chartInnerHeight = chartHeight - topBottomPadding,
	translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

//create a scale to size bars proportionally to frame
var yScale = d3.scaleLinear()
	.range([443,0])
	.domain([0, 12]);
	
//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){

    //map frame dimensions
    var width = window.innerWidth * 0.5,
        height = 460;

    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

	var projection = d3.geoAlbers()
		.center([-112.73, 33.87])
		.rotate([180.00, 51.82, 0])
		.parallels([21.32, 59.62])
		.scale(671.56)
		.translate([width / 2, height / 2]);
	
	var path = d3.geoPath()
        .projection(projection);

    //use Promise.all to parallelize asynchronous data loading
    var promises = [];
    promises.push(d3.csv("data/data.csv")); //load attributes from csv
    promises.push(d3.json("data/data.topojson")); //load choropleth spatial data
    Promise.all(promises).then(callback);

    function callback(data){
		csvData = data[0];
		china = data[1];

        //place graticule on the map
        setGraticule(map, path);
	
	    //translate china TopoJSON
   		var province = topojson.feature(china, china.objects.data).features;
        //join csv data to GeoJSON enumeration units
        province = joinData(province, csvData);

        //create the color scale
        var colorScale = makeColorScale(csvData);
		
        //add enumeration units to the map
        setEnumerationUnits(province, map, path,colorScale);
        
        //add coordinated visualization to the map
    	setChart(csvData, colorScale);
		
		//create a selection window
		createDropdown(csvData);
		
		//add legend
		createLegend(csvData,interval);
    };
	
	
    
}; //end of setMap()

function setGraticule(map, path){
	//create graticule generator
	var graticule = d3.geoGraticule()
		.step([10, 10]); //place graticule lines every 10 degrees of longitude and latitude
		
	//create graticule background
	var gratBackground = map.append("path")
		.datum(graticule.outline()) //bind graticule background
		.attr("class", "gratBackground") //assign class for styling
		.attr("d", path) //project graticule        
	
	//create graticule lines
	var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
		.data(graticule.lines()) //bind graticule lines to each element to be created
		.enter() //create an element for each datum
		.append("path") //append each element to the svg as a path element
		.attr("class", "gratLines") //assign class for styling
		.attr("d", path); //project graticule lines
};

function joinData(province, csvData){
	//loop through csv to assign each set of csv attribute values to geojson region
	for (var i=0; i<csvData.length; i++){
		var csvRegion = csvData[i]; //the current region
		var csvKey = csvRegion.Name; //the CSV primary key

		//loop through geojson regions to find correct region
		for (var a=0; a<province.length; a++){

			var geojsonProps = province[a].properties; //the current region geojson properties
			var geojsonKey = geojsonProps.Name; //the geojson primary key

			//where primary keys match, transfer csv data to geojson properties object
			if (geojsonKey == csvKey){

				//assign all attributes and values
				attrArray.forEach(function(attr){
					var val = parseFloat(csvRegion[attr]); //get csv attribute value
					geojsonProps[attr] = val; //assign attribute and value to geojson properties
				});
			};
		};
	};

    return province;
};

function setEnumerationUnits(province, map, path,colorScale){
	//add China regions to map
	var Chinaprovince = map.selectAll(".Chinaprovince")
		.data(province)
		.enter()
		.append("path")
		.attr("class", function(d){
			return "Chinaprovince " + d.properties.Name;
		})
		.attr("d", path)
        .style("fill", function(d){
            return choropleth(d.properties, colorScale);
        })
		.on("mouseover", function(d){
            highlight(d.properties);
        })
		.on("mouseout", function(d){
            dehighlight(d.properties);
        })
		.on("mousemove", moveLabel);;

	var desc = Chinaprovince.append("desc")
        .text('{"stroke": "#000", "stroke-width": "0.5px"}');


};
//function to create color scale generator
function makeColorScale(data){
    var colorClasses = [
        "#fee5d9",
        "#fcae91",
        "#fb6a4a",
        "#de2d26",
        "#a50f15"
    ];

    //create color scale generator
    var colorScale = d3.scaleQuantile()
        .range(colorClasses);

    //build array of all values of the expressed attribute
    var domainArray = [];
    for (var i=0; i<data.length; i++){
        var val = parseFloat(data[i][expressed]);
        domainArray.push(val);
    };

    //assign array of expressed values as scale domain
    colorScale.domain(domainArray);
	interval = colorScale.quantiles();
	
    return colorScale;
};

//function to test for data value and return color
function choropleth(props, colorScale){
    //make sure attribute value is a number
    var val = parseFloat(props[expressed]);
    //if attribute value exists, assign a color; otherwise assign gray
    if (typeof val == 'number' && !isNaN(val)){
        return colorScale(val);
    } else {
        return "#CCC";
    };
};

//function to create coordinated bar chart
function setChart(csvData, colorScale){
    //chart frame dimensions

    //create a second svg element to hold the bar chart
    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");

    //create a rectangle for chart background fill
    var chartBackground = chart.append("rect")
        .attr("class", "chartBackground")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);
                
    //set bars for each province
    var bars = chart.selectAll(".bar")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a, b){
            return a[expressed]-b[expressed]
        })
        .attr("class", function(d){
            return "bar " + d.Name;
        })
        .attr("width", chartWidth / csvData.length - 1)
		.on("mouseover", highlight)
        .on("mouseout", dehighlight)
		.on("mousemove", moveLabel);;
	
    var desc = bars.append("desc")
        .text('{"stroke": "none", "stroke-width": "0px"}');
		
    //annotate bars with attribute value text
   /* var numbers = chart.selectAll(".numbers")
        .data(csvData)
        .enter()
        .append("text")
        .sort(function(a, b){
            return a[expressed]-b[expressed]
        })
        .attr("class", function(d){
            return "numbers " + d.ID;
        })
        .attr("text-anchor", "middle")
        .attr("x", function(d, i){
            var fraction = chartWidth / csvData.length;
            return i * fraction + (fraction - 1) / 2;
        })
        .attr("y", function(d){
            return chartHeight - yScale(parseFloat(d[expressed])) + 15;
        })
        .text(function(d){
            return d[expressed];
        });*/
        
    var chartTitle = chart.append("text")
        .attr("x", 20)
        .attr("y", 40)
        .attr("class", "chartTitle")
        .text("Number of Variable " + expressed + " in each region");
        
    //create vertical axis generator
    var yAxis = d3.axisLeft()
        .scale(yScale);

    //place axis
    var axis = chart.append("g")
        .attr("class", "axis")
        .attr("transform", translate)
        .call(yAxis);

    //create frame for chart border
    var chartFrame = chart.append("rect")
        .attr("class", "chartFrame")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);
	
	//set bar positions, heights and colors
	updateChart(bars, csvData.length, colorScale);
};

//function to create a dropdown menu for attribute selection
function createDropdown(csvData){
    //add select element
    var dropdown = d3.select("body")
        .append("select")
        .attr("class", "dropdown")
        .on("change", function(){
            changeAttribute(this.value, csvData)
        });

    //add initial option
    var titleOption = dropdown.append("option")
        .attr("class", "titleOption")
        .attr("disabled", "true")
        .text("Select Attribute");

    //add attribute name options
    var attrOptions = dropdown.selectAll("attrOptions")
        .data(attrArray)
        .enter()
        .append("option")
        .attr("value", function(d){ return d })
        .text(function(d){ return d });
};

//dropdown change listener handler
function changeAttribute(attribute, csvData){
    //change the expressed attribute
    expressed = attribute;

    //recreate the color scale
    var colorScale = makeColorScale(csvData);
	interval = colorScale.quantiles();

    //recolor enumeration units
    var Chinaprovince = d3.selectAll(".Chinaprovince")
	    .transition()
        .duration(1000)
        .style("fill", function(d){
            return choropleth(d.properties, colorScale)
        });
		
    //re-sort, resize, and recolor bars
    var bars = d3.selectAll(".bar")
        //re-sort bars
        .sort(function(a, b){
            return b[expressed] - a[expressed];
        })
		.transition() //add animation
        .delay(function(d, i){
            return i * 20
        })
        .duration(500);
			
	d3.select(".legend")
        .remove();
	createLegend(csvData,interval);
	updateChart(bars, csvData.length, colorScale);

};

//function to position, size, and color bars in chart
function updateChart(bars, n, colorScale){
    //position bars
    bars.attr("x", function(d, i){
            return i * (chartInnerWidth / n) + leftPadding;
        })
        //size/resize bars
        .attr("height", function(d, i){
            return 463 - yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d, i){
            return yScale(parseFloat(d[expressed])) + topBottomPadding;
        })
        //color/recolor bars
        .style("fill", function(d){
            return choropleth(d, colorScale);
        });
		
    var chartTitle = d3.select(".chartTitle")
        .text("Number of Variable " + expressed + " in each region");
};

//function to highlight enumeration units and bars
function highlight(props){
    //change stroke
    var selected = d3.selectAll("."+props.Name)
        .style("stroke", "blue")
        .style("stroke-width", "2");
	setLabel(props);
};

//function to reset the element style on mouseout
function dehighlight(props){
    var selected = d3.selectAll("." + props.Name)
        .style("stroke", function(){
            return getStyle(this, "stroke")
        })
        .style("stroke-width", function(){
            return getStyle(this, "stroke-width")
        });

    function getStyle(element, styleName){
        var styleText = d3.select(element)
            .select("desc")
            .text();

        var styleObject = JSON.parse(styleText);

        return styleObject[styleName];
    };
	
	d3.select(".infolabel")
        .remove();
};

//function to create dynamic label
function setLabel(props){
    //label content
    var labelAttribute = "<h1>" + props[expressed] +
        "</h1><b>" + expressed + "</b>";

    //create info label div
    var infolabel = d3.select("body")
        .append("div")
        .attr("class", "infolabel")
        .attr("id", props.Name + "_label")
        .html(labelAttribute);

    var regionName = infolabel.append("div")
        .attr("class", "labelname")
        .html(props.Name);
};

//function to move info label with mouse
function moveLabel(){
    //get width of label
    var labelWidth = d3.select(".infolabel")
        .node()
        .getBoundingClientRect()
        .width;

    //use coordinates of mousemove event to set label coordinates
    var x1 = d3.event.clientX + 10,
        y1 = d3.event.clientY - 75,
        x2 = d3.event.clientX - labelWidth - 10,
        y2 = d3.event.clientY + 25;

    //horizontal label coordinate, testing for overflow
    var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1; 
    //vertical label coordinate, testing for overflow
    var y = d3.event.clientY < 75 ? y2 : y1; 

    d3.select(".infolabel")
        .style("left", x + "px")
        .style("top", y + "px");

};

//create a legend
function createLegend(csvData,interval){
	
	var legend = d3.select("body")
		.append("svg")
		.attr("width", 240)
		.attr("height", 40)
		.attr("class", "legend");
	//set the color classes
	var colorClasses = [
        "#fee5d9",
        "#fcae91",
        "#fb6a4a",
        "#de2d26",
        "#a50f15"
    ];
	
	//get the interval
	var legend_labels = interval;
	
	
	for (var i = 0; i <4; i++) {
		legend_labels[i]=legend_labels[i].toFixed(2);
		};
	
	
	var ls_w = 20, ls_h = 20;
	
	//generate the color part and the correspond text
	for (var i = 0; i <=4; i++) {
		legend.append("svg:rect")
		.attr("x", i*40)
		.attr("height", 10)
		.attr("width", 40)
		.style("fill",colorClasses[i]);//color
		
		if (i==0){
			legend.append("text")
			.attr("x", 0)
			.attr("y",30)
			.text("0");
		};
		
		legend.append("text")
		.attr("x", i*40+20)
		.attr("y",30)
		.text(legend_labels[i]);
		};
	};



})(); //last line of main.js







