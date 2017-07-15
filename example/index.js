const choo = require('choo')
const logger = require('choo-log')
const expose = require('choo-expose')
const css = require('sheetify')

css('../node_modules/leaflet/dist/leaflet.css')
css('../node_modules/leaflet.markercluster/dist/MarkerCluster.css')
css('../node_modules/leaflet.markercluster/dist/MarkerCluster.Default.css')
css('./leaflet.css')

const app = choo()

app.use(logger())
app.use(expose())
app.use((state, emitter) => {
  state.coords = [50.850340, 4.351710]
  state.zoom = 13
  state.locations = []
  state.selectedIndex = 0
})

app.route('/', require('./leaflet'))

app.mount('body')
