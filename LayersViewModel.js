import Globe from './Globe.js';

export default class LayersViewModel {
  constructor(globe) {
    let self = this;

    this.globe = globe;
    this.baseLayers = ko.observableArray(globe.getLayers('base').reverse());
    this.overlayLayers = ko.observableArray(globe.getLayers('overlay').reverse());

    globe.getCategoryTimestamp('base').subscribe(newValue =>
      Globe.loadLayers(globe.getLayers('base'), self.baseLayers));
    globe.getCategoryTimestamp('overlay').subscribe(newValue =>
      Globe.loadLayers(globe.getLayers('overlay'), self.overlayLayers));

    this.toggleLayer = function (layer) {
      self.globe.toggleLayer(layer);
      if (layer.enabled && layer.bbox) {
        self.globe.zoomToLayer(layer);
      }
    };
  }
}