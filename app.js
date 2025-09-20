import Globe from './Globe.js';
import LayersViewModel from './LayersViewModel.js';
import SettingsViewModel from './SettingsViewModel.js';
import SearchPreviewViewModel from './SearchPreviewViewModel.js';


const TLE_URL = "https://tle.ivanstanojevic.me/api/tle/49044"
const ISS_ALTITUDE = 400e3 // m


$(document).ready(function () {
  "use strict";

  const BING_API_KEY = "";
  if (BING_API_KEY) {
    WorldWind.BingMapsKey = BING_API_KEY;
  } else {
    console.error("app.js: A Bing API key is required to use the Bing maps in production. Get your API key at https://www.bingmapsportal.com/");
  }

  // Ensure WorldWind configuration exists and has a valid baseUrl
  if (!window.WorldWind) {
    console.error("WorldWind library failed to load.");
    return;
  }
  if (!WorldWind.configuration) {
    WorldWind.configuration = {};
  }
  if (!WorldWind.configuration.baseUrl) {
    WorldWind.configuration.baseUrl = "https://unpkg.com/worldwindjs@1.7.0/build/dist/";
  }

  const MAPQUEST_API_KEY = "";


  let globe = new Globe("globe-canvas");

  globe.addLayer(new WorldWind.BMNGLayer(), {
    category: "base"
  });
  globe.addLayer(new WorldWind.BMNGLandsatLayer(), {
    category: "base",
    enabled: false
  });
  // Only register Bing layers when an API key is present to avoid errors
  if (BING_API_KEY) {
    globe.addLayer(new WorldWind.BingAerialLayer(), {
      category: "base",
      enabled: false
    });
    globe.addLayer(new WorldWind.BingAerialWithLabelsLayer(), {
      category: "base",
      enabled: false,
      detailControl: 1.5
    });
    globe.addLayer(new WorldWind.BingRoadsLayer(), {
      category: "overlay",
      enabled: false,
      detailControl: 1.5,
      opacity: 0.80
    });
  }
  globe.addLayerFromWms("https://tiles.maps.eox.at/wms", "osm", {
    category: "base",
    enabled: false
  });
  globe.addLayerFromWms("https://tiles.maps.eox.at/wms", "overlay", {
    category: "overlay",
    displayName: "OpenStreetMap overlay by EOX",
    enabled: false,
    opacity: 0.80
  });
  globe.addLayer(new WorldWind.CoordinatesDisplayLayer(globe.wwd), {
    category: "setting"
  });
  globe.addLayer(new WorldWind.ViewControlsLayer(globe.wwd), {
    category: "setting",
    enabled: false
  });
  globe.addLayer(new WorldWind.CompassLayer(), {
    category: "setting",
    enabled: false
  });
  globe.addLayer(new WorldWind.StarFieldLayer(), {
    category: "setting",
    enabled: true,
    displayName: "Stars"
  });
  globe.addLayer(new WorldWind.AtmosphereLayer(), {
    category: "setting",
    enabled: true,
    time: new Date()
  });

  const orbitLayer = new WorldWind.RenderableLayer("Orbit")
  globe.addLayer(orbitLayer, {
    category: "data",
    enabled: true
  });
  const ISSLayer = new WorldWind.RenderableLayer("ISS");
  globe.addLayer(ISSLayer, {
    category: "data",
    enabled: true
  });

  const orbitShapeAttrs = new WorldWind.ShapeAttributes(null);
  orbitShapeAttrs.interiorColor = new WorldWind.Color(1, 1, 1, 0.2);

  fetch(TLE_URL).then(response => response.json())
  .then((tleData) => {
    console.log(tleData)
    const { line1, line2 } = tleData
    const tleStr = `${line1}\n${line2}`

    tlejs.getGroundTracks({
      tle: tleStr,
      stepMS: 60e3,
      isLngLatFormat: false, 
    }).then(([ previous, current, next ]) => {
      const orbit = new WorldWind.Path(
        [...previous, ...current, ...next].map(([ lat, lon ]) => new WorldWind.Position(lat, lon, ISS_ALTITUDE)),
        orbitShapeAttrs
      )
      orbit.pathType = WorldWind.GREAT_CIRCLE
      orbit.numSubSegments = 100
    
      orbit.altitudeMode = WorldWind.ABSOLUTE
      orbit.extrude = true; // Make it a curtain.
      orbit.useSurfaceShapeFor2D = true; // Use a surface shape in 2D mode.
      
    
      orbitLayer.addRenderable(orbit)
      
      let { lat, lng } = tlejs.getLatLngObj(tleStr)

      var colladaLoader = new WorldWind.ColladaLoader(
        new WorldWind.Position(lat, lng, ISS_ALTITUDE),
        { dirPath: 'images/' }
      )
      
      colladaLoader.load("ISS.dae", function (ISSModel) {
        ISSModel.scale = 2e6;
        ISSLayer.addRenderable(ISSModel)

        globe.wwd.goTo(new WorldWind.Location(lat, lng));

        setInterval(() => {
          let { lat, lng } = tlejs.getLatLngObj(tleStr)
          ISSModel.position = new WorldWind.Position(lat, lng, ISS_ALTITUDE)
          globe.refreshLayer(ISSLayer);
        }, 1e3);
      });

    })
  })
  
  

  let layers = new LayersViewModel(globe);
  let settings = new SettingsViewModel(globe);
  let preview = new SearchPreviewViewModel(globe, MAPQUEST_API_KEY);
  
  ko.applyBindings(layers, document.getElementById('layers'));
  ko.applyBindings(settings, document.getElementById('settings'));
  ko.applyBindings(preview, document.getElementById('preview'));
  

  $('.navbar-collapse a[role="button"]').click(function () {
    $('.navbar-collapse').collapse('hide');
  });
  $('.collapse .close').on('click', function () {
    $(this).closest('.collapse').collapse('hide');
  });
});
