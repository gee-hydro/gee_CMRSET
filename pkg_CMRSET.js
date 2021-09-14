/**
 * On the interchangeability of Landsat and MODIS data in the CMRSET
 * actual evapotranspiration model – technical note on “Monitoring 
 * Irrigation Using Landsat Observations and Climate Data over Regional 
 * Scales in the Murray-Darling Basin” by David Bretreger, 
 * In-Young Yeo, Greg Hancock and Garry Willgoose
 * Journal of Hydrology 2020,590.
 * http://doi.org/10.1016/j.jhydrol.2020.125356
 * 
 * ## 
 * Experiment 3.	A comparison of mean monthly Landsat 8 CMRSET’s actual
 * evapotranspiration ETa, GVMI, RMI and Kc using SWIR1 and SWIR2
 * in the computation of GVMI from Landsat surface reflectance data
 * based on Guerschman  et al.(2009, https://doi.org/10.1016/j.jhydrol.2009.02.013)
 * 
 * The hypothesis is that Kc and RMI computed with SWIR2 is  higher
 * than with SWIR1, therefore ETa is higher,
 * therefore supporting that Bretreger et al.'s (2020) implementation
 *  of CMRSET is flawed.
 * 
 * For ease of access this experiment uses potential evapotranspiration
 * and rainfall data from ERA5-Land Monthly Averaged - ECMWF Climate
 * Reanalysis available through Google Earth Engine
 */

/***********************************************************************
* Part 1 comparison of RMI and Kc using GVMI computed with the Landsat  8
* band SWIR1 and SWIR2   
************************************************************************/

// Setting dates and geographical Location
var ROI = ee.Geometry.Rectangle([138.525, -37.725, 152.525, -24.575]); //Murray Darling Basin

Map.setCenter(144.3406, -35.4261); // Around Wakool
Map.setZoom(11)



// Years for L8 as in Bretreger et al. (2020)
var date_begin = '2014-01-01',
    date_end = '2018-01-02';

var years = 4,
    months = 12;



// Landsat collection used in the comment

var Collection = 'LANDSAT/LC08/C01/T1_SR';

// ################################################
// Functions
// ################################################

/**
* Vegetation indices, RMI and crop coefficients
* Equations numberd as in Guerschman et al.(2009)
*/

// Function to compute the EVI

function evi(image) {

    // Enhanced vegetation index parameters
    var G = 2.5
    var C1 = 6.0
    var C2 = 7.5
    var L = 1

    // Equation (2)
    var EVI = image.expression(
        'EVI = G * ((NIR - red) / (NIR + C1*red - C2*blue + L))',
        {
            G: ee.Image(G),
            C1: ee.Image(C1),
            C2: ee.Image(C2),
            L: ee.Image(L),
            NIR: image.select('B5').multiply(0.0001),
            red: image.select('B4').multiply(0.0001),
            blue: image.select('B2').multiply(0.0001)
        })
        .max(ee.Image(0))
        .min(ee.Image(1))
    return image.addBands(EVI)

}

// Function to compute the NDVI

function ndvi(image) {


    var NDVI = image.expression(
        'NDVI =(NIR - red) / (NIR + red)',
        {

            NIR: image.select('B5').multiply(0.0001),
            red: image.select('B4').multiply(0.0001),
        })
        .max(ee.Image(0))
        .min(ee.Image(1));
    return image.addBands(NDVI);

}

// Function to compute the GVMI with SWIR1

function gvmi(image) {

    // Global vegetation moisture index parameters
    // Nill

    // Equation (3)
    var GVMI = image.expression(
        'GVMI = ((NIR + 0.1) - (SWIR1 + 0.02)) / ((NIR + 0.1) + (SWIR1 + 0.02))',
        {
            NIR: image.select('B5').multiply(0.0001),
            SWIR1: image.select('B6').multiply(0.0001)
        })
        .max(ee.Image(0))
        .min(ee.Image(1));

    return image.addBands(GVMI);

}

// Function to compute the GVMI with SWIR2 (GVMI2)
function gvmi2(image) {

    // Global vegetation moisture index parameters
    // Nill

    // Equation (13)
    var GVMI2 = image.expression(
        'GVMI2 = ((NIR + 0.1) - (SWIR2 + 0.02)) / ((NIR + 0.1) + (SWIR2 + 0.02))',
        {
            NIR: image.select('B5').multiply(0.0001),
            SWIR2: image.select('B7').multiply(0.0001),
        })
        .max(ee.Image(0))
        .min(ee.Image(1));

    return image.addBands(GVMI2);

}


// CMRSET indices (added by Tom Van Niel CSIRO Land and Water)

// Function to compute RMI

function rmi(image) {

    // Residual moisture index parameters

    var Krmi = 0.775;
    var Crmi = -0.076;

    // Equation (5)
    var RMI = image.expression(
        'RMI = GVMI - (Krmi * EVI + Crmi)',
        {
            GVMI: image.select('GVMI'),
            EVI: image.select('EVI'),
            Krmi: ee.Image(Krmi),
            Crmi: ee.Image(Crmi),
        })
        .max(ee.Image(0))
        .min(ee.Image(1));

    return image.addBands(RMI);

}

// Function to compute RMI with SWIR2 (RMI2)

function rmi2(image) {

    // Residual moisture index parameters

    var Krmi = 0.775;
    var Crmi = -0.076;

    // Equation (5)
    var RMI2 = image.expression(
        'RMI2 = GVMI2 - (Krmi * EVI + Crmi)',
        {
            GVMI2: image.select('GVMI2'),
            EVI: image.select('EVI'),
            Krmi: ee.Image(Krmi),
            Crmi: ee.Image(Crmi),
        })
        .max(ee.Image(0))
        .min(ee.Image(1));

    return image.addBands(RMI2);

}

// Function to compute EVI rescaled

function rescaled_evi(image) {

    // Re-scaled EVI parameters
    var EVImin = 0;
    var EVImax = 0.90;

    // Equation (8)
    var EVIr = image.expression(
        'EVIr = (EVI - EVImin) / (EVImax - EVImin)',
        {
            EVI: image.select('EVI'),
            EVImin: ee.Image(EVImin),
            EVImax: ee.Image(EVImax),
        })
        .max(ee.Image(0))
        .min(ee.Image(1));

    return image.addBands(EVIr);

}

// Function to compute the crop coefficent Kc


function crop_coefficient(image) {

    // Crop coefficient parameters
    var Kc_max = 0.680;
    var a = 14.12;
    var alpha = 2.482;
    var b = 7.991;
    var beta = 0.890;


    // Equation (11)
    var Kc = image.expression(
        'Kc = Kc_max * (1 - exp(-a*EVIr**alpha - b*RMI**beta ))',
        {
            EVIr: image.select('EVIr'),
            RMI: image.select('RMI'),
            Kc_max: ee.Image(Kc_max),
            a: ee.Image(a),
            alpha: ee.Image(alpha),
            b: ee.Image(b),
            beta: ee.Image(beta),
        });

    return image.addBands(Kc);

}

// Function to compute Kc with GVMI computed with SWIR2 (Kc2)


function crop_coefficient2(image) {

    // Crop coefficient parameters
    var Kc_max = 0.680;
    var a = 14.12;
    var alpha = 2.482;
    var b = 7.991;
    var beta = 0.890;


    // Equation (11)
    var Kc2 = image.expression(
        'Kc2 = Kc_max * (1 - exp(-a*EVIr**alpha - b*RMI2**beta ))',
        {
            EVIr: image.select('EVIr'),
            RMI2: image.select('RMI2'),
            Kc_max: ee.Image(Kc_max),
            a: ee.Image(a),
            alpha: ee.Image(alpha),
            b: ee.Image(b),
            beta: ee.Image(beta),
        });

    return image.addBands(Kc2);

}

function PInterception(image) {

    // Rainfall interception parameters

    var KE_max = 0.229;

    // Equation (10)
    var KE = ee.Image(KE_max).multiply(image.select('EVIr')).rename('KE');

    return image.addBands(KE);

}

// Function to compute Kc for Kamble (Kc_Kamble)


function kc_kamble(image) {

    // Crop coefficient parameters
    var a = -0.086;
    var b = 1.37;


    // Table 3. Bretreger et al. (2020)
    var Kc_Kamble = image.expression(
        'Kc_Kamble = a + b*NDVI',
        {
            NDVI: image.select('NDVI'),
            a: ee.Image(a),
            b: ee.Image(b),
        })
        .max(ee.Image(0));
    return image.addBands(Kc_Kamble);

}

// Function to compute Kc for Kamble (Kc_Kamble)


function kc_irrisat(image) {

    // Crop coefficient parameters
    var a = -0.1725;
    var b = 1.4571;


    // Table 3. Bretreger et al. (2020)
    var Kc_irrisat = image.expression(
        'Kc_irrisat = a + b*NDVI',
        {
            NDVI: image.select('NDVI'),
            a: ee.Image(a),
            b: ee.Image(b),
        })
        .max(ee.Image(0));
    return image.addBands(Kc_irrisat);

}




/**
* Cloud and cloud shadow masks
*/

function maskClouds(image) {
    // Bits 3 and 5 are cloud shadow and cloud, respectively.
    var cloudShadowBitMask = (1 << 3);
    var cloudsBitMask = (1 << 5);
    // Get the pixel QA band.
    var qa = image.select('pixel_qa');
    // Both flags should be set to zero, indicating clear conditions.
    var mask = qa.bitwiseAnd(cloudShadowBitMask).eq(0)
        .and(qa.bitwiseAnd(cloudsBitMask).eq(0));
    return image.updateMask(mask);
}

// Further mask pixels using cloudscore value (added by Catherine Ticehurst CSIRO Land and Water)
function ScoreMask(image) {
    var BlueScore = image.expression('(((blue/10000.0) - 0.1)/(0.2))', {
        'blue': image.select('B2'),
    });
    var RGBscore = image.expression('(((red/10000.0 + blue/10000.0 + green/10000.0) - 0.2)/(0.6))', {
        'blue': image.select('B2'),
        'green': image.select('B3'),
        'red': image.select('B4'),
    });
    var IRscore = image.expression('(((nir/10000.0 + swir1/10000.0 + swir2/10000.0) - 0.3)/(0.5))', {
        'nir': image.select('B5'),
        'swir1': image.select('B6'),
        'swir2': image.select('B7'),
    });
    var ndsi = image.expression('((green/10000.0) - (swir1/10000.0))/((green/10000.0) + (swir1/10000.0))', {
        'green': image.select('B3'),
        'swir1': image.select('B6'),
    });
    var NDSIscore = image.expression('(((ndsi) - 0.8)/(-0.2))', {
        'ndsi': ndsi,
    });
    var score = BlueScore.min(RGBscore).min(IRscore).min(NDSIscore);
    var ImageMask = score.gt(0.6);
    return image.updateMask(ImageMask.eq(0));
}



// ################################################
// Main program
// ################################################

// (1) Filtering clouds

var LS_collection = ee.ImageCollection(Collection).filterDate(date_begin, date_end).filterBounds(ROI);
// Cloud masking
var LS_masked = LS_collection.map(maskClouds).map(ScoreMask);

// (2) Apply vegetation indices to cloud masked image collection
var VIS = LS_masked.map(evi).map(gvmi).map(gvmi2).map(ndvi);

// (3) Images to monthly mean EVI and GVMI (with Landsat bands SWIR1 and SWIR2)

var VIs_monthly_list = ee.List.sequence(0, years * months).map(function (n) {
    var start = ee.Date(date_begin).advance(n, 'month'); // Starting date
    var end = start.advance(1, 'month'); // Step by each iteration

    // get collection filtered
    var imgColTemp = ee.ImageCollection(VIS).filterDate(start, end);
    // get properties of the first image between the start and end
    //var props = imgColTemp.first().toDictionary(imgColTemp.first().propertyNames());

    return imgColTemp.select(["EVI", "GVMI", "GVMI2", "NDVI"]).mean()
        .set('system:time_start', start.millis())
        .set('system:index', start.format("YYYYMM"));
    //.set(props); // set the properties
});

var VIs_monthly = ee.ImageCollection(VIs_monthly_list);

// (4) Computing RMI and Kc for the monthly data as in Bretreger et al. (2020)

//Apply CMRSET RMI and Kc
var Kc = VIs_monthly.map(rmi).map(rmi2).map(rescaled_evi).map(PInterception)
    .map(crop_coefficient).map(crop_coefficient2)
    .map(kc_kamble).map(kc_irrisat);

// Additional functions to calculate the differences for all monthly data

// Function to calculate the difference beween GVMI2 and GVMI
function gvmidiff(image) {
    var threshold = 0;
    var GVMIdiff = image.expression(
        'GVMIdiff=GVMI2-GVMI', {
        GVMI2: image.select('GVMI2'),
        GVMI: image.select('GVMI')
    });
    var ImageMaskOff = GVMIdiff.lte(threshold);
    return image.addBands(GVMIdiff).updateMask(ImageMaskOff.eq(0));

}


// Function to calculate the difference beween RMI2 and RMI
function rmidiff(image) {
    var threshold = 0;
    var RMIdiff = image.expression(
        'RMIdiff=RMI2-RMI', {
        RMI2: image.select('RMI2'),
        RMI: image.select('RMI')
    });
    var ImageMaskOff = RMIdiff.lte(threshold);

    return image.addBands(RMIdiff).updateMask(ImageMaskOff.eq(0));

}

// Function to calculate the difference beween Kc2 and Kc

function kcdiff(image) {
    var threshold = 0;
    var Kcdiff = image.expression(
        'Kcdiff=Kc2-Kc', {
        Kc2: image.select('Kc2'),
        Kc: image.select('Kc')
    });
    var ImageMaskOff = Kcdiff.lte(threshold);
    return image.addBands(Kcdiff).updateMask(ImageMaskOff.eq(0));

}


// (5) Differences for GVMI, RMI and Kc (need to add all bands combined)

var Diff = Kc.map(rmidiff).map(gvmidiff).map(kcdiff);

//print(Diff)


// Summarising the peak irrigation  months Dec to Feb

var months = ee.List.sequence(1, 2, 12);

var Diffmonths = ee.ImageCollection.fromImages(
    months.map(function (m) {
        return Diff.filter(ee.Filter.calendarRange(m, m, 'month'))
            .select('GVMIdiff', 'RMIdiff', 'Kcdiff').mean()
            .set('month', m);
    }).flatten());

// (6) Mapping the mean difference between RMI with SWIR1 and GVMI with SWIR2

var vis = { min: 0, max: 0.6, palette: ["ffffff", "86a192", "509791", "307296", "2c4484", "000066"] };


Map.addLayer(Diffmonths.select("RMIdiff"), vis, 'Summer RMI difference (2014 to 2020)', true);

/*
 * Legend setup
 */

// Creates a color bar thumbnail image for use in legend from the given color
// palette.
function makeColorBarParams(palette) {
    return {
        bbox: [0, 0, 1, 0.1],
        dimensions: '100x10',
        format: 'png',
        min: 0,
        max: 1,
        palette: palette,
    };
}

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
    value: 'Mean summer months difference between RMI with SWIR2 and RMI with SWIR1 (2014–2020)',
    style: { fontWeight: 'bold' }
});

// Add the legendPanel to the map.
var legendPanel = ui.Panel([legendTitle, colorBar, legendLabels]);
legendPanel.style().set({
    width: '400px',
    position: 'bottom-left'
});
Map.add(legendPanel);



// Mapping the mean difference between Kc with SWIR1 and GVMI with SWIR2


var vis = {
    min: 0, max: 0.6, palette: [
        'FFFFFF', 'CE7E45', 'DF923D', 'F1B555', 'FCD163', '99B718',
        '74A901', '66A000', '529400', '3E8601', '207401', '056201',
        '004C00', '023B01', '012E01', '011D01', '011301'
    ]
};


Map.addLayer(Diffmonths.select("Kcdiff"), vis, 'Summer Kc difference (2014 to 2020)', true);

/*
 * Legend setup
 */

// Creates a color bar thumbnail image for use in legend from the given color
// palette.
function makeColorBarParams(palette) {
    return {
        bbox: [0, 0, 1, 0.1],
        dimensions: '100x10',
        format: 'png',
        min: 0,
        max: 1,
        palette: palette,
    };
}

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
    value: 'Mean summer months difference between Kc with SWIR2 and Kc with SWIR1 (2014–2020)',
    style: { fontWeight: 'bold' }
});

// Add the legendPanel to the map.
var legendPanel = ui.Panel([legendTitle, colorBar, legendLabels]);
legendPanel.style().set({
    width: '400px',
    position: 'bottom-right'
});
Map.add(legendPanel);



/***********************************************************************
* Part 2 comparison of ETa computed with Kc using SWIR1 and SWIR2
* https://developers.google.com/earth-engine/datasets/catalog/ECMWF_ERA5_LAND_MONTHLY#bands
************************************************************************/

// PET (in m) and P (in m)

var ERA5 = ee.ImageCollection("ECMWF/ERA5_LAND/MONTHLY").select(["potential_evaporation", "total_precipitation"])
    .filterDate(date_begin, date_end).filterBounds(ROI);


//Join the ERA5 and the Kc image collections


var filter = ee.Filter.equals({
    leftField: 'system:time_start',
    rightField: 'system:time_start'
});

// Create the join.
var simpleJoin = ee.Join.inner();

// Inner join
var innerJoin = ee.ImageCollection(simpleJoin.apply(Kc, ERA5, filter))

var Kc_ERA = innerJoin.map(function (feature) {
    return ee.Image.cat(feature.get('primary'), feature.get('secondary'));
})

//print(Kc_ERA)

// (7) Calculation of ETa and Irrest using Kc with SWRI1 and SWIR2

// Function to calculate ETa using Kc with SWIR1 

function evapswir1(image) {

    // Actual evapotranspiration parameters
    // In ERA (mm/d) negative values indicate evaporation hence multply by -1
    // Equation (9)
    var ETa_SWIR1 = image.expression(
        'ETa_SWIR1 = Kc * (PET*(-1)*1000*30.25) + KE * (P*1000)',
        {
            Kc: image.select('Kc'),
            PET: image.select('potential_evaporation'),
            KE: image.select('KE'),
            P: image.select('total_precipitation'),
        })
    return image.addBands(ETa_SWIR1)

}


// Function to calculate ETa using Kc with SWIR2 

function evapswir2(image) {

    // Actual evapotranspiration parameters
    // In ERA (mm/d) negative values indicate evaporation hence multply by -1


    var ETa_SWIR2 = image.expression(
        'ETa_SWIR2 = Kc2 * (PET*(-1)*1000*30.25) + KE * (P*1000)',
        {
            Kc2: image.select('Kc2'),
            PET: image.select('potential_evaporation'),
            KE: image.select('KE'),
            P: image.select('total_precipitation'),
        })
    return image.addBands(ETa_SWIR2)

}

// Function to calculate ETa using Kc with Kamble 

function evapirrisat(image) {

    // Actual evapotranspiration parameters
    // In ERA (mm/d) negative values indicate evaporation hence multply by -1


    var ETa_irrisat = image.expression(
        'ETa_irrisat = Kc_irrisat * (PET*(-1)*1000*30.25)',
        {
            Kc_irrisat: image.select('Kc_irrisat'),
            PET: image.select('potential_evaporation'),
        })
    return image.addBands(ETa_irrisat)

}

// Function to calculate ETa using Kc with Kamble 

function evapkamble(image) {

    // Actual evapotranspiration parameters
    // In ERA (mm/d) negative values indicate evaporation hence multply by -1


    var ETa_Kamble = image.expression(
        'ETa_Kamble = Kc_Kamble * (PET*(-1)*1000*30.25)',
        {
            Kc_Kamble: image.select('Kc_Kamble'),
            PET: image.select('potential_evaporation'),
        })
    return image.addBands(ETa_Kamble)

}



var ETa = Kc_ERA.map(evapswir1).map(evapswir2).map(evapkamble).map(evapirrisat);

// Function to calculate Irrest using ETa with SWIR1

function irrestswir1(image) {


    // Equation (2) in Bretreger et al (2020)
    var IrrestSWIR1 = image.expression(
        'IrrestSWIR1 = ETa_SWIR1 - (P*1000)',
        {
            ETa_SWIR1: image.select('ETa_SWIR1'),
            P: image.select('total_precipitation'),

        })
        .max(ee.Image(0))

    return image.addBands(IrrestSWIR1)

}

// Function to calculate Irrest using ETa with SWIR2

function irrestswir2(image) {


    // Equation (2) in Bretreger et al (2020)
    var IrrestSWIR2 = image.expression(
        'IrrestSWIR2 = ETa_SWIR2 - (P*1000)',
        {
            ETa_SWIR2: image.select('ETa_SWIR2'),
            P: image.select('total_precipitation'),

        })
        .max(ee.Image(0));

    return image.addBands(IrrestSWIR2);

}

// Function to calculate Irrest using Kamble

function irrestkamble(image) {


    // Equation (2) in Bretreger et al (2020)
    var Irrest_Kamble = image.expression(
        'Irrest_Kamble = ETa_Kamble - (P*1000)',
        {
            ETa_Kamble: image.select('ETa_Kamble'),
            P: image.select('total_precipitation'),

        })
        .max(ee.Image(0))

    return image.addBands(Irrest_Kamble)

}


// Function to calculate Irrest using Irrisat

function irrestirrisat(image) {


    // Equation (2) in Bretreger et al (2020)
    var Irrest_irrisat = image.expression(
        'Irrest_irrisat = ETa_irrisat - (P*1000)',
        {
            ETa_irrisat: image.select('ETa_irrisat'),
            P: image.select('total_precipitation'),

        })
        .max(ee.Image(0))

    return image.addBands(Irrest_irrisat)

}


var Irrest = ETa.map(irrestswir1).map(irrestswir2).map(irrestirrisat)
    .map(irrestkamble);

//print('CMRSET inputs', Irrest);

// Function to calculate the difference beween Irrest_SWIR2 and Irrest_SWIR1

function irrestdiff(image) {
    var threshold = 0;
    var Irrestdiff = image.expression(
        'Irrestdiff=IrrestSWIR2-IrrestSWIR1', {
        IrrestSWIR2: image.select('IrrestSWIR2'),
        IrrestSWIR1: image.select('IrrestSWIR1'),
    });
    var ImageMaskOff = Irrestdiff.lte(threshold);
    return image.updateMask(ImageMaskOff.eq(0)).addBands(Irrestdiff);

}

var Irrestdiff = Irrest.map(irrestdiff);

// add a propoerty with the time formatted
Irrestdiff = Irrestdiff.map(function (image) {
    return image.set('timeFormat', image.date().format('YYYY-MM'))
})

print('Analysis inputs', Irrestdiff)



// Summarising the peak irrigation  months Dec to Feb

var months = ee.List.sequence(1, 2, 12);

var Diffmonths = ee.ImageCollection.fromImages(
    months.map(function (m) {
        return Irrestdiff.filter(ee.Filter.calendarRange(m, m, 'month'))
            .select('Irrestdiff').mean()
            .set('month', m);
    }).flatten());

//print(Diffmonths)

// (8) Mapping the mean difference between ETa with SWIR1 and Irrest with SWIR2
// for the three summer months (hence multiplying the mean by 3)

var vis = { min: 0, max: 300, palette: ['white', 'beige', 'green', 'yellow', 'red'] };

Map.addLayer(Diffmonths.select("Irrestdiff").mean(), vis, 'Summer Irrest difference (2014 to 2020)', true)

/*
 * Legend setup
 */

// Creates a color bar thumbnail image for use in legend from the given color
// palette.
function makeColorBarParams(palette) {
    return {
        bbox: [0, 0, 1, 0.1],
        dimensions: '100x10',
        format: 'png',
        min: 0,
        max: 1,
        palette: palette,
    };
}


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
    value: 'Mean summer months difference between Irrest with SWIR2 and Irrest with SWIR1 (mm per month) (2014–2020)',
    style: { fontWeight: 'bold' }
});

// Add the legendPanel to the map.
var legendPanel = ui.Panel([legendTitle, colorBar, legendLabels]);
legendPanel.style().set({
    width: '400px',
    position: 'bottom-center'
});
Map.add(legendPanel);


// Load IIOs boundaries

var IIOs = ee.FeatureCollection("projects/ee-jorgepena/assets/Irrigation_Land_use_NSW_2013/IIOs_NSW_2013_Land_use_irrigation");
var Wakool = IIOs.filter(ee.Filter.eq('Id', 2));

var shown = true; // true or false, 1 or 0 
var opacity = 0.7; // number [0-1]
var nameLayer = 'IIO Murray Wakool'; // string
var visParams = { color: 'grey' }; // dictionary: 
Map.addLayer(Wakool, visParams, nameLayer, shown, opacity);

var Irrest_SWIR12 = Irrestdiff.select(["Irrest_irrisat", "ETa_Kamble", "IrrestSWIR2", "IrrestSWIR1"]);

print(Irrest_SWIR12)

// Define the chart and print it to the console.
var chart =
    ui.Chart.image
        .series({
            imageCollection: Irrest_SWIR12,
            region: Wakool,
            reducer: ee.Reducer.mean(),
            scale: 30,
            xProperty: 'timeFormat'
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
            colors: ['red', 'orange', 'blue', 'cyan'],
            curveType: 'function'
        });
print(chart);
