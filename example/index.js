const choo = require('choo')
const css = require('sheetify')

css('./leaflet.css')
css('leaflet.markercluster/dist/MarkerCluster.css')
css('leaflet.markercluster/dist/MarkerCluster.Default.css')

const app = choo()

app.use((state, emitter) => {
  state.coords = [50.850340, 4.351710]
  state.zoom = 13
  state.locations = []
  state.selectedIndex = 0
})

app.route('/', require('./leaflet'))

module.exports = app.mount('body')
