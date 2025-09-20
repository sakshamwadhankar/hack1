import Globe from './Globe.js'

export default class SettingsViewModel {
  constructor(globe) {
    let self = this;

    this.globe = globe;
    this.settingLayers = ko.observableArray(globe.getLayers('setting').reverse());
    this.debugLayers = ko.observableArray(globe.getLayers('debug').reverse());

    this.toggleLayer = function (layer) {
      self.globe.toggleLayer(layer);
    };

    globe.getCategoryTimestamp('setting').subscribe(newValue =>
      Globe.loadLayers(globe.getLayers('setting'), self.settingLayers));
    globe.getCategoryTimestamp('debug').subscribe(newValue =>
      Globe.loadLayers(globe.getLayers('debug'), self.debugLayers));
  }
}