export default class SearchViewModel {
  constructor(globe, preview, mapQuestApiKey) {
    var self = this;
    this.geocoder = new WorldWind.NominatimGeocoder();
    this.searchText = ko.observable('');
    this.mapQuestApiKey = mapQuestApiKey
    
    this.performSearch = function () {
      if (!self.mapQuestApiKey) {
        console.error("SearchViewModel: A MapQuest API key is required to use the geocoder in production. Get your API key at https://developer.mapquest.com/");
      }
      let queryString = self.searchText();
      if (queryString) {
        if (queryString.match(WorldWind.WWUtil.latLonRegex)) {
          let tokens = queryString.split(",");
          let latitude = parseFloat(tokens[0]);
          let longitude = parseFloat(tokens[1]);
          globe.wwd.goTo(new WorldWind.Location(latitude, longitude));
        } else {
          self.geocoder.lookup(queryString, function (geocoder, results) {
            if (results.length > 0) {
              preview(results);
            }
          }, self.mapQuestApiKey);
        }
      }
    };
  }
}