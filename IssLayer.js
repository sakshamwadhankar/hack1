export default getALayer = () => {
    var placemarkLayer = new WorldWind.RenderableLayer("My Layer name", false);
      
    var placeMarkAttributes = new WorldWind.PlacemarkAttributes(null);
    placeMarkAttributes.imageScale = 1200;
    
    var placemark = new WorldWind.Placemark(new WorldWind.Position(20, 20, 2000000), true, placeMarkAttributes);
    placemarkLayer.addRenderable(placemark);
    return placemarkLayer;
  };