import { Component,OnInit, ChangeDetectorRef } from '@angular/core';
import * as mapboxgl from 'mapbox-gl';

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit{
  map: mapboxgl.Map = new mapboxgl.Map();
  style = 'mapbox://styles/mapbox/streets-v11';

  lat = 26.3398;
  lng = -81.7787;
  constructor() {}

  ngOnInit() {
    mapboxgl as typeof mapboxgl;
    this.map = new mapboxgl.Map({
      accessToken:
        'pk.eyJ1IjoiYWhtZWRtb2hzZW4wOCIsImEiOiJjbGl1MzE5cDEwZW04M2ptOHlvd250cjdoIn0.DxhNH0Z2Qg1ARqOgx9rQqw',
      container: 'map',
      style: this.style,
      zoom: 2,
      center: [this.lng, this.lat],
    });
    // Add map controls
    this.map.addControl(new mapboxgl.NavigationControl());
  }
}
