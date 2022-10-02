# ISS Tracker

ISS Tracker is a web app for visualizing and tracking the International Space Station (ISS) in 3D. It was built for the NASA Space Apps Challenge 2022.

View it here: https://binaryfunt.github.io/iss-tracker/

![Screenshot of the web app](/images/screenshot.png)

## Acknowledgements

We built this as a fork of [WorldWindEarth/worldwind-web-app](https://github.com/WorldWindEarth/worldwind-web-app), itself built upon the [NASA WorldWind](https://worldwind.arc.nasa.gov/) virtual globe API.

The ISS model was obtained from [NASA 3D Resources](https://nasa3d.arc.nasa.gov/detail/iss-6628) and converted to a WorldWind-compatible format.

Two-line element (TLE) data for the ISS is fetched from https://tle.ivanstanojevic.me/ and plugged in to [tle.js](https://github.com/davidcalhoun/tle.js/), which uses [satellite.js](https://github.com/shashwatak/satellite-js) to propagate the orbit and calculate the realtime location of the ISS.