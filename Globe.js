export default class Globe {
  constructor(canvasId, projectionName) {
    this.wwd = new WorldWind.WorldWindow(canvasId);

    this.nextLayerId = 1;

    this.roundGlobe = this.wwd.globe;
    this.flatGlobe = null;
    if (projectionName) {
      this.changeProjection(projectionName);
    }

    this.categoryTimestamps = new Map();
    this.addLayer(new WorldWind.BMNGOneImageLayer(), {category: "background", minActiveAltitude: 0});
  }

  get projectionNames() {
    return[
      "3D",
      "Equirectangular",
      "Mercator",
      "North Polar",
      "South Polar",
      "North UPS",
      "South UPS",
      "North Gnomonic",
      "South Gnomonic"
    ];
  }

  changeProjection(projectionName) {
    if (projectionName === "3D") {
      if (!this.roundGlobe) {
        this.roundGlobe = new WorldWind.Globe(new WorldWind.EarthElevationModel());
      }
      if (this.wwd.globe !== this.roundGlobe) {
        this.wwd.globe = this.roundGlobe;
      }
    } else {
      if (!this.flatGlobe) {
        this.flatGlobe = new WorldWind.Globe2D();
      }
      if (projectionName === "Equirectangular") {
        this.flatGlobe.projection = new WorldWind.ProjectionEquirectangular();
      } else if (projectionName === "Mercator") {
        this.flatGlobe.projection = new WorldWind.ProjectionMercator();
      } else if (projectionName === "North Polar") {
        this.flatGlobe.projection = new WorldWind.ProjectionPolarEquidistant("North");
      } else if (projectionName === "South Polar") {
        this.flatGlobe.projection = new WorldWind.ProjectionPolarEquidistant("South");
      } else if (projectionName === "North UPS") {
        this.flatGlobe.projection = new WorldWind.ProjectionUPS("North");
      } else if (projectionName === "South UPS") {
        this.flatGlobe.projection = new WorldWind.ProjectionUPS("South");
      } else if (projectionName === "North Gnomonic") {
        this.flatGlobe.projection = new WorldWind.ProjectionGnomonic("North");
      } else if (projectionName === "South Gnomonic") {
        this.flatGlobe.projection = new WorldWind.ProjectionGnomonic("South");
      }
      if (this.wwd.globe !== this.flatGlobe) {
        this.wwd.globe = this.flatGlobe;
      }
    }
  }

  getLayers(category) {
    return this.wwd.layers.filter(layer => layer.category === category);
  }

  addLayer(layer, options) {
    if (options) {
      for (let prop in options) {
        if (!options.hasOwnProperty(prop)) {
          continue;
        }
        layer[prop] = options[prop];
      }
    }
    if (typeof layer.category === 'undefined') {
      layer.category = 'overlay';
    }

    layer.uniqueId = this.nextLayerId++;

    let index = this.wwd.layers.findIndex(function (element) {
      return element.category === layer.category;
    });
    if (index < 0) {
      this.wwd.addLayer(layer);
    } else {
      let numLayers = this.getLayers(layer.category).length;
      this.wwd.insertLayer(index + numLayers, layer);
    }
    this.updateCategoryTimestamp(layer.category);
  }

  addLayerFromWms(serviceAddress, layerName, options) {
    const self = this;

    let url = serviceAddress.split('?')[0];
    url += "?service=wms";
    url += "&request=getcapabilities";
    let parseCapabilities = function (xml) {
      var wmsCapabilities = new WorldWind.WmsCapabilities(xml);
      var layerForDisplay = wmsCapabilities.getNamedLayer(layerName);
      var layerConfig = WorldWind.WmsLayer.formLayerConfiguration(layerForDisplay);
      var wmsLayer = new WorldWind.WmsLayer(layerConfig);
      options.bbox = layerConfig.sector;
      self.addLayer(wmsLayer, options);
    };

    let xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        if (xhr.status === 200) {
          parseCapabilities(xhr.responseXML);
        } else {
          alert("XMLHttpRequest to " + url + " failed with status code " + xhr.status);
        }
      }
    };
    xhr.send();
  }

  toggleLayer(layer) {
    if (layer.category === 'base') {
      this.wwd.layers.forEach(function (item) {
        if (item.category === 'base' && item !== layer) {
          item.enabled = false;
        }
      });
    }
    
    layer.enabled = !layer.enabled;
    
    this.wwd.redraw();
    this.updateCategoryTimestamp(layer.category);
  }

  refreshLayer(layer) {
    layer.refresh();
    this.wwd.redraw();
  }

  getCategoryTimestamp(category) {
    if (!this.categoryTimestamps.has(category)) {
      this.categoryTimestamps.set(category, ko.observable());
    }
    return this.categoryTimestamps.get(category);
  }

  updateCategoryTimestamp(category) {
    let timestamp = this.getCategoryTimestamp(category);
    timestamp(new Date());
  }

  findLayerByName(name) {
    let layers = this.wwd.layers.filter(layer => layer.displayName === name);
    return layers.length > 0 ? layers[0] : null;
  }

  zoomToLayer(layer) {
    let layerSector = layer.bbox;
    if (!layerSector) {
      console.error("zoomToLayer: No Layer sector / bounding box undefined!");
      return;
    }
    if (layerSector.maxLatitude >= 90 &&
      layerSector.minLatitude <= -90 &&
      layerSector.maxLongitude >= 180 &&
      layerSector.minLongitude <= -180) {
      console.log("zoomToLayer: The selected layer covers the full globe. No camera centering needed.");
      return;
    }
    let center = findLayerCenter(layerSector);
    let range = computeZoomRange(layerSector);
    let position = new WorldWind.Position(center.latitude, center.longitude, range);
    this.wwd.goTo(position);
    function findLayerCenter(layerSector) {
      var centerLatitude = (layerSector.maxLatitude + layerSector.minLatitude) / 2;
      var centerLongitude = (layerSector.maxLongitude + layerSector.minLongitude) / 2;
      var layerCenter = new WorldWind.Location(centerLatitude, centerLongitude);
      return layerCenter;
    }
    function computeZoomRange(layerSector) {
      var verticalBoundary = layerSector.maxLatitude - layerSector.minLatitude;
      var horizontalBoundary = layerSector.maxLongitude - layerSector.minLongitude;
      var diagonalAngle = Math.sqrt(Math.pow(verticalBoundary, 2) + Math.pow(horizontalBoundary, 2));
      if (diagonalAngle >= 180) {
        return null;
      } else {
        var diagonalArcLength = (diagonalAngle / 360) * (2 * 3.1416 * 6371000);
        return diagonalArcLength;
      }
    }
  }
  static loadLayers(layers, observableArray) {
    observableArray.removeAll();
    layers.reverse().forEach(layer => observableArray.push(layer));
  }
};