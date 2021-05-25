var stacked_plot = document.getElementById('stacked_plot')

var margin = {top: 20, right: 20, bottom: 30, left: 40},
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

var x = d3.scale.ordinal()
    .rangeRoundBands([0, width], .1);

var y = d3.scale.linear()
    .rangeRound([height, margin.top]);

var color = d3.scale.ordinal()
    .range(["#98abc5", "#8a89a6", "#7b6888", "#6b486b", "#a05d56", "#d0743c", "#ff8c00"]);

var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom");

var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left")
    .tickFormat(d3.format(".2s"));

var svg = d3.select("#d3plot").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var active_link = "0"; //to control legend selections and hover
var legendClicked; //to control legend selections
var legendClassArray = []; //store legend classes to select bars in plotSingle()
var legendClassArray_orig = []; //orig (with spaces)
var sortDescending; //if true, bars are sorted by height in descending order
var restoreXFlag = false; //restore order of bars back to original


//disable sort checkbox
d3.select("label")             
  .select("input")
  .property("disabled", true)
  .property("checked", false); 

d3.csv("https://raw.githubusercontent.com/hasansalimkanmaz/data-visualization-course-assignment/main/datasets/wellbeing_by_country_2.csv", function(error, data) {
  if (error) throw error;

  color.domain(d3.keys(data[0]).filter(function(key) { return key !== "State"; }));

  data.forEach(function(d) {
    var mystate = d.State; //add to stock code
    var y0 = 0;
    //d.ag = color.domain().map(function(name) { return {name: name, y0: y0, y1: y0 += +d[name]}; });
    d.ag = color.domain().map(function(name) {
      //return { mystate:mystate, name: name, y0: y0, y1: y0 += +d[name]}; });
      const out = { 
        mystate:mystate, 
        name: name, 
        y0: y0, 
        y1: y0 += +d[name], 
        value: +d[name],
      }; 
      return out
    });
    d.total = d.ag[d.ag.length - 1].y1;    
  });

  //Sort totals in descending order
  data.sort(function(a, b) { return b.total - a.total; });  

  x.domain(data.map(function(d) { return d.State; }));
  y.domain([0, d3.max(data, function(d) { return d.total; })]);

  svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

  svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
    .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end");
      //.text("Population");

  var state = svg.selectAll(".state")
      .data(data)
    .enter().append("g")
      .attr("class", "g")
      .attr("transform", function(d) { return "translate(" + "0" + ",0)"; });
      //.attr("transform", function(d) { return "translate(" + x(d.State) + ",0)"; })

   height_diff = 0;  //height discrepancy when calculating h based on data vs y(d.y0) - y(d.y1)
   state.selectAll("rect")
      .data(function(d) {
        return d.ag; 
      })
    .enter().append("rect")
      .attr("width", x.rangeBand())
      .attr("y", function(d) {
        return y(d.y1);
      })
      .attr("x",function(d) { //add to stock code
          return x(d.mystate)
        })
      .attr("height", function(d) {       
        return y(d.y0) - y(d.y1);
      })
      .attr("class", function(d) {        
        classLabel = d.name.replace(/\s/g, ''); //remove spaces
        return "bars class" + classLabel;
      })
      .style("fill", function(d) { return color(d.name); });

  state.selectAll("rect")
       .on("mouseover", function(d){

          var delta = d.y1 - d.y0;
          var xPos = parseFloat(d3.select(this).attr("x"));
          var yPos = parseFloat(d3.select(this).attr("y"));
          var height = parseFloat(d3.select(this).attr("height"))

          d3.select(this).attr("stroke","blue").attr("stroke-width",0.8);

          svg.append("text")
          .attr("x",xPos)
          .attr("y",yPos +height/2)
          .attr("class","tooltip")
          .text(d.name +": "+ delta); 
          
       })
       .on("mouseout",function(){
          svg.select(".tooltip").remove();
          d3.select(this).attr("stroke","pink").attr("stroke-width",0.2);                
        });


  var legend = svg.selectAll(".legend")
      .data(color.domain().slice().reverse())
    .enter().append("g")
      .attr("class", function (d) {
        legendClassArray.push(d.replace(/\s/g, '')); //remove spaces
        legendClassArray_orig.push(d); //remove spaces
        return "legend";
      })
      .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

  //reverse order to match order in which bars are stacked    
  legendClassArray = legendClassArray.reverse();
  legendClassArray_orig = legendClassArray_orig.reverse();

  legend.append("rect")
      .attr("x", width - 18)
      .attr("width", 18)
      .attr("height", 18)
      .style("fill", color)
      .attr("id", function (d, i) {
        return "id" + d.replace(/\s/g, '');
      })
      .on("mouseover",function(){        

        if (active_link === "0") d3.select(this).style("cursor", "pointer");
        else {
          if (active_link.split("class").pop() === this.id.split("id").pop()) {
            d3.select(this).style("cursor", "pointer");
          } else d3.select(this).style("cursor", "auto");
        }
      })
      .on("click",function(d){        

        if (active_link === "0") { //nothing selected, turn on this selection
          d3.select(this)           
            .style("stroke", "black")
            .style("stroke-width", 2);

            active_link = this.id.split("id").pop();
            plotSingle(this);

            //gray out the others
            for (i = 0; i < legendClassArray.length; i++) {
              if (legendClassArray[i] != active_link) {
                d3.select("#id" + legendClassArray[i])
                  .style("opacity", 0.5);
              } else sortBy = i; //save index for sorting in change()
            }

            //enable sort checkbox
            d3.select("label")
              .select("input")
              .property("disabled", false)
            d3.select("label").style("color", "black")
            //sort the bars if checkbox is clicked            
            d3.select("input").on("change", change);  
           
        } else { //deactivate
          if (active_link === this.id.split("id").pop()) {//active square selected; turn it OFF
            d3.select(this)           
              .style("stroke", "none");
            
            //restore remaining boxes to normal opacity
            for (i = 0; i < legendClassArray.length; i++) {              
                d3.select("#id" + legendClassArray[i])
                  .style("opacity", 1);
            }

            
            if (d3.select("label").select("input").property("checked")) {              
              restoreXFlag = true;
            }
            
            //disable sort checkbox
            d3.select("label")
              .style("color", "#D8D8D8")
              .select("input")
              .property("disabled", true)
              .property("checked", false);   


            //sort bars back to original positions if necessary
              change();            

            //y translate selected category bars back to original y posn
            restorePlot(d);

            active_link = "0"; //reset
          }

        } //end active_link check
                          
                                
      });

  legend.append("text")
      .attr("x", width - 24)
      .attr("y", 9)
      .attr("dy", ".35em")
      .style("text-anchor", "end")
      .text(function(d) { return d; });

  // restore graph after a single selection
  function restorePlot(d) {
    //restore graph after a single selection
    d3.selectAll(".bars:not(.class" + class_keep + ")")
          .transition()
          .duration(750)
          .delay(function() {
            if (restoreXFlag) return 2000;
            else return 750;
          })
          .attr("width", x.rangeBand()) //restore bar width
          .style("opacity", 1);

    //translate bars back up to original y-posn
    d3.selectAll(".class" + class_keep)
      // .attr("x", function(d) { return x(d.mystate); })
      .transition()
      .duration(1000)
      .delay(function () {
        if (restoreXFlag) return 1000; //bars have to be restored to orig posn
        else return 0;
      })
      .attr("y", function(d) {
        return y(d.y1); 
      });

    //reset
    restoreXFlag = false;
  }

  // plot only a single legend selection
  function plotSingle(d) {
        
    class_keep = d.id.split("id").pop();
    idx = legendClassArray.indexOf(class_keep);    
       
    //erase all but selected bars by setting opacity to 0
    d3.selectAll(".bars:not(.class" + class_keep + ")")
          .transition()
          .duration(1000)
          .attr("width", 0) // use because svg has no zindex to hide bars so can't select visible bar underneath
          .style("opacity", 0);

    //lower the bars to start on x-axis  
    state.selectAll("rect").forEach(function (d, i) {        
    
      //get height and y posn of base bar and selected bar
      h_keep = d3.select(d[idx]).attr("height");
      y_keep = d3.select(d[idx]).attr("y");  

      h_base = d3.select(d[0]).attr("height");
      y_base = d3.select(d[0]).attr("y");    

      h_shift = h_keep - h_base;
      y_new = y_base - h_shift;

      //reposition selected bars
      d3.select(d[idx])
        .transition()
        .ease("bounce")
        .duration(1000)
        .delay(750)
        .attr("y", y_new);
    })
  }

  //adapted change() fn in http://bl.ocks.org/mbostock/3885705
  function change() {

    if (this.checked) sortDescending = true;
    else sortDescending = false;

    colName = legendClassArray_orig[sortBy];

    x.domain(data.sort(sortDescending
        ? function(a, b) { return b[colName] - a[colName]; }
        : function(a, b) { return b.total - a.total; })
        .map(function(d,i) { return d.State; }));

    
    var delay = function(d, i) { return i * 20; };

    //sort bars
    state.selectAll("rect")
      .transition()
      .duration(750)
      .delay(delay)
      .attr("x", function(d) {      
        return x(d.mystate); 
      });      
    
    //sort x-labels accordingly    
    svg.select(".x.axis")
        .transition()
        .duration(750)
        .delay(delay)
          .call(xAxis);
  }
});