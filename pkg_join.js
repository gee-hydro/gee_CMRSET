/**
 * Copyright (c) 2021 Dongdong Kong. All rights reserved.
 * This work is licensed under the terms of the MIT license.
 * For a copy, see <https://opensource.org/licenses/MIT>.
 */
// var pkg_join   = require('users/kongdd/public:pkg_join.js');
/** 
 * Use this filter to find the nearest LAI and Albedo, and Emissivity data
 * of meteorological forcing data 
 */
var millis_1d = 86400000; // 24*3600*1000, ms
var maxDiff_9d   = ee.Filter.maxDifference({
    difference: 9 * millis_1d,
    leftField : 'system:time_start',
    rightField: 'system:time_start'
});
var maxDiff_1y = ee.Filter.maxDifference({
    leftField : 'year',
    rightField: 'year',
    difference: 4
});

// Specify an equals filter for image timestamps.
var filterTimeEq = ee.Filter.equals({
    leftField : 'system:time_start',
    rightField: 'system:time_start'
});

/** SaveBest: ee.Join.saveBest ImgCol according to filter, the default filter was filterTimeEq */
var SaveBest = function(primary, secondary, filter) {
    filter = filter || filterTimeEq;
    var joinedImgCol = ee.Join.saveBest('matches', 'measure')
        .apply(primary, secondary, filter)
        // .aside(print)
        .map(function(img) { 
            return ee.Image(img).addBands(img.get('matches'))
                .set("matches", null);
                // .copyProperties(img, img.propertyNames().remove('matches'));
        });
    return ee.ImageCollection(joinedImgCol);
};

/** InnerJoin: Join to ImgCol according to filter, the default filter was filterTimeEq */
var InnerJoin = function(primary, secondary, filter, join) {
    filter = filter || filterTimeEq;
    join   = join   || ee.Join.inner();

    // Apply the join.
    var JoinedImgCol_raw = join.apply(primary, secondary, filter);
    // Display the join result: a FeatureCollection.
    // print('Inner join output:', innerJoinedMODIS);

    // Map a function to merge the results in the output FeatureCollection.
    var joinedImgCol = JoinedImgCol_raw.map(function(feature) {
        // return ee.Image.cat(feature.get('primary'), feature.get('secondary'));
        return ee.Image(feature.get('primary')).addBands(feature.get('secondary'));
    });
    return ee.ImageCollection(joinedImgCol);
};


/**
 * Left ImageCollection will apply ImgFun to the right. By default, ImageCollection 
 * is matched by system:time_start.
 * 
 * @param {[type]} primary    [description]
 * @param {[type]} secondary  [description]
 * @param {[type]} ImgFun     Image manipulating function, i.e. `Img_absdiff`, 
 *                            `Img_diff` and etc.
 * @param {[type]} expression For the extension for \code{expression} function
 * @param {[type]} map        For the extension for \code{expression} function
 */
var ImgColFun = function(primary, secondary, ImgFun, expression, map){
    ImgFun = ImgFun || Img_absdiff;
    // Map a function to merge the results in the output FeatureCollection.
    var joinedImgCol = ee.Join.saveBest('matches', 'measure')
        .apply(primary, secondary, filterTimeEq);
        // .aside(print);
    // var img = ee.Image(joinedImgCol.first());
    var res = joinedImgCol.map(function(img) { 
            var right = ee.Image(img.get('matches'));
            var left  = ee.Image(img).set('matches', null);
            var ans   = ImgFun(left, right, expression, map)
                .copyProperties(left, left.propertyNames());
            return ans;
        });
    return ee.ImageCollection(res);
};

/** two images absolute difference */
var Img_absdiff = function(left, right, expression, map){
    return ee.Image(left).subtract(right).abs();
};

/** two images difference */
var Img_diff = function(left, right, expression, map){
    return ee.Image(left).subtract(right);
};

// var Img_expr = function(left, right){
//     return ee.Image(left).expression(expression, map);
// };

/**
 * Resample 8days, 4 days ImageCollections to daily according to Join.saveBest 
 * maxDifference
 *
 * @param {ImageCollection} dailyImg_iters   [description]
 * @param {ImageCollection} ImgCols          [description]
 * @param {integer}         days             maxDiff = days, dedault was 9days
 * @return {ImageCollection}       [description]
  */ 
var resampleToDaily = function(dailyImg_iters, ImgCols, days) {
    days = days || 9;
    var maxDiff   = ee.Filter.maxDifference({
        difference: days * millis_1d,
        leftField : 'system:time_start',
        rightField: 'system:time_start'
    });
  return SaveBest(dailyImg_iters, ImgCols, maxDiff)
      .select([1]); //select the second band, 'matches' maybe can't found
};

var pkg_join = {
    millis_1d      : millis_1d,
    maxDiff_9d     : maxDiff_9d,
    maxDiff_1y     : maxDiff_1y,
    filterTimeEq   : filterTimeEq,
    
    SaveBest       : SaveBest,
    InnerJoin      : InnerJoin,
    ImgColFun      : ImgColFun,
    Img_absdiff    : Img_absdiff,
    Img_diff       : Img_diff,
    resampleToDaily: resampleToDaily
};


pkg_join.join_fs = function (primary, secondary) {
    var filter = ee.Filter.equals({
        leftField: 'system:index',
        rightField: 'system:index'
    });
    var primary = area_waterPerCity;
    var secondary = area_PerCity;
    // var res = pkg_join.InnerJoin(primary, secondary, filter);
    var res = ee.Join.inner().apply(primary, secondary, filter);

    // prob = "sum"
    res = res.map(function (f) {
        var first = ee.Feature(f.get('primary'));
        var second = ee.Feature(f.get('secondary'));
        return f.copyProperties(first).copyProperties(second);
    });
}

function rename_props(x) {
    var props = x.propertyNames();
    var props_new = props.map(function (x) {
        return ee.String("first_").cat(x);
    });
}

exports = pkg_join;

