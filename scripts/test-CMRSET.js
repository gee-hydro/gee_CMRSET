var pkgs = require('users/kongdd/pkgs:pkgs.js');

function maskDiff(img) { return img.updateMask(img.gt(0)); }

/**
 * On the interchangeability of Landsat and MODIS data in the CMRSET actual
 *    evapotranspiration model – technical note on “Monitoring Irrigation Using
 *    Landsat Observations and Climate Data over Regional Scales in the
 *    Murray-Darling Basin” by David Bretreger, In-Young Yeo, Greg Hancock and
 *    Garry Willgoose. Journal of Hydrology 2020,590.
 *    http://doi.org/10.1016/j.jhydrol.2020.125356
 * 
 * ## Experiment 3:
 * 
 * A comparison of mean monthly Landsat 8 CMRSET’s actual evapotranspiration
 *    ETa, GVMI, RMI and Kc using SWIR1 and SWIR2 in the computation of GVMI
 *    from Landsat surface reflectance data based on Guerschman  et al.(2009,
 *    https://doi.org/10.1016/j.jhydrol.2009.02.013)
 *
 * The hypothesis is that Kc and RMI computed with SWIR2 is higher than with
 *    SWIR1, therefore ETa is higher, therefore supporting that Bretreger et
 *    al.'s (2020) implementation of CMRSET is flawed.
 * 
 * For ease of access this experiment uses potential evapotranspiration and
 *    rainfall data from ERA5-Land Monthly Averaged - ECMWF Climate Reanalysis
 *    available through Google Earth Engine
 */

/***********************************************************************
 * Part 1 comparison of RMI and Kc using GVMI computed with the Landsat 8
 * band SWIR1 and SWIR2   
 ************************************************************************/
var ROI = ee.Geometry.Rectangle([138.525, -37.725, 152.525, -24.575]); //Murray Darling Basin
Map.setCenter(144.3406, -35.4261); // Around Wakool
Map.setZoom(11);

// Years for L8 as in Bretreger et al. (2020)
var date_begin = '2014-01-01';
var date_end = '2018-01-02';
var years = 4;
var months = 12;

// (1) Filtering clouds
var LS_masked = pkgs.get_ls8({
    col: 'LANDSAT/LC08/C01/T1_SR',
    period: [date_begin, date_end],
    geometry: ROI
});
// print("ALL available images: ", LS_masked.size());

// (2) Apply vegetation indices to cloud masked image collection
var VIS = LS_masked.map(pkgs.mutate(["EVI", "NDVI", "GVMI", "GVMI2"]));
print(VIS.limit(3));

// (3) Images to monthly mean EVI and GVMI (with Landsat bands SWIR1 and SWIR2)
var VIs_monthly_list = ee.List.sequence(0, years * months).map(function (n) {
    var start = ee.Date(date_begin).advance(n, 'month'); // Starting date
    var end = start.advance(1, 'month'); // Step by each iteration
    return VIS.filterDate(start, end)
        .select(["EVI", "GVMI", "GVMI2", "NDVI"]).mean()
        .set('system:time_start', start.millis())
        .set('system:index', start.format("YYYYMM"));
});
var VIs_monthly = ee.ImageCollection(VIs_monthly_list);

// (4) Computing RMI and Kc for the monthly data as in Bretreger et al. (2020)
// Apply CMRSET RMI and Kc
var Kc = VIs_monthly
    .map(pkgs.mutate(['RMI', 'RMI2',
        'rescaled_evi', 'PInterception',
        'Kc', 'Kc2',
        'Kc_kamble', 'Kc_irrisat'
    ], { include_origin: true })); //
print('Kc', Kc.limit(2));

var Figure1;
Figure1 = true;
if (Figure1) {
    // Differences for GVMI, RMI and Kc
    var diffcol_Kc = Kc.map(
        pkgs.transform([
            'GVMI = b("GVMI2") - b("GVMI")',
            'RMI = b("RMI2") - b("RMI")',
            'Kc = b("Kc2") - b("Kc")'
            // 'irrest = b("irrest_swir2") - b("irrest_swir1")'
        ], { func: maskDiff }));
    print('diffcol_Kc', diffcol_Kc.limit(2));

    // Summarising the peak irrigation  months Dec to Feb
    var months = ee.List.sequence(1, 2, 12);
    var Diffmonths = ee.ImageCollection.fromImages(
        months.map(function (m) {
            return diffcol_Kc.filter(ee.Filter.calendarRange(m, m, 'month'))
                .mean()
                .set('month', m);
        }).flatten());

    /** Figure 1.1: Mapping the mean difference between RMI with SWIR1 and GVMI with SWIR2 */
    var vis_diff_rmi = { min: 0, max: 0.6, palette: ["ffffff", "86a192", "509791", "307296", "2c4484", "000066"] };
    var title = 'Mean summer months difference between RMI with SWIR2 and RMI with SWIR1 (2014–2020)';
    pkgs.legend_horz(vis_diff_rmi, title, true, "bottom-left");
    Map.addLayer(Diffmonths.select("RMI"), vis_diff_rmi, 'Summer RMI difference (2014 to 2020)', true);

    /** Figure 1.2: Mapping the mean difference between Kc with SWIR1 and GVMI with SWIR2 */
    var vis_diff_kc = {
        min: 0, max: 0.6, palette: [
            'FFFFFF', 'CE7E45', 'DF923D', 'F1B555', 'FCD163', '99B718',
            '74A901', '66A000', '529400', '3E8601', '207401', '056201',
            '004C00', '023B01', '012E01', '011D01', '011301']
    };
    var title = 'Mean summer months difference between Kc with SWIR2 and Kc with SWIR1 (2014–2020)';
    pkgs.legend_horz(vis_diff_kc, title, true, "bottom-right");
    Map.addLayer(Diffmonths.select("Kc"), vis_diff_kc, 'Summer Kc difference (2014 to 2020)', true);
}


/***********************************************************************
* Part 2 comparison of ETa computed with Kc using SWIR1 and SWIR2
* https://developers.google.com/earth-engine/datasets/catalog/ECMWF_ERA5_LAND_MONTHLY#bands
************************************************************************/
var Figure2;
Figure2 = true;
if (Figure2) {
    // PET (in m) and P (in m)
    var col_era5 = ee.ImageCollection("ECMWF/ERA5_LAND/MONTHLY")
        .select(["potential_evaporation", "total_precipitation"])
        .filterDate(date_begin, date_end).filterBounds(ROI);

    var Kc_ERA = pkgs.InnerJoin(Kc, col_era5);
    var ETa = Kc_ERA.map(pkgs.mutate([
        'ETa_swir1', 'ETa_swir2',
        'ETa_kamble', 'ETa_irrisat',
        'irrest_swir1', 'irrest_swir2',
        'irrest_irrisat', 'irrest_kamble'
    ]));
    // print('ETa', ETa.limit(2));

    var diffcol_Irrest = ETa.map(
        pkgs.transform([
            'irrest = b("irrest_swir2") - b("irrest_swir1")'
        ], { func: maskDiff }));
    print('diffcol_Irrest: ', diffcol_Irrest.limit(2));

    // Summarising the peak irrigation  months Dec to Feb
    var months = ee.List.sequence(1, 2, 12);
    var Diffmonths = ee.ImageCollection.fromImages(
        months.map(function (m) {
            return diffcol_Irrest.filter(ee.Filter.calendarRange(m, m, 'month'))
                .mean()
                .set('month', m);
        }).flatten());

    // (8) Mapping the mean difference between ETa with SWIR1 and Irrest with SWIR2
    // for the three summer months (hence multiplying the mean by 3)
    var vis_diff_ETa = { min: 0, max: 300, palette: ['white', 'beige', 'green', 'yellow', 'red'] };
    var title = 'Mean summer months difference between Irrest with SWIR2 and Irrest with SWIR1 (mm per month) (2014–2020)';
    pkgs.legend_horz(vis_diff_ETa, title, true, "bottom-center")
    Map.addLayer(Diffmonths.select("irrest").mean(),
        vis_diff_ETa, 'Summer Irrest difference (2014 to 2020)', true);


    // Figure 2.2: variation across time ---------------------------------------
    var IIOs = ee.FeatureCollection("projects/ee-jorgepena/assets/Irrigation_Land_use_NSW_2013/IIOs_NSW_2013_Land_use_irrigation");
    var Wakool = IIOs.filter(ee.Filter.eq('Id', 2));
    Map.addLayer(Wakool, { color: 'grey' }, 'IIO Murray Wakool', true, 0.7); // shown, opacity

    var Irrest_SWIR12 = ETa.select(
        ["irrest_irrisat", "ETa_kamble", "irrest_swir2", "irrest_swir1"]);
    print('Irrest_SWIR12', Irrest_SWIR12.limit(2));

    // Define the chart and print it to the console.
    var chart = ui.Chart.image
        .series({
            imageCollection: Irrest_SWIR12,
            region: Wakool,
            reducer: ee.Reducer.mean(),
            scale: 30,
            xProperty: 'date'
        })
        .setSeriesNames(['IrriSAT', 'Kamble', "CMRSET with SWIR2", "CMRSET with SWIR1"])
        .setOptions({
            title: 'IIO2 Murray Irrigation Wakool (West)',
            hAxis: { title: 'Date', titleTextStyle: { italic: false, bold: true } },
            vAxis: {
                title: 'Irrest (mm per month)',
                titleTextStyle: { italic: false, bold: true }
            },
            lineWidth: 5,
            colors: ['red', 'orange', 'blue', 'cyan'], curveType: 'function'
        });
    print(chart);
}
