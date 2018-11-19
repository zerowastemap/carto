const Nanocomponent = require('nanocomponent')
const L = require('leaflet')
require('leaflet.markercluster')
require('leaflet.locatecontrol')
require('./lib/leaflet.zoomhome')(L)
const onIdle = require('on-idle')
const html = require('nanohtml')
const compare = require('nanocomponent/compare')

const markersLayer = L.markerClusterGroup()

class Carto extends Nanocomponent {
  constructor (id, state, emit) {
    super(id)

    this.id = id
    this.state = state
    this.emit = emit

    this._coords = [50.850340, 4.351710]
    this._zoom = 15
    this._map = null
    this._scrollWheelZoom = false

    this.items = [] // data items used to create markers and popups
    this.selectedIndex = 0
    this.mapbox = {
      accessToken: '',
      background: 'light'
    }
    this.markers = null

    this._createMap = this._createMap.bind(this)
    this._addMarkers = this._addMarkers.bind(this)
    this._updateMap = this._updateMap.bind(this)
    this._addControlPlaceholders = this._addControlPlaceholders.bind(this)

    this.zoomtoselected = this.zoomtoselected.bind(this)
  }

  zoomtoselected (item = {}) {
    const { _id } = item // get objectid
    if (!_id) return
    const selected = this.markers.find((o) => o.item._id === _id)
    markersLayer.zoomToShowLayer(selected.marker, () => {
      selected.marker.openPopup()
    })
  }

  createElement (props) {
    this._coords = props.coords
    this._zoom = props.zoom

    this.tiles = props.tiles
    this.items = props.items
    this.tilesAttribution = props.tilesAttribution
    this.icons = props.icons
    this.popupTemplate = props.popupTemplate
    this.selectedIndex = props.selectedIndex

    if (!this._map) {
      this._element = html`<div id="map"></div>`
      if (this._hasWindow) {
        this._createMap()
        this._addMarkers()
      }
    } else {
      onIdle(() => {
        this._updateMap()
      })
    }

    return this._element
  }

  update (props) {
    return props.coords[0] !== this._coords[0] ||
      props.coords[1] !== this._coords[1] ||
      compare(this.items, props.items)
  }

  unload () {
    this._map.remove()
    this._element = null
    this._coords = null
    this._map = null
  }

  _addMarkers () {
    markersLayer.clearLayers()
    const items = this.items

    const { background = 'light' } = this.mapbox
    const colorInvert = background === 'light' ? 'dark' : 'light'

    const customOptions = {
      'maxWidth': '240',
      'className': 'custom'
    }

    const defaultIcon = L.divIcon({
      className: 'default-marker-icon',
      html: `
        <svg viewBox="0 0 16 16" class="icon icon--lg icon-${colorInvert} icon-marker">
          <use xlink:href="#icon-marker" />
        </svg>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -36]
    })

    const featuredIcon = L.divIcon({
      className: 'featured-marker-icon',
      html: `
        <svg viewBox="0 0 16 16" class="icon icon--lg icon-${colorInvert} icon-marker">
          <use xlink:href="#icon-marker-star" />
        </svg>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -36]
    })

    const markers = items.map((item) => {
      const { lat, lng } = item.address.location
      const marker = L.marker([lat, lng], { icon: item.featured ? featuredIcon : defaultIcon })
      marker.bindPopup(this._customPopup(item), customOptions)
      markersLayer.addLayer(marker)
      return {
        item,
        marker
      }
    })

    this.markers = markers

    return markers
  }

  load () {
    this._map.invalidateSize()
  }

  _addControlPlaceholders (map) {
    const corners = map._controlCorners
    const l = 'leaflet-'
    const container = map._controlContainer

    const createCorner = (vSide, hSide) => {
      const className = l + vSide + ' ' + l + hSide

      corners[vSide + hSide] = L.DomUtil.create('div', className, container)
    }

    createCorner('verticalcenter', 'left')
    createCorner('verticalcenter', 'right')
  }

  _customPopup (item) {
    const { url, title, cover } = item
    const { streetName, streetNumber, zip, city } = item.address
    const template = `
      <a href=${url} target="_blank" rel="noopener" class="external">
        <div class="cover">
          <div class="image" style="background: url(${cover.src}) center center/cover no-repeat #333"></div>
        </div>
        <div class="title">
          ${title}
          <svg viewBox="0 0 16 16" class="icon icon--sm icon-arrow-north-east">
            <use xlink:href="#icon-arrow-north-east" />
          </svg>
        </div>
        <div class="address">
          ${streetName}, ${streetNumber} ${zip} ${city}
        </div>
      </a>
    `

    return template
  }

  _createMap () {
    const { background = 'light', accessToken } = this.mapbox
    const defaultTiles = `https://api.mapbox.com/styles/v1/mapbox/${background}-v9/tiles/256/{z}/{x}/{y}?access_token=${accessToken}`
    const defaultTilesAttribution = '&copy; <a href="https://www.mapbox.com/map-feedback/">Mapbox</a>'
    const tiles = this.tiles || defaultTiles
    const tilesAttribution = this.tilesAttribution || defaultTilesAttribution
    const mapboxFeedback = '<strong><a href="https://www.mapbox.com/map-feedback/" target="_blank" rel="noopener noreferrer">Improve this map</a></strong>'

    const map = L.map(this._element, {
      center: this._coords,
      zoom: this._zoom,
      zoomControl: false,
      scrollWheelZoom: this._scrollWheelZoom
    })

    const tileLayer = L.tileLayer(tiles, {
      attribution: `
        ${tilesAttribution} &copy;
        <a href="https://www.openstreetmap.org/copyright">
          OpenStreetMap
        </a>
        ${!this.tiles ? mapboxFeedback : ''}
      `,
      minZoom: 0,
      maxZoom: 20,
      ext: 'png'
    })

    tileLayer.addTo(map)

    map.on('zoomhome', (e) => this._updateMap())

    /**
     * Enable/disable scrollWheelZoom
     */

    map.once('focus', () => map.scrollWheelZoom.enable())

    map.on('click', () => {
      if (map.scrollWheelZoom.enabled()) {
        map.scrollWheelZoom.disable()
      } else {
        map.scrollWheelZoom.enable()
      }
    })

    /**
     * Init Leaflet.markercluster
     * @link https://github.com/Leaflet/Leaflet.markercluster
     */

    markersLayer.addTo(map)

    /**
     * How to locate leaflet zoom control in a desired position
     * @link https://stackoverflow.com/questions/33614912/how-to-locate-leaflet-zoom-control-in-a-desired-position
     */

    this._addControlPlaceholders(map) // How to locate leaflet zoom control in a desired position

    L.control.scale({ position: 'verticalcenterright' }).addTo(map)

    // Add locate.control
    L.control.locate({
      position: 'verticalcenterright',
      setView: false,
      icon: 'icon icon-marker',
      iconLoading: 'icon icon-marker icon-marker--loading',
      locateOptions: {
        maxZoom: 10
      }
    }).addTo(map)

    map.on('locationfound', e => {
      const {latitude: lat, longitude: lng} = e
      this.emit('locationfound', {lat, lng})
      map.stopLocate()
    })

    /**
     * Center leaflet popup AND marker to the map
     * @link https://stackoverflow.com/questions/22538473/leaflet-center-popup-and-marker-to-the-map
     */

    map.on('popupopen', e => {
      const { popup } = e
      const index = popup._source._index
      const items = this.items
      const selectedIndex = this.selectedIndex

      if (index !== selectedIndex) {
        this.emit('select', {
          coords: this._coords,
          item: items[index]
        })
      }

      // find the pixel location on the map where the popup anchor is
      const px = map.project(popup._latlng)
      // find the height of the popup container,
      // and divide by 2, subtract from the Y axis of marker location
      px.y -= popup._container.clientHeight / 2
      map.panTo(map.unproject(px), {animate: true}) //
    })

    const zoomHome = new L.Control.ZoomHome({
      zoomHomeText: `
        <svg viewBox="0 0 16 16" class="icon icon--xs icon-home">
          <use xlink:href="#icon-home" />
        </svg>
      `
    })

    zoomHome.addTo(map)

    this._map = map
  }

  _updateMap () {
    const items = this.items
    const selectedIndex = this.selectedIndex
    this._addMarkers()
    this._map.invalidateSize()
    // this._map.setView(this._coords)
    this.zoomtoselected(items[selectedIndex])
  }
}

module.exports = Carto
