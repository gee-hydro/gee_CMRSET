/**
 * Copyright (c) 2021 Dongdong Kong. All rights reserved.
 * This work is licensed under the terms of the MIT license.
 * For a copy, see <https://opensource.org/licenses/MIT>.
 */
// var pkgs   = require('users/kongdd/public:pkgs.js');
var pkgs = {};

pkgs.rename_ls8 = function (img) {
    var img_others = img.select(
        ["B10", "B11"], ["LST1", "LST2"])
        .multiply(0.1).subtract(273.15); // K to degC
    var img_main = img.select(
        ["B1", "B2", "B3", "B4", "B5", "B6", "B7"],
        ["ultraBlue", "blue", "green", "red", "nir", "swir1", "swir2"]
    ).multiply(0.0001);
    var bands_all = ["ultraBlue", "blue", "green", "red", "nir", "swir1", "swir2",
        "LST1", "LST2", "sr_aerosol", "pixel_qa", "radsat_qa"];
    return img.select(["sr_aerosol", "pixel_qa", "radsat_qa"])
        .addBands([img_main, img_others])
        .select(bands_all);
};

/**
* Cloud and cloud shadow masks
*/
pkgs.maskClouds = function (image) {
    // Bits 3 and 5 are cloud shadow and cloud, respectively.
    var cloudShadowBitMask = (1 << 3);
    var cloudsBitMask = (1 << 5);
    // Get the pixel QA band.
    var qa = image.select('pixel_qa');
    // Both flags should be set to zero, indicating clear conditions.
    var mask = qa.bitwiseAnd(cloudShadowBitMask).eq(0)
        .and(qa.bitwiseAnd(cloudsBitMask).eq(0));
    return image.updateMask(mask);
};

/**
 * Further mask pixels using cloudscore value
 * @param {*} image 
 * 
 * @author
 * Catherine Ticehurst (CSIRO Land and Water)
 */
pkgs.maskScore = function (image) {
    var BlueScore = image.expression('(b("blue") - 0.1)/(0.2)');
    var RGBscore = image.expression('( (b("red") + b("blue") + b("green")) - 0.2) / (0.6)');
    var IRscore = image.expression('( (b("nir") + b("swir1") + b("swir2")) - 0.3) / (0.5)');
    var ndsi = image.expression('( b("green") - b("swir1") ) / ( b("green") + b("swir1") )');
    var NDSIscore = image.expression('( ndsi - 0.8 ) / (-0.2) ', { 'ndsi': ndsi });

    var score = BlueScore.min(RGBscore).min(IRscore).min(NDSIscore);
    var ImageMask = score.gt(0.6);
    return image.updateMask(ImageMask.eq(0));
};

pkgs.get_ls8 = function (options) {
    options = options || {};
    options.col = options.col || 'LANDSAT/LC08/C01/T1_SR';
    
    var col = ee.ImageCollection(options.col);
    if (options.period) {
        col = col.filterDate(options.period[0], options.period[1]);
    }
    if (options.geometry) {
        col = col.filterBounds(options.geometry);
    }
    return col.map(pkgs.rename_ls8).map(pkgs.maskClouds).map(pkgs.maskScore);
};

exports = pkgs;
// L8: { from: ['B6', 'B5', 'B4', 'B3', 'B2'], to: ['swir', 'nir', 'red', 'green', 'blue'] },
// 620-670nm, RED, sur_refl_b01
// 841-876nm, NIR, sur_refl_b02
// 459-479nm, BLUE, sur_refl_b03
// 1628-1652nm, SWIR, sur_refl_b06
// var img_ref = img.select(['sur_refl_b01', 'sur_refl_b02', 'sur_refl_b03', 'sur_refl_b06'])
//         .rename(['red', 'b('nir')', 'b('blue')', 'swir']).multiply(0.0001);

/** @example ----------------------------------------- */
// var x = pkgs.get_ls8({
//     period: ['2020-01-01', '2020-12-31']
// });
// print(x.limit(3));

// var col = get_ls8();
// var img = col.first();
// print(pkgs.addIndex(['NDVI', 'EVI'])(img))
// print(pkgs.addIndex('evi', true)(img))
