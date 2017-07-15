const Leaflet = require('../')
const leaflet = Leaflet()
const html = require('bel')

module.exports = (state, emit) => {
  return html`
    <body>
      ${leaflet.render({
        coords: state.coords,
        zoom: state.zoom,
        items: state.locations,
        selectedIndex: state.selectedIndex,
        tiles: 'http://{s}.tile.osm.org/{z}/{x}/{y}.png',
        mapbox: {},
        tilesAttribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
      })}
    </body>
`
}
