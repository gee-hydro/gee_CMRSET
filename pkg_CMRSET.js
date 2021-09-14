/**
 * All rights reserved.
 * This work is licensed under the terms of the MIT license.
 * For a copy, see <https://opensource.org/licenses/MIT>.
 */
// CMRSET indices
var pkgs = {};

// EVI rescaled
pkgs.rescaled_evi = function (image) {
    // Re-scaled EVI parameter, Equation (8)
    var EVImin = 0;
    var EVImax = 0.90;
    return image.expression(
        'EVIr = (b("EVI") - EVImin) / (EVImax - EVImin)', {
        EVImin: EVImin, EVImax: EVImax,
    }).max(ee.Image(0))
      .min(ee.Image(1));
}

pkgs.PInterception = function (image) {
    // Rainfall interception parameters, Equation (10)
    var KE_max = 0.229;
    return ee.Image(KE_max).multiply(image.select('EVIr')).rename('KE');
}

// the crop coefficent Kc, // Equation (11)
pkgs.Kc = function (image, rmi) {
    rmi = rmi || "RMI";
    var name = rmi == "RMI" ? "Kc" : "Kc2";
    var Kc_max = 0.680;
    var a      = 14.12;
    var b      = 7.991;
    var alpha  = 2.482;
    var beta   = 0.890;
    return image.expression(
        'Kc_max * (1 - exp(-a* b("EVIr")**alpha - b * RMI **beta ))', {
        RMI: image.select(rmi),
        Kc_max: Kc_max,
        a: a, alpha: alpha,
        b: b, beta: beta
    }).rename(name);
}
// Kc with GVMI computed with SWIR2 (Kc2)
pkgs.Kc2 = function (img) { return pkgs.Kc(img, "RMI2") }

// Kc for Kamble (Kc_Kamble)
pkgs.Kc_kamble = function (image) {
    // Table 3. Bretreger et al. (2020)
    return image.expression('Kc_kamble = a + b*NDVI', {
        NDVI: image.select('NDVI'),
        a: -0.086, b: 1.37
    }).max(ee.Image(0));
}

// Kc for Kamble (Kc_Kamble)
pkgs.Kc_irrisat = function (image) {
    // Crop coefficient parameters, Table 3. Bretreger et al. (2020)
    return image.expression('Kc_irrisat = a + b*b("NDVI")', {
        a: -0.1725, b: 1.4571
    }).max(ee.Image(0));
}

/**
 * calculate Actual evapotranspiration (ETa) using Kc with SWIR1
 * @note In ERA (mm/d) negative values indicate evaporation hence multply by -1 Equation (9)
 */
pkgs.ETa_swir1 = function (image, Kc) {
    Kc = Kc || "Kc"
    var name = Kc == "Kc" ? "ETa_swir1" : "ETa_swir2";
    return image.expression(
        'Kc * (PET*(-1)*1000*30.25) + KE * (P*1000)', {
        Kc: image.select(Kc),
        PET: image.select('potential_evaporation'),
        KE: image.select('KE'),
        P: image.select('total_precipitation'),
    }).rename(name);
}
// ETa using Kc with SWIR2 
pkgs.ETa_swir2 = function  (img) { return pkgs.ETa_swir1(img, "Kc2") };

// ETa using Kc with Kamble 
pkgs.ETa_irrisat = function (image) {
    // Actual evapotranspiration
    // In ERA (mm/d) negative values indicate evaporation hence multply by -1
    return image.expression(
        'ETa_irrisat = Kc_irrisat * (PET*(-1)*1000*30.25)', {
        Kc_irrisat: image.select('Kc_irrisat'),
        PET: image.select('potential_evaporation'),
    });
}

// ETa using Kc with Kamble 
pkgs.ETa_kamble = function (image) {
    // Actual evapotranspiration
    // In ERA (mm/d) negative values indicate evaporation hence multply by -1
    return image.expression(
        'ETa_kamble = Kc_Kamble * (PET*(-1)*1000*30.25)', {
        Kc_Kamble: image.select('Kc_kamble'),
        PET: image.select('potential_evaporation'),
    });
}

// Irrest using ETa with SWIR1
pkgs.irrest_swir1 = function (image, ETa) {
    ETa = ETa || "ETa_swir1";
    var name = ETa == "ETa_swir1" ? "irrest_swir1" : "irrest_swir2";
    // Equation (2) in Bretreger et al (2020)
    return image.expression(
        'ETa - (P*1000)', {
        ETa: image.select(ETa),
        P: image.select('total_precipitation')
    }).rename(name)
    .max(ee.Image(0))
}
// Irrest using ETa with SWIR2
pkgs.irrest_swir2 = function (img) { return pkgs.irrest_swir1(img, "ETa_swir2") };

// Irrest using Kamble
pkgs.irrest_kamble = function (image) {
    // Equation (2) in Bretreger et al (2020)
    return image.expression(
        'irrest_kamble = b("ETa_kamble") - (P*1000)', {
        P: image.select('total_precipitation'),
    }).max(ee.Image(0));
}

// Irrest using Irrisat
pkgs.irrest_irrisat = function (image) {
    // Equation (2) in Bretreger et al (2020)
    return image.expression(
        'irrest_irrisat = b("ETa_irrisat") - (P*1000)', {
        P: image.select('total_precipitation'),
    }).max(ee.Image(0));
}

exports = pkgs;
