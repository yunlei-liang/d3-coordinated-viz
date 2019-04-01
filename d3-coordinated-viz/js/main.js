/* D3 java script by Yunlei Liang, 2019 */

//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){

    //map frame dimensions
    var width = 960,
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
	
	    //translate europe TopoJSON
   		var province = topojson.feature(china, china.objects.data).features;
        console.log(csvData);
        console.log(province);
        
        //add China regions to map
        var Chinaprovince = map.selectAll(".Chinaprovince")
            .data(province)
            .enter()
            .append("path")
            .attr("class", function(d){
                return "Chinaprovince " + d.properties.ID_1;
            })
            .attr("d", path);
            
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
};






