import Globe from './Globe.js';

export default class SearchPreviewViewModel {
  constructor(primaryGlobe, mapQuestApiKey) {
    var self = this;
    this.showApiWarning = (mapQuestApiKey === null || mapQuestApiKey === "");

    this.previewGlobe = new Globe("preview-canvas", "Mercator");
    let resultsLayer = new WorldWind.RenderableLayer("Results");
    // Use non-Bing base layers to avoid API key issues
    this.previewGlobe.addLayer(new WorldWind.BMNGLayer());
    this.previewGlobe.addLayer(resultsLayer);

    let placemarkAttributes = new WorldWind.PlacemarkAttributes(null);
    const wwBase = (WorldWind.configuration && WorldWind.configuration.baseUrl) ? WorldWind.configuration.baseUrl : "";
    placemarkAttributes.imageSource = wwBase ? (wwBase + "images/pushpins/castshadow-red.png") : "images/ISS.png";
    placemarkAttributes.imageScale = 0.5;
    placemarkAttributes.imageOffset = new WorldWind.Offset(
      WorldWind.OFFSET_FRACTION, 0.3,
      WorldWind.OFFSET_FRACTION, 0.0);

    this.searchResults = ko.observableArray();
    this.selected = ko.observable();

    this.previewResults = function (results) {
      if (results.length === 0) {
        return;
      }
      self.searchResults.removeAll();
      resultsLayer.removeAllRenderables();
      results.map(item => self.searchResults.push(item));
      for (let i = 0, max = results.length; i < max; i++) {
        let item = results[i];
        let placemark = new WorldWind.Placemark(
          new WorldWind.Position(
            parseFloat(item.lat),
            parseFloat(item.lon), 100));
        placemark.altitudeMode = WorldWind.RELATIVE_TO_GROUND;
        placemark.displayName = item.display_name;
        placemark.attributes = placemarkAttributes;
        resultsLayer.addRenderable(placemark);
      }

      self.previewSelection(results[0]);
      $('#previewDialog').modal();
      $('#previewDialog .modal-body-table').scrollTop(0);
    };
    
    this.previewSelection = function (selection) {
      let latitude = parseFloat(selection.lat),
        longitude = parseFloat(selection.lon),
        location = new WorldWind.Location(latitude, longitude);
      self.selected(location);
      self.previewGlobe.wwd.goTo(location);
    };
    
    this.gotoSelected = function () {
      primaryGlobe.wwd.goTo(self.selected());
    };
  }
}
