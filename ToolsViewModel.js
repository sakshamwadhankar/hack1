export default class ToolsViewModel {
  constructor(globe, markers) {
    let self = this;
    let imagePath = "https://unpkg.com/worldwindjs@1.7.0/build/dist/images/pushpins/";
    this.globe = globe;
    this.markers = markers;
    this.markerPalette = [
      imagePath + "castshadow-red.png",
      imagePath + "castshadow-green.png",
      imagePath + "castshadow-blue.png",
      imagePath + "castshadow-orange.png",
      imagePath + "castshadow-teal.png",
      imagePath + "castshadow-purple.png",
      imagePath + "castshadow-white.png",
      imagePath + "castshadow-black.png"
    ];
    this.selectedMarkerImage = ko.observable(this.markerPalette[0]);
    this.dropCallback = null;
    this.dropObject = null;
    this.isDropArmed = ko.observable(false);
    this.isDropArmed.subscribe(armed =>
      $(globe.wwd.canvas).css("cursor", armed ? "crosshair" : "default"));

    let commonAttributes = new WorldWind.PlacemarkAttributes(null);
    commonAttributes.imageScale = 1;
    commonAttributes.imageOffset = new WorldWind.Offset(
      WorldWind.OFFSET_FRACTION, 0.3,
      WorldWind.OFFSET_FRACTION, 0.0);
    commonAttributes.imageColor = WorldWind.Color.WHITE;
    commonAttributes.labelAttributes.offset = new WorldWind.Offset(
      WorldWind.OFFSET_FRACTION, 0.5,
      WorldWind.OFFSET_FRACTION, 1.0);
    commonAttributes.labelAttributes.color = WorldWind.Color.YELLOW;
    commonAttributes.drawLeaderLine = true;
    commonAttributes.leaderLineAttributes.outlineColor = WorldWind.Color.RED;

    this.armDropMarker = function () {
      self.isDropArmed(true);
      self.dropCallback = self.dropMarkerCallback;
      self.dropObject = self.selectedMarkerImage();
    };

    this.dropMarkerCallback = function (position) {
      let attributes = new WorldWind.PlacemarkAttributes(commonAttributes);
      attributes.imageSource = self.selectedMarkerImage();

      let placemark = new WorldWind.Placemark(position, true, attributes);
      placemark.label = "Lat " + position.latitude.toPrecision(4).toString() + "\n" + "Lon " + position.longitude.toPrecision(5).toString();
      placemark.altitudeMode = WorldWind.CLAMP_TO_GROUND;
      placemark.eyeDistanceScalingThreshold = 2500000;

      let layer = self.globe.findLayerByName("Markers");
      layer.addRenderable(placemark);

      self.markers.addMarker(placemark);
    };

    this.handleClick = function (event) {
      if (!self.isDropArmed()) {
        return;
      }
      let type = event.type, x, y;
      switch (type) {
        case 'click':
          x = event.clientX;
          y = event.clientY;
          break;
        case 'touchend':
          if (!event.changedTouches[0]) {
            return;
          }
          x = event.changedTouches[0].clientX;
          y = event.changedTouches[0].clientY;
          break;
      }
      if (self.dropCallback) {
        let pickList = self.globe.wwd.pickTerrain(self.globe.wwd.canvasCoordinates(x, y));
        let terrain = pickList.terrainObject();
        if (terrain) {
          self.dropCallback(terrain.position, self.dropObject);
        }
      }
      self.isDropArmed(false);
      event.stopImmediatePropagation();
    };

    globe.wwd.addEventListener('click', self.handleClick);
    globe.wwd.addEventListener('touchend', self.handleClick);
  }
}