import { Component, OnInit, ChangeDetectorRef, StaticClassProvider } from '@angular/core';
import * as mapboxgl from 'mapbox-gl';
//import * as MapboxDirections from '@mapbox/mapbox-gl-directions';
//declare let MapboxDirections: any;
import * as MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import { environment } from 'src/environments/environment';
import * as turf from '@turf/turf';
import { cloneDeep } from 'lodash'; 

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit {
  map!: mapboxgl.Map;
  //start = [-122.662323, 45.523751];
  i: number;
  //delay: number;
  numDeltas: number;
  deltaLat!: number;
  deltaLng!: number;
  accessToken: string;
  marker!: mapboxgl.Marker;
  timeouts: ReturnType<typeof setTimeout>[];
  startPoint: number[];
  endPoint: number[];
  currentSpeed: any;
  instructions!: HTMLElement;
  popup!: mapboxgl.Popup;
  animationReferences!: number[];
  recommendationCounter: number;
  currentStepIndex = 0;
  currentStepGeometryIndex = 0;
  prevoiusCoord: number[];

  constructor() {
    this.numDeltas = 100;
    //this.delay = 50; //milliseconds
    this.i = 0;
    this.accessToken = environment.mapbox.accessToken;
    this.timeouts = [];
    this.startPoint = [];
    this.endPoint = [];
    this.animationReferences = [];
    this.recommendationCounter = 0;
    this.prevoiusCoord = [];
  }

  ngOnInit() {
    //mapboxgl as typeof mapboxgl;
    this.map = new mapboxgl.Map({
      accessToken: this.accessToken,
      container: 'map', // container ID
      style: 'mapbox://styles/mapbox/streets-v12', // style URL
      center: [31.233334, 30.033333], // starting position [lng, lat]
      zoom: 12, // starting zoom
    });

    this.map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-left');

    var mapBoxGeocoder1 = new MapboxGeocoder({
      accessToken: this.accessToken,
      mapboxgl: mapboxgl,
      placeholder: 'From: '
    }).on('result', (result) => {
      this.startPoint = result.result.geometry.coordinates;
      if (this.startPoint != undefined && this.startPoint.length != 0 && this.endPoint != undefined && this.endPoint.length != 0) {
        this.getRoute(this.startPoint, this.endPoint);
      }
    });

    this.map.addControl(mapBoxGeocoder1, 'top-left');

    var mapBoxGeocoder2 = new MapboxGeocoder({
      accessToken: this.accessToken,
      mapboxgl: mapboxgl,
      placeholder: 'To: '
    }).on('result', (result) => {
      this.endPoint = result.result.geometry.coordinates;
      if (this.startPoint != undefined && this.startPoint.length != 0 && this.endPoint != undefined && this.endPoint.length != 0) {
        this.getRoute(this.startPoint, this.endPoint);
      }
    });

    this.map.addControl(mapBoxGeocoder2, 'top-left');

    let geolocate = new mapboxgl.GeolocateControl({

      positionOptions: {

        enableHighAccuracy: true

      },

      trackUserLocation: true,

      showUserHeading: true

    });

    geolocate.on('geolocate', (data: any) => {
      console.log(Object.prototype.toString.call(data) + ' ' + data.coords.longitude + ' ' + data.coords.latitude);
      //mapBoxGeocoder1.set
    });

    //this.map.addControl(geolocate, 'top-right');
    this.map.addControl(new mapboxgl.ScaleControl(), "bottom-right");
  }




  // create a function to make a directions request
  async getRoute(start: number[], end: number[]) {
    this.mapClear();

    // make a directions request using driving profile
    const query = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?steps=true&geometries=geojson&annotations=distance,speed,duration&overview=full&continue_straight=false&notifications=none&roundabout_exits=false&access_token=${this.accessToken}`,
      { method: 'GET' })
      .then(response => response.json())
      .then(data => {
        data  = data.routes[0];
        const route = data.geometry.coordinates;
        //const instructions = data.legs[0].steps.map((step: any) => step.maneuver.instruction);
        const speed = data.legs[0].annotation.speed;

        
        this.addRoute(route, 'route', '#3887be');
        const steps = data.legs[0].steps;
        let count = 0;
        steps.forEach((step:any) => {
          count+=step.geometry.coordinates.length
        });
        console.log(count);
        // steps.forEach((step) => {
        //   const coordinates = step.geometry.coordinates;
        //   const stepCoordinates = coordinates.length;
        //   const totalDistance = coordinates.reduce((acc: any, currentValue: any) => acc + currentValue, 0);    
        // });
        this.interpolateCoordinates(steps)
        count = 0;
        steps.forEach((step:any) => {
          count+=step.geometry.coordinates.length
        });
        console.log(count);
        // const mySet1 = new Set();
        // for (let step of steps) {
        //   mySet1.add(step.maneuver.type)
        // }
        // console.log(mySet1)

        let points = data.geometry.coordinates;
        //this.getMatch(points);
        // const distance = data.legs[0].annotation.distance;
        // const duration = data.legs[0].annotation.duration;

        this.settingMarker(points[0]);
        this.map.zoomIn();
        
        // Add Interpolation Points
        //points = this.interpolateCoordinates(points);

        let i = 1;
        var animationReference = requestAnimationFrame(() => {
          // this.animateMarker(i, points, speed, steps)
          this.animateMarker2(steps, speed, i)
        });
        this.animationReferences.push(animationReference);
      });
  }


  recommendationSystem(step: any, averagePreviousSpeed: number, averageCurrentSpeed: number, currentSpeed: number): string {
    const instruction = step.maneuver.instruction;
    // const instructionType = step.maneuver.type;
    // const instructionModifier = step.maneuver.modifier;
    
    if(currentSpeed == 0)
      return 'traffic light';

    if(currentSpeed > 70)
      return 'reaching max speed';

    if (averagePreviousSpeed > averageCurrentSpeed)
      return `Slow speed down ..., ${instruction}`;

    if (averagePreviousSpeed < averageCurrentSpeed)
      return `Speed  up ..., ${instruction}`;

    return instruction;
  }

  animateMarker2(steps: any, speed: any, speedIndex: number) {
    let currentStepIndex = 0;
    let currentPointIndex = 0;

    const moveMarker = () => {
      if (currentStepIndex < steps.length) {
        const stepPoints = steps[currentStepIndex].geometry.coordinates;
        
        this.marker.setLngLat(stepPoints[currentPointIndex]);
        this.map.jumpTo({ center: [stepPoints[currentPointIndex][0], stepPoints[currentPointIndex][1]] });

        currentPointIndex++;

        if (currentPointIndex === stepPoints.length) {
          currentStepIndex++;
          currentPointIndex = 0;
        }

        if (currentStepIndex < steps.length) {
          // const speedLimit = Number.isNaN(steps[currentStepIndex].speed_limit ?? 0) ? 0 : steps[currentStepIndex].speed_limit;
          const durationInHours = steps[currentStepIndex].duration / 3600;
          const distanceInKilometers = steps[currentStepIndex].distance / 1000;
          const averageSpeed = distanceInKilometers / durationInHours;

          const durationInHours_ = (steps[currentStepIndex - 1]?.duration / 3600);
          const distanceInKilometers_ = (steps[currentStepIndex - 1]?.distance / 1000);
          const averagePreviousSpeed = distanceInKilometers_ / durationInHours_;

          // const averageSpeed = this.getApproximatedSpeed(speed[speedIndex - 1] * 3.6);
          // const averagePreviousSpeed = this.getApproximatedSpeed(speed[speedIndex - 2] * 3.6);


          const drivingDir = this.extractArcs(steps[currentStepIndex]?.maneuver.modifier, ['right', 'left']);
          const currSpeed = speedIndex == 150 ? 0 : this.getApproximatedSpeed(averageSpeed);     
          const recommendation = this.recommendationSystem(steps[currentStepIndex], averagePreviousSpeed, averageSpeed, currSpeed);  
          const directionIconClass = this.getIconClass(currSpeed, drivingDir)
          // if (currentPointIndex === 0) {
            this.popup.setHTML(`<div><span class="direction-guide-text">${recommendation}</span> 
              <i class="${directionIconClass}" style='font-size:32px'></i>
              </div> <div class="centered-speed colored-speed">${Number.isNaN(currSpeed)?0:currSpeed} km/h </div>`
              );
              //console.log(`index: ${currentStepIndex}, point index: ${speedIndex}, instruction: ${steps[currentStepIndex].maneuver.instruction}`)
          // }
          speedIndex++;
          const timeoutDuration = this.getTimeout(currSpeed);
          let timeout = setTimeout(moveMarker, timeoutDuration);
          this.timeouts.push(timeout);
        }
      }
    }

    moveMarker();
  }

  private getTimeout(currSpeed: number) {
    if(currSpeed == 0) 
      return 4000 ;
    if(currSpeed>0 && currSpeed<=50)
      return 4000 / currSpeed;
    if(currSpeed>50)
      return 5000 / currSpeed;

    return 4000 / currSpeed; 
  }

  getApproximatedSpeed(speed: number):number {
    if(speed>0&&speed<=10)
      return 8;
    if(speed>10&&speed<=15)
      return 12;
    if(speed>15&&speed<=20)
      return 17;
    if(speed>20&&speed<=25)
      return 23;
    if(speed>25&&speed<=30)
      return 27;
    if(speed>30&&speed<=50)
      return 42;
    if(speed>50&&speed<=70)
      return 64;
    if(speed>70)
      return 80;

    return speed;
  }

  getIconClass(currSpeed: number, drivingDir: string|null) {
    if(currSpeed > 70)
      return 'fas fa-tachometer-alt';
    if(currSpeed == 0) 
      return 'fas fa-traffic-light';
    
    return  `direction-guide-icon fas fa-arrow-${drivingDir}`;
  }

  settingMarker(point: number[]) {
    const lngLatPosition: mapboxgl.LngLatLike = [point[0], point[1]];
    const el = document.createElement('div');
    el.className = 'marker';
    let popupOptions = {
      closeButton: false,
      closeOnClick: false,
      offset: 25,
      focusAfterOpen: false
    }
    this.popup = new mapboxgl.Popup(popupOptions).setText(
      '0 km/h'
    );
    this.marker = new mapboxgl.Marker(el).setLngLat(lngLatPosition).setPopup(this.popup).addTo(this.map);
    this.marker.togglePopup();
  }

  mapClear() {
    //remove marker if exists
    if (this.marker != undefined)
      this.marker.remove();

    //clear timeouts and animation reference arrays
    this.clearAnimations();

    //remove route from map
    if (this.map.getSource('route')) {
      this.map.removeLayer('route');
      this.map.removeSource('route');
    }
  }

  clearAnimations() {
    for (const timeout of this.timeouts) {
      clearTimeout(timeout);
    }

    for (const animationReference of this.animationReferences) {
      cancelAnimationFrame(animationReference);
    }
  }

  // Draw the Map Matching route as a new layer on the map
  addRoute(coords: any, routeID: string, routeColor: string) {
    // If a route is already loaded, remove it
    if (this.map.getSource(routeID)) {
      (this.map.getSource(routeID) as any).setData(coords);
    } else {
      // Add a new layer to the map
      this.map.addLayer({
        id: routeID,
        type: 'line',
        source: {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: coords
            }
          }
        },
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': routeColor,
          'line-width': 8,
          'line-opacity': 0.8
        }
      });
    }
  }

  extractArcs(string: string, targetWords: string[]) {

    if(!string) {
      return null;
    }

    var extractedSubstrings: string = '';
    var count = 0;

    for (const word of targetWords) {
      const wordIndex = string.indexOf(word);
  
      if (wordIndex !== -1) {
        const substring = string.slice(wordIndex, wordIndex + word.length);
        extractedSubstrings = substring;
        count++;
        if (count === 1) {
          break;
        }
      }

      if (count === 1) {
        break;
      }
    }
  
    return extractedSubstrings;
  }

  interpolateCoordinates(steps: any[]) {
    steps.forEach((step) => {
      let addedPointsCount = 0;
      let coordinates = step.geometry.coordinates;
      let coordinatesClone = cloneDeep(coordinates);

      let interpolatedCoordinates = [];
      
      for (let i = 0; i < coordinates.length - 1; i++) {
        let start = coordinates[i];
        let end = coordinates[i + 1];

        let distance = turf.distance(start, end);
        let numInterpolations = Math.floor(distance * 50); // adjust this factor to control the smoothness

        //interpolatedCoordinates.push(start);
        for (let j = 1; j < numInterpolations; j++) {
            let fraction = j / numInterpolations;
            let interpolatedLng = start[0] + (end[0] - start[0]) * fraction;
            let interpolatedLat = start[1] + (end[1] - start[1]) * fraction;
            //interpolatedCoordinates.push([interpolatedLng, interpolatedLat]);
            coordinatesClone.splice(i+addedPointsCount+1,0,[interpolatedLng, interpolatedLat]);
            addedPointsCount++;
        }
        //interpolatedCoordinates.push(end);
      }
      step.geometry.coordinates=coordinatesClone;
    });
  }
}