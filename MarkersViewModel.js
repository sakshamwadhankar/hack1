export default class MarkersViewModel {
  constructor(globe) {
    let self = this;
    this.globe = globe;
    this.markers = ko.observableArray();

    this.addMarker = function (marker) {
      self.markers.push(marker);
    };

    this.gotoMarker = function (marker) {
      self.globe.wwd.goTo(new WorldWind.Location(marker.position.latitude, marker.position.longitude));
    };

    this.editMarker = function (marker) {
    };

    this.removeMarker = function (marker) {
      let markerLayer = self.globe.findLayerByName("Markers");
      for (let i = 0, max = self.markers().length; i < max; i++) {
        let placemark = markerLayer.renderables[i];
        if (placemark === marker) {
          markerLayer.renderables.splice(i, 1);
          self.markers.remove(marker);
          break;
        }
      }
    };
  }
}