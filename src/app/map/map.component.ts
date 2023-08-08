import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import * as mapboxgl from 'mapbox-gl';
//import * as MapboxDirections from '@mapbox/mapbox-gl-directions';
//declare let MapboxDirections: any;
import * as MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import { environment } from 'src/environments/environment';
import * as turf from '@turf/turf';

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

    // const bounds: mapboxgl.LngLatBoundsLike = [
    //   [-123.069003, 45.395273],
    //   [-122.303707, 45.612333]
    // ];
    // this.map.setMaxBounds(bounds);

    // this.map.addControl(
    //   new MapboxDirections({
    //   accessToken: mapboxgl.accessToken
    //   }),
    //   'top-left'
    //   );

    //this.getRoute(this.start);



    // this.map.on('style.load', () => {
    //   // Style has finished loading, you can now add the layer

    //   // Add starting point to the map
    //   this.map.addLayer({
    //     id: 'point',
    //     type: 'circle',
    //     source: {
    //       type: 'geojson',
    //       data: {
    //         type: 'FeatureCollection',
    //         features: [
    //           {
    //             type: 'Feature',
    //             properties: {},
    //             geometry: {
    //               type: 'Point',
    //               coordinates: this.start
    //             }
    //           }
    //         ]
    //       }
    //     },
    //     paint: {
    //       'circle-radius': 10,
    //       'circle-color': '#3887be'
    //     }
    //   });
    // });

    // If the style has already finished loading, the 'style.load' event might have been missed.
    // In that case, you can check if the style is already loaded and add the layer immediately.
    // if (this.map.isStyleLoaded()) {
    //   this.map.addLayer({
    //     // Layer configuration...
    //   });
    // }


    // this.map.on('click', (event) => {
    //   const coords = (event.lngLat as mapboxgl.LngLat).toArray();
    //   const end = {
    //     type: 'FeatureCollection',
    //     features: [
    //       {
    //         type: 'Feature',
    //         properties: {},
    //         geometry: {
    //           type: 'Point',
    //           coordinates: coords
    //         }
    //       }
    //     ]
    //   };
    //   if (this.map.getLayer('end')) {
    //     (this.map.getSource('end') as any).setData(end);
    //   } else {
    //     this.map.addLayer({
    //       id: 'end',
    //       type: 'circle',
    //       source: {
    //         type: 'geojson',
    //         data: {
    //           type: 'FeatureCollection',
    //           features: [
    //             {
    //               type: 'Feature',
    //               properties: {},
    //               geometry: {
    //                 type: 'Point',
    //                 coordinates: coords
    //               }
    //             }
    //           ]
    //         }
    //       },
    //       paint: {
    //         'circle-radius': 10,
    //         'circle-color': '#f30'
    //       }
    //     });
    //   }
    //   this.getRoute(coords);
    // });
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
        const mySet1 = new Set();
        for (let step of steps) {
          mySet1.add(step.maneuver.type)
        }
        console.log(mySet1)

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

  
    // get the sidebar and add the instructions
    //this.instructions = document.getElementById('instructions')! || {};
    //this.currentSpeed = document.getElementById('current-speed')! || {};

    //let tripInstructions = '';
    // for (const step of steps) {
    //   tripInstructions += `<li>${step.maneuver.instruction}</li>`;
    //   //this.transition(step.maneuver.location,position)
    // }
    // this.instructions.innerHTML = `<p><strong>Trip duration: ${Math.floor(
    //   data.duration / 60
    // )} min 🚚 </strong></p><ol>${tripInstructions}</ol>`;

    //this.getMatch(points);

    // let speedFactor = 1;
    // for (let i = 1; i < points.length; i++) {
    //   const point = points[i];
    //   speedFactor = this.calculateSpeedFactor(speed[i - 1]);
    //   var timeoutTime = this.delay * i * speedFactor;
    //   var timeout = setTimeout(() => {
    //     this.marker.setLngLat([point[0], point[1]]).addTo(this.map);
    //     //this.currentSpeed.innerHTML = `${Math.floor(speed[i-1] * 3.6)} km/h`;
    //     this.popup.setHTML(`${Math.floor(speed[i - 1] * 3.6)} km/h`);
    //   }, timeoutTime);
    //   this.timeouts.push(timeout);
    // }  
  }


  recommendationSystem(step: any, averagePreviousSpeed: number, averageCurrentSpeed: number, currentSpeed: number): string {
    const instruction = step.maneuver.instruction;
    const instructionType = step.maneuver.type;
    const instructionModifier = step.maneuver.modifier;
    
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

//   animateMarker(currentPointIndex: number, points: number[][], speed: number[], steps: any) {
//     this.instructions = document.getElementById('instructions')! || {};
//     const currentPos = points[currentPointIndex];
//     const pointAhead = points[currentPointIndex + 5];
//     // let timeoutTime = this.calculateDelay(speed[i]);
//     let timeoutTime = 1000 / speed[currentPointIndex] * 3.6
    
//     if(currentPos) {
//       let timeout = setTimeout(() => {
//         const points = steps[this.currentStepIndex]?.geometry.coordinates;
//         const drivingDir = steps[this.currentStepIndex]?.maneuver.modifier;

//           this.marker.setLngLat(points[currentPointIndex]).addTo(this.map);
//           this.map.flyTo({ center: [currentPos[0], currentPos[1]] ,   speed: 0.8 });
//           currentPointIndex++;

//           if (currentPointIndex === points.length) {
//             this.currentStepIndex++;
//             currentPointIndex = 0;
//           }

//           const durationInHours = (steps[this.currentStepIndex]?.duration / 3600) | 0;
//           const distanceInKilometers = (steps[this.currentStepIndex]?.distance / 1000) | 0;
//           const durationInHours_ = (steps[this.currentStepIndex - 1]?.duration / 3600) | 0;
//           const distanceInKilometers_ = (steps[this.currentStepIndex - 1]?.distance / 1000) | 0;

//           const averageCurrentSpeed = (distanceInKilometers / durationInHours) | 0;
//           const averagePreviousSpeed = (distanceInKilometers_ / durationInHours_) | 0;

//           const recommendation = this.recommendationSystem(steps[this.currentStepIndex ], averagePreviousSpeed, averageCurrentSpeed);        

//           // this.popup.setHTML(`</div> <div class="centered-speed colored-speed">${averageCurrentSpeed.toFixed(2)} km/h </div>`);

//           if (this.currentStepIndex < steps.length) {
//             if (currentPointIndex === 0) {
//               const speedLimit = steps[this.currentStepIndex].speed_limit;
//               this.popup.setHTML(`<div><span class="direction-guide-text">${recommendation}</span>  <i class="direction-guide-icon fas fa-arrow-${drivingDir}"></i> </div> <div class="centered-speed colored-speed">${speedLimit.toFixed(2)} km/h </div>`);
//             } 
//           }

// /*
//         this.marker.setLngLat([currentPos[0], currentPos[1]]).addTo(this.map);
//         this.map.flyTo({ center: [currentPos[0], currentPos[1]] ,   speed: 0.8 });
  
//         const drivingDir = steps[this.currentStepIndex].maneuver.modifier;
//         const recommendation = this.recommendationSystem(steps[this.currentStepIndex ], speed[currentPointIndex - 1] * 3.6);        
  
//         if (this.currentStepIndex != 0 && this.currentStepIndex < 30)
//           this.currentStepIndex ++;
//         if (this.currentStepIndex == 5) {
//           this.popup.setHTML(`<div class="centered-speed colored-speed">${Math.floor(speed[currentPointIndex - 1] * 3.6)} km/h </div>`);
//           this.currentStepIndex = 0;
//         }

//         if (this.searchLocation(steps, pointAhead) != -1) {
//           this.popup.setHTML(`<div><span class="direction-guide-text">${recommendation}</span>  <i class="direction-guide-icon fas fa-arrow-${drivingDir}"></i> </div> <div class="centered-speed colored-speed">${Math.floor(speed[currentPointIndex - 1] * 3.6)} km/h </div>`);
//           if (recommendation != '') {
//             this.currentStepIndex = 0;
//             this.currentStepIndex ++;
//           }

//         } else {
//           this.popup.setHTML(`<div class="centered-speed colored-speed">${Math.floor(speed[currentPointIndex - 1] * 3.6)} km/h </div>`);
//         }
// */
//       /*
//       let stepIndex = this.searchLocation(steps, pointAhead);
//       if (stepIndex != -1) {
//         const instruction = steps[stepIndex].maneuver.instruction;
//         const instructionType = steps[stepIndex].maneuver.type;
//         const instructionModifier = steps[stepIndex].maneuver.modifier;
//         const recommendation = this.recommendationSystem(point, pointAhead, instruction, instructionType, instructionModifier, speed[i - 1] * 3.6);
//         this.instructions.innerHTML = recommendation;
//         if (recommendation != '') {
//           this.recommendationCounter=0;
//           this.recommendationCounter++;
//         }
//         console.log(`index: ${stepIndex}, point index: ${i}, instruction: ${steps[stepIndex].maneuver.instruction}`)
//       }
//       */
//       // currentPointIndex++;
//       let animationReference = requestAnimationFrame(() => {
//         this.animateMarker(currentPointIndex, points, speed, steps)
//       });
//       this.animationReferences.push(animationReference);
//     }, timeoutTime);
//     this.timeouts.push(timeout);
//     }
//   }

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
          const speedLimit = Number.isNaN(steps[currentStepIndex].speed_limit ?? 0) ? 0 : steps[currentStepIndex].speed_limit;
          const durationInHours = steps[currentStepIndex].duration / 3600;
          const distanceInKilometers = steps[currentStepIndex].distance / 1000;
          const averageSpeed = Number.isNaN(distanceInKilometers / durationInHours) ? speedLimit : distanceInKilometers / durationInHours;

          const durationInHours_ = (steps[currentStepIndex - 1]?.duration / 3600);
          const distanceInKilometers_ = (steps[currentStepIndex - 1]?.distance / 1000);
          const averagePreviousSpeed = Number.isNaN(distanceInKilometers_ / durationInHours_) ? speedLimit : distanceInKilometers_ / durationInHours_;

          const drivingDir = this.extractArcs(steps[currentStepIndex]?.maneuver.modifier, ['right', 'left']);
          const currSpeed = speedIndex == 100 ? 0 : (speed[speedIndex - 1] * 3.6).toFixed(2);     
          const recommendation = this.recommendationSystem(steps[currentStepIndex ], averagePreviousSpeed, averageSpeed, Number(currSpeed));  
          const directionIconClass = this.getIconClass(Number(currSpeed), drivingDir)
          // if (currentPointIndex === 0) {
            this.popup.setHTML(`<div><span class="direction-guide-text">${recommendation}</span> 
              <i class="${directionIconClass}" style='font-size:32px'></i>
              </div> <div class="centered-speed colored-speed">${currSpeed} km/h </div>`
              );
              //console.log(`index: ${currentStepIndex}, point index: ${speedIndex}, instruction: ${steps[currentStepIndex].maneuver.instruction}`)
          // }
          speedIndex++;
          const timeout = currSpeed == 0 ? 4000 : 1000 / speed[speedIndex - 1] * 3.6 * 0.6;
          setTimeout(moveMarker, timeout);
        }
      }
    }

    moveMarker();
  }

  animateMarker3(coordinates: any, currentPointIndex: number) {
    var lngLat = coordinates[currentPointIndex];

    // set the new position of the marker
    this.marker.setLngLat(lngLat);
    this.map.jumpTo({ center: [lngLat[0], lngLat[1]] });

    // if there are more coordinates, continue animating
    if (currentPointIndex < coordinates.length - 1) {
        var start = coordinates[currentPointIndex];
        var end = coordinates[currentPointIndex + 1];

        var distance = turf.distance(start, end);
        var duration = distance * 1000; // adjust this to change the animation speed

        // move to the next coordinate after the specified duration
        setTimeout(() => {
            this.animateMarker3(coordinates, currentPointIndex + 1);
        }, duration);
    }

  }

  getIconClass(currSpeed: number, drivingDir: string|null) {
    if(currSpeed > 70)
      return 'fas fa-tachometer-alt';
    if(currSpeed == 0) 
      return 'fas fa-traffic-light';
    
    return  `direction-guide-icon fas fa-arrow-${drivingDir}`;
  }

  // searchLocation(steps: any, points: number[]): number {
  //   var locationMatches = false;
  //   for (let i = 0; i < steps.length; i++) {
  //     const step = steps[i];
  //     if(points) {
  //       locationMatches = points.every(point => step.maneuver.location.includes(point));
  //     }
  //     if (locationMatches) {
  //       return i; // Location exists
  //     }
  //   }
  //   return -1; // Location does not exist
  // }

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

  // calculateDelay(speed: number): number {
  //   if (speed * 3.6 >= 60)
  //     return 60;
  //   // if(speed < 70 && speed > 50)
  //   //   return 0.;
  //   if (speed * 3.6 < 60)
  //     return 120;

  //   return 120;
  // }

  // transition(result: number[], position: number[]) {
  //   this.i = 0;
  //   this.deltaLat = (result[0] - position[0]) / this.numDeltas;
  //   this.deltaLng = (result[1] - position[1]) / this.numDeltas;
  //   this.moveMarker(position);
  // }

  // moveMarker(position: number[]) {
  //   position[0] += this.deltaLat;
  //   position[1] += this.deltaLng;
  //   //var latlng = new google.maps.LatLng(position[0], position[1]);
  //   // marker.setTitle("Latitude:" + position[0] + " | Longitude:" + position[1]);
  //   // marker.setPosition(latlng);
  //   const lngLatPosition: mapboxgl.LngLatLike = [position[0], position[1]];
  //   const marker1 = new mapboxgl.Marker().setLngLat(lngLatPosition).addTo(this.map);
  //   if (this.i != this.numDeltas) {
  //     this.i++;
  //     setTimeout(this.moveMarker, this.delay);
  //   }
  // }

  clearAnimations() {
    for (const timeout of this.timeouts) {
      clearTimeout(timeout);
    }

    for (const animationReference of this.animationReferences) {
      cancelAnimationFrame(animationReference);
    }
  }

  // pointInterpolation(points: number[][]) {
  //   for (let i = 0; i < points.length; i++) {
  //     const point1: number[] = points[i];
  //     const point2: number[] = points[i+1];

  //     //Calculate the slope of the line
  //     let m = (point2[1] - point1[1]) / (point2[0] - point1[0])

  //     //
  //     dx = (x2 - x1) / (n + 1)
  //   }
  // }

  // async getMatch(coordinates: number[][]) {
  //   const newCoords = coordinates.join(';');

  //   // Create the query
  //   const query = await fetch(
  //     `https://api.mapbox.com/matching/v5/mapbox/driving/${newCoords}?geometries=geojson&steps=true&access_token=${this.accessToken}`,
  //     { method: 'GET' }
  //   );
  //   // const query = await fetch(`https://api.mapbox.com/matching/v5/mapbox/driving?geometries=geojson&steps=true&access_token=${this.accessToken}`, {
  //   // method: 'POST',
  //   // body: "coordinates="+newCoords,
  //   // headers: {
  //   //   'Content-type': 'application/x-www-form-urlencoded',
  //   // }
  //   // });
  //   const response = await query.json();
  //   // Handle errors
  //   if (response.code !== 'Ok') {
  //     alert(
  //       `${response.code} - ${response.message}.\n\nFor more information: https://docs.mapbox.com/api/navigation/map-matching/#map-matching-api-errors`
  //     );
  //     return;
  //   }
  //   // Get the coordinates from the response
  //   const coords = response.matchings[0].geometry.coordinates;
  //   console.log(coords);
  //   //this.addRoute(coords,'route2','#03AA46');
  //   //this.addRoute(coords,'route','#3887be');
  //   this.addRoute(coords, 'route2', '#03AA46');
  // }

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

  // function to interpolate additional coordinates between start and end points
  interpolateCoordinates(coordinates: string | any[]) {
    let interpolatedCoordinates = [];
    
    for (let i = 0; i < coordinates.length - 1; i++) {
      let start = coordinates[i];
      let end = coordinates[i + 1];

      let distance = turf.distance(start, end);
      let numInterpolations = Math.floor(distance * 10); // adjust this factor to control the smoothness

      for (let j = 0; j <= numInterpolations; j++) {
          let fraction = j / numInterpolations;
          let interpolatedLng = start[0] + (end[0] - start[0]) * fraction;
          let interpolatedLat = start[1] + (end[1] - start[1]) * fraction;
          interpolatedCoordinates.push([interpolatedLng, interpolatedLat]);
      }
    }
    
    return interpolatedCoordinates;
  }
  
}
