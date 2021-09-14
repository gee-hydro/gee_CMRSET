/**
 * Creates a color bar thumbnail image for use in legend from the given color 
 * palette.
 */
function makeColorBarParams(palette) {
    return {
        bbox: [0, 0, 1, 0.1],
        dimensions: '100x10',
        format: 'png',
        min: 0, max: 1,
        palette: palette,
    };
}

function legend_grad2(vis, title, IsPlot, position, fontSize) {
    fontSize = fontSize || "20px";
    title = title || "";
    position = position || "bottom-left"; // 'bottom-center'
    if (IsPlot === undefined) IsPlot = true;

    // Create the color bar for the legend.
    var colorBar = ui.Thumbnail({
        image: ee.Image.pixelLonLat().select(0),
        params: makeColorBarParams(vis.palette),
        style: { stretch: 'horizontal', margin: '0px 8px', maxHeight: '24px' },
    });

    // Create a panel with three numbers for the legend.
    var legendLabels = ui.Panel({
        widgets: [
            ui.Label(vis.min, { margin: '4px 8px' }),
            ui.Label(
                (vis.max / 2),
                { margin: '4px 8px', textAlign: 'center', stretch: 'horizontal' }),
            ui.Label(vis.max, { margin: '4px 8px' })
        ],
        layout: ui.Panel.Layout.flow('horizontal')
    });

    var legendTitle = ui.Label({
        value: title,
        style: { fontWeight: 'bold' }
    });

    // Add the legendPanel to the map.
    var lgd = ui.Panel([legendTitle, colorBar, legendLabels]);
    lgd.style().set({
        width: '400px',
        position: position
    });
    if (IsPlot) {
        Map.add(lgd);
    } else {
        return lgd;
    }
}

/** Visualization ----------------------------------------------------------- */
var vis_diff_rmi = { min: 0, max: 0.6, palette: ["ffffff", "86a192", "509791", "307296", "2c4484", "000066"] };
var title = 'Mean summer months difference between RMI with SWIR2 and RMI with SWIR1 (2014–2020)'
legend_grad2(vis_diff_rmi, title, true, "bottom-left")

// Map.addLayer(Diffmonths.select("RMIdiff"), vis, 'Summer RMI difference (2014 to 2020)', true);

// Mapping the mean difference between Kc with SWIR1 and GVMI with SWIR2
var vis_diff_kc = {
    min: 0, max: 0.6, palette: [
        'FFFFFF', 'CE7E45', 'DF923D', 'F1B555', 'FCD163', '99B718',
        '74A901', '66A000', '529400', '3E8601', '207401', '056201',
        '004C00', '023B01', '012E01', '011D01', '011301'
    ]
};
var title = 'Mean summer months difference between Kc with SWIR2 and Kc with SWIR1 (2014–2020)'
legend_grad2(vis_diff_kc, title, true, "bottom-right")
// Map.addLayer(Diffmonths.select("Kcdiff"), vis, 'Summer Kc difference (2014 to 2020)', true);

// bottom-center
var vis_diff_ETa = { min: 0, max: 300, palette: ['white', 'beige', 'green', 'yellow', 'red'] };
var title = 'Mean summer months difference between Irrest with SWIR2 and Irrest with SWIR1 (mm per month) (2014–2020)'
legend_grad2(vis_diff_ETa, title, true, "bottom-center")
// Map.addLayer(Diffmonths.select("Irrestdiff").mean(), vis_diff_ETa, 'Summer Irrest difference (2014 to 2020)', true)
